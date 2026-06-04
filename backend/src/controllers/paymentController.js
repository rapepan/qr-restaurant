const { pool } = require('../utils/db');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { verifySlipWithEasySlip, isSlipAccepted } = require('../utils/slipVerifier');

const getFullOrder = async (connOrPool, orderId) => {
  const [orders] = await connOrPool.query(
    `SELECT o.*, t.table_number FROM orders o JOIN restaurant_tables t ON o.table_id = t.id WHERE o.id = ?`,
    [orderId]
  );
  const [items] = await connOrPool.query(
    `SELECT oi.*, m.name, m.image_url FROM order_items oi JOIN menu_items m ON oi.menu_item_id = m.id WHERE oi.order_id = ?`,
    [orderId]
  );
  return { ...orders[0], items };
};

// POST /api/order/:order_number/slip
const submitSlip = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาอัปโหลดสลิป' });
    }

    const { order_number } = req.params;
    const [orders] = await pool.query('SELECT * FROM orders WHERE order_number = ?', [order_number]);
    if (!orders.length) return res.status(404).json({ success: false, message: 'ไม่พบออเดอร์' });

    const order = orders[0];
    if (order.payment_status === 'paid') {
      return res.status(400).json({ success: false, message: 'ออเดอร์นี้ชำระเงินแล้ว' });
    }

    const slipUpload = await uploadToCloudinary(req.file.buffer, 'qr-restaurant/slips');
    let verification;
    let status = 'rejected';
    let errorMessage = null;

    try {
      verification = await verifySlipWithEasySlip({
        slipUrl: slipUpload.url,
        amount: order.total,
        remark: order.order_number,
      });
      status = isSlipAccepted(verification) ? 'verified' : 'rejected';
      if (status !== 'verified') {
        errorMessage = verification?.isDuplicate ? 'สลิปนี้ถูกใช้ไปแล้ว' : 'ยอดเงินในสลิปไม่ตรงกับออเดอร์';
      }
    } catch (err) {
      errorMessage = err.message || 'ตรวจสอบสลิปไม่ผ่าน';
      verification = err.raw || null;
    }

    const rawSlip = verification?.rawSlip || {};
    const transRef = rawSlip.transRef || null;
    const slipAmount = rawSlip.amount?.amount || verification?.amountInSlip || null;

    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO payment_slips
       (order_id, slip_url, slip_public_id, provider, verification_status, trans_ref, amount, raw_response, error_message)
       VALUES (?, ?, ?, 'easyslip', ?, ?, ?, ?, ?)`,
      [
        order.id,
        slipUpload.url,
        slipUpload.public_id,
        status,
        transRef,
        slipAmount,
        JSON.stringify(verification || {}),
        errorMessage,
      ]
    );

    if (status !== 'verified') {
      await conn.commit();
      return res.status(400).json({ success: false, message: errorMessage || 'ตรวจสอบสลิปไม่ผ่าน' });
    }

    await conn.query(
      "UPDATE orders SET payment_status = 'paid', paid_at = NOW(), payment_method = 'qr_payment' WHERE id = ?",
      [order.id]
    );
    await conn.query("UPDATE restaurant_tables SET status = 'occupied' WHERE id = ?", [order.table_id]);
    await conn.commit();

    const fullOrder = await getFullOrder(pool, order.id);
    const io = req.app.get('io');
    io?.to('admin').emit('new_order', fullOrder);
    io?.emit('order_status_updated', { order_id: order.id, status: fullOrder.status, order: fullOrder });

    res.json({ success: true, data: fullOrder, message: 'ตรวจสอบสลิปและส่งออเดอร์เข้าครัวสำเร็จ' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

module.exports = { submitSlip };
