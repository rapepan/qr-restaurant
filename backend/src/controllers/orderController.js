const { pool } = require('../utils/db');

const generateOrderNumber = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${date}-${rand}`;
};

// POST /api/order - ลูกค้าสั่งอาหารหลังชำระเงินแล้วเท่านั้น
const createOrder = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { table_id, items, note, payment_method, payment_status } = req.body;

    if (!items?.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'กรุณาเลือกเมนูอย่างน้อย 1 รายการ' });
    }

    if (payment_status !== 'paid') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'กรุณาชำระเงินก่อนส่งออเดอร์' });
    }

    const [tableRows] = await conn.query(
      'SELECT id, table_number FROM restaurant_tables WHERE id = ? AND is_active = 1',
      [table_id]
    );
    if (!tableRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'ไม่พบโต๊ะ' });
    }

    const menuIds = items.map((i) => i.menu_item_id);
    const [menuRows] = await conn.query(
      'SELECT id, name, price, is_available FROM menu_items WHERE id IN (?)',
      [menuIds]
    );

    const menuMap = Object.fromEntries(menuRows.map((m) => [m.id, m]));
    let subtotal = 0;
    const orderItems = items.map((item) => {
      const menu = menuMap[item.menu_item_id];
      if (!menu) throw Object.assign(new Error(`ไม่พบเมนู ID: ${item.menu_item_id}`), { status: 400 });
      if (!menu.is_available) throw Object.assign(new Error(`${menu.name} หมดชั่วคราว`), { status: 400 });

      const total_price = parseFloat(menu.price) * item.quantity;
      subtotal += total_price;
      return {
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: menu.price,
        total_price,
        note: item.note || null,
      };
    });

    const tax = 0;
    const total = subtotal;
    const order_number = generateOrderNumber();

    const [orderResult] = await conn.query(
      `INSERT INTO orders (order_number, table_id, note, subtotal, tax, total, payment_method, payment_status, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', NOW())`,
      [order_number, table_id, note || null, subtotal, tax, total, payment_method || 'qr_payment']
    );

    const orderId = orderResult.insertId;

    for (const item of orderItems) {
      await conn.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.menu_item_id, item.quantity, item.unit_price, item.total_price, item.note]
      );
    }

    await conn.query("UPDATE restaurant_tables SET status = 'occupied' WHERE id = ?", [table_id]);
    await conn.commit();

    const [fullOrder] = await conn.query(
      `SELECT o.*, t.table_number FROM orders o JOIN restaurant_tables t ON o.table_id = t.id WHERE o.id = ?`,
      [orderId]
    );
    const [fullItems] = await conn.query(
      `SELECT oi.*, m.name, m.image_url FROM order_items oi JOIN menu_items m ON oi.menu_item_id = m.id WHERE oi.order_id = ?`,
      [orderId]
    );

    const result = { ...fullOrder[0], items: fullItems };
    const io = req.app.get('io');
    io?.to('admin').emit('new_order', result);

    res.status(201).json({ success: true, data: result, message: 'สั่งอาหารสำเร็จ' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

// GET /api/order/:order_number - ลูกค้าดูสถานะออเดอร์
const getOrderByNumber = async (req, res, next) => {
  try {
    const { order_number } = req.params;
    const [rows] = await pool.query(
      `SELECT o.*, t.table_number FROM orders o JOIN restaurant_tables t ON o.table_id = t.id WHERE o.order_number = ?`,
      [order_number]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบออเดอร์' });

    const [items] = await pool.query(
      `SELECT oi.*, m.name, m.image_url FROM order_items oi JOIN menu_items m ON oi.menu_item_id = m.id WHERE oi.order_id = ?`,
      [rows[0].id]
    );
    res.json({ success: true, data: { ...rows[0], items } });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/orders - Admin ดูออเดอร์ทั้งหมด
const getAdminOrders = async (req, res, next) => {
  try {
    const { status, date, table } = req.query;
    let sql = `SELECT o.*, t.table_number FROM orders o JOIN restaurant_tables t ON o.table_id = t.id WHERE 1=1`;
    const params = [];

    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        sql += ' AND o.status = ?';
        params.push(statuses[0]);
      } else {
        sql += ' AND o.status IN (?)';
        params.push(statuses);
      }
    }
    if (date) {
      sql += ' AND DATE(o.created_at) = ?';
      params.push(date);
    }
    if (table) {
      sql += ' AND t.table_number = ?';
      params.push(table);
    }

    sql += ' ORDER BY o.created_at DESC LIMIT 200';

    const [orders] = await pool.query(sql, params);
    const result = await Promise.all(
      orders.map(async (order) => {
        const [items] = await pool.query(
          `SELECT oi.*, m.name FROM order_items oi JOIN menu_items m ON oi.menu_item_id = m.id WHERE oi.order_id = ?`,
          [order.id]
        );
        return { ...order, items };
      })
    );

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/orders/:id/status
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
    }

    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบออเดอร์' });

    await pool.query(
      'UPDATE orders SET status = ?, served_by = ? WHERE id = ?',
      [status, status === 'served' ? req.user.id : null, id]
    );

    const [updated] = await pool.query(
      `SELECT o.*, t.table_number FROM orders o JOIN restaurant_tables t ON o.table_id = t.id WHERE o.id = ?`,
      [id]
    );

    const io = req.app.get('io');
    io?.emit('order_status_updated', { order_id: id, status, order: updated[0] });

    res.json({ success: true, data: updated[0], message: 'อัปเดตสถานะสำเร็จ' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/orders/:id/items/:item_id/status
const updateItemStatus = async (req, res, next) => {
  try {
    const { id, item_id } = req.params;
    const { status } = req.body;

    await pool.query(
      'UPDATE order_items SET status = ? WHERE id = ? AND order_id = ?',
      [status, item_id, id]
    );

    const io = req.app.get('io');
    io?.emit('item_status_updated', { order_id: id, item_id, status });

    res.json({ success: true, message: 'อัปเดตสถานะรายการสำเร็จ' });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/orders/stats - ยอดขายรายวัน
const getStats = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const start = start_date || new Date().toISOString().slice(0, 10);
    const end = end_date || start;

    const [revenue] = await pool.query(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as total_orders,
         SUM(total) as total_revenue,
         AVG(total) as avg_order
       FROM orders
       WHERE DATE(created_at) BETWEEN ? AND ? AND status != 'cancelled'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [start, end]
    );

    const [topItems] = await pool.query(
      `SELECT m.name, SUM(oi.quantity) as qty, SUM(oi.total_price) as revenue
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       JOIN orders o ON oi.order_id = o.id
       WHERE DATE(o.created_at) BETWEEN ? AND ? AND o.status != 'cancelled'
       GROUP BY m.id
       ORDER BY qty DESC
       LIMIT 10`,
      [start, end]
    );

    res.json({ success: true, data: { revenue, topItems } });
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, getOrderByNumber, getAdminOrders, updateOrderStatus, updateItemStatus, getStats };
