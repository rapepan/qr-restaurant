const { pool } = require('../utils/db');
const crypto = require('crypto');
const QRCode = require('qrcode');

const generateToken = () => crypto.randomBytes(32).toString('hex');
const getQrDataUrl = (qrUrl) => QRCode.toDataURL(qrUrl, { width: 400, margin: 2 });

const buildQrUrl = (tableNumber, token) => {
  const baseUrl = process.env.CUSTOMER_URL || 'http://localhost:3000';
  return `${baseUrl}/order?table=${tableNumber}&token=${token}`;
};

// GET /api/table/verify?table=1&token=abc
const verifyTable = async (req, res, next) => {
  try {
    const { table, token } = req.query;
    const [rows] = await pool.query(
      `SELECT id, table_number, capacity, status
       FROM restaurant_tables
       WHERE table_number = ? AND token = ? AND is_active = 1`,
      [table, token]
    );
    if (!rows.length) {
      return res.status(403).json({ success: false, message: 'QR Code ไม่ถูกต้อง' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/tables
const getTables = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, table_number, capacity, status, is_active, qr_url, token FROM restaurant_tables WHERE is_active = 1 ORDER BY table_number ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/tables
const createTable = async (req, res, next) => {
  try {
    const { table_number, capacity } = req.body;
    const token = generateToken();
    const qr_url = buildQrUrl(table_number, token);
    const qrDataUrl = await getQrDataUrl(qr_url);

    const [result] = await pool.query(
      'INSERT INTO restaurant_tables (table_number, capacity, token, qr_url) VALUES (?, ?, ?, ?)',
      [table_number, capacity || 4, token, qr_url]
    );

    const [rows] = await pool.query('SELECT * FROM restaurant_tables WHERE id = ?', [result.insertId]);
    res.status(201).json({
      success: true,
      data: { ...rows[0], qr_data_url: qrDataUrl },
      message: `สร้างโต๊ะ ${table_number} สำเร็จ`,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/tables/:id/regenerate-token
// Printed table QR codes must stay valid, so this returns the existing QR instead of rotating the token.
const regenerateToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM restaurant_tables WHERE id = ? AND is_active = 1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบโต๊ะ' });

    const table = rows[0];
    const qr_url = table.qr_url || buildQrUrl(table.table_number, table.token);
    const qrDataUrl = await getQrDataUrl(qr_url);

    if (!table.qr_url) {
      await pool.query('UPDATE restaurant_tables SET qr_url = ? WHERE id = ?', [qr_url, id]);
    }

    res.json({ success: true, data: { qr_url, qr_data_url: qrDataUrl }, message: 'ดึง QR Code เดิมสำเร็จ' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/tables/:id/status
const updateTableStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE restaurant_tables SET status = ? WHERE id = ?', [status, id]);
    const io = req.app.get('io');
    io?.to('admin').emit('table_status_updated', { table_id: id, status });
    res.json({ success: true, message: 'อัปเดตสถานะโต๊ะสำเร็จ' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/tables/:id
const deleteTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [orders] = await pool.query('SELECT COUNT(*) AS total FROM orders WHERE table_id = ?', [id]);

    if (orders[0].total > 0) {
      await pool.query('UPDATE restaurant_tables SET is_active = 0 WHERE id = ?', [id]);
    } else {
      await pool.query('DELETE FROM restaurant_tables WHERE id = ?', [id]);
    }

    res.json({ success: true, message: 'ลบโต๊ะสำเร็จ' });
  } catch (err) {
    next(err);
  }
};

module.exports = { verifyTable, getTables, createTable, regenerateToken, updateTableStatus, deleteTable };
