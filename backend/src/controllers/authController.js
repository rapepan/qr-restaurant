const bcrypt = require('bcryptjs');
const { pool } = require('../utils/db');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

// POST /api/admin/login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอก Username และ Password' });
    }

    const [rows] = await pool.query(
      'SELECT id, username, password, full_name, role FROM users WHERE username = ? AND is_active = 1',
      [username]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Username หรือ Password ไม่ถูกต้อง' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Username หรือ Password ไม่ถูกต้อง' });
    }

    const payload = { id: user.id, username: user.username, role: user.role, full_name: user.full_name };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store refresh token in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiresAt]
    );

    res.json({
      success: true,
      data: {
        user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/refresh
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'ไม่มี Refresh Token' });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const [rows] = await pool.query(
      'SELECT id FROM refresh_tokens WHERE token = ? AND user_id = ? AND expires_at > NOW()',
      [refreshToken, decoded.id]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Refresh Token ไม่ถูกต้องหรือหมดอายุ' });
    }

    const [userRows] = await pool.query(
      'SELECT id, username, full_name, role FROM users WHERE id = ? AND is_active = 1',
      [decoded.id]
    );
    if (!userRows.length) {
      return res.status(401).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้' });
    }

    const user = userRows[0];
    const newAccessToken = signAccessToken({
      id: user.id, username: user.username, role: user.role, full_name: user.full_name,
    });

    res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch (err) {
    if (err.name?.includes('JsonWebToken') || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Refresh Token ไม่ถูกต้อง' });
    }
    next(err);
  }
};

// POST /api/admin/logout
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
    }
    res.json({ success: true, message: 'ออกจากระบบแล้ว' });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/me
const me = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, full_name, role FROM users WHERE id = ? AND is_active = 1',
      [req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, logout, me };
