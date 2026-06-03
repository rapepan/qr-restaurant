const { pool } = require('../utils/db');

// POST /api/table/call
const callStaff = async (req, res, next) => {
  try {
    const { table_id, type } = req.body; // type: 'call_staff' | 'request_bill'

    const [result] = await pool.query(
      'INSERT INTO staff_calls (table_id, type) VALUES (?, ?)',
      [table_id, type || 'call_staff']
    );

    const [rows] = await pool.query(
      `SELECT sc.*, t.table_number FROM staff_calls sc
       JOIN restaurant_tables t ON sc.table_id = t.id
       WHERE sc.id = ?`,
      [result.insertId]
    );

    const io = req.app.get('io');
    io?.to('admin').emit('staff_call', rows[0]);

    const msg = type === 'request_bill' ? 'ส่งคำขอเช็กบิลแล้ว' : 'เรียกพนักงานแล้ว';
    res.status(201).json({ success: true, data: rows[0], message: msg });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/calls
const getCalls = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT sc.*, t.table_number FROM staff_calls sc
       JOIN restaurant_tables t ON sc.table_id = t.id
       WHERE sc.status = 'pending'
       ORDER BY sc.created_at ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/calls/:id/acknowledge
const acknowledgeCall = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE staff_calls SET status = 'acknowledged', acknowledged_by = ?, acknowledged_at = NOW() WHERE id = ?`,
      [req.user.id, id]
    );
    const io = req.app.get('io');
    io?.to('admin').emit('call_acknowledged', { call_id: id });
    res.json({ success: true, message: 'รับทราบแล้ว' });
  } catch (err) {
    next(err);
  }
};

module.exports = { callStaff, getCalls, acknowledgeCall };
