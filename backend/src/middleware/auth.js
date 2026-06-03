const { verifyAccessToken } = require('../utils/jwt');

// Protect admin/staff routes
const authMiddleware = (roles = []) => (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'ไม่มี Token กรุณาเข้าสู่ระบบ' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;

    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token หมดอายุ' : 'Token ไม่ถูกต้อง';
    return res.status(401).json({ success: false, message: msg });
  }
};

// Verify table token from QR code
const tableTokenMiddleware = async (req, res, next) => {
  const { table, token } = req.query;
  if (!table || !token) {
    return res.status(400).json({ success: false, message: 'ข้อมูลโต๊ะไม่ครบถ้วน' });
  }

  try {
    const { pool } = require('../utils/db');
    const [rows] = await pool.query(
      'SELECT id, table_number, status FROM restaurant_tables WHERE table_number = ? AND token = ? AND is_active = 1',
      [table, token]
    );
    if (!rows.length) {
      return res.status(403).json({ success: false, message: 'QR Code ไม่ถูกต้องหรือหมดอายุ' });
    }
    req.tableData = rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authMiddleware, tableTokenMiddleware };
