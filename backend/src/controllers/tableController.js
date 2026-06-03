const { pool } = require('../utils/db');
const crypto = require('crypto');
const QRCode = require('qrcode');

const generateToken = () => crypto.randomBytes(32).toString('hex');

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
      'SELECT id, table_number, capacity, status, is_active, qr_url, token FROM restaurant_tables ORDER BY table_number ASC'
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
    const baseUrl = process.env.CUSTOMER_URL || 'http://localhost:3000';
    const qr_url = `${baseUrl}/order?table=${table_number}&token=${token}`;

    const qrDataUrl = await QRCode.toDataURL(qr_url, { width: 400, margin: 2 });

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
const regenerateToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM restaurant_tables WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบโต๊ะ' });

    const token = generateToken();
    const baseUrl = process.env.CUSTOMER_URL || 'http://localhost:3000';
    const qr_url = `${baseUrl}/order?table=${rows[0].table_number}&token=${token}`;
    const qrDataUrl = await QRCode.toDataURL(qr_url, { width: 400, margin: 2 });

    await pool.query('UPDATE restaurant_tables SET token = ?, qr_url = ? WHERE id = ?', [token, qr_url, id]);

    res.json({ success: true, data: { qr_url, qr_data_url: qrDataUrl }, message: 'สร้าง QR ใหม่สำเร็จ' });
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
    await pool.query('DELETE FROM restaurant_tables WHERE id = ?', [id]);
    res.json({ success: true, message: 'ลบโต๊ะสำเร็จ' });
  } catch (err) {
    next(err);
  }
};

module.exports = { verifyTable, getTables, createTable, regenerateToken, updateTableStatus, deleteTable };
