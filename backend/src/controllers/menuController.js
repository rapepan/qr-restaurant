const { pool } = require('../utils/db');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// GET /api/menu — สำหรับลูกค้า
const getMenu = async (req, res, next) => {
  try {
    const [categories] = await pool.query(
      'SELECT id, name, name_en, icon FROM categories WHERE is_active = 1 ORDER BY sort_order ASC'
    );
    const [items] = await pool.query(
      `SELECT id, category_id, name, name_en, description, price, image_url, is_recommended
       FROM menu_items WHERE is_available = 1 ORDER BY category_id, sort_order ASC`
    );
    const menu = categories.map((cat) => ({
      ...cat,
      items: items.filter((i) => i.category_id === cat.id),
    }));
    res.json({ success: true, data: menu });
  } catch (err) { next(err); }
};

// GET /api/admin/menu
const getAdminMenu = async (req, res, next) => {
  try {
    const [categories] = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC');
    const [items] = await pool.query('SELECT * FROM menu_items ORDER BY category_id, sort_order ASC');
    const menu = categories.map((cat) => ({
      ...cat,
      items: items.filter((i) => i.category_id === cat.id),
    }));
    res.json({ success: true, data: menu });
  } catch (err) { next(err); }
};

// POST /api/admin/menu
const createMenuItem = async (req, res, next) => {
  try {
    const { category_id, name, name_en, description, price, is_recommended, sort_order } = req.body;
    if (!name || !price || !category_id) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
    }

    let image_url = null, image_public_id = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      image_url = result.url;
      image_public_id = result.public_id;
    }

    const [result] = await pool.query(
      `INSERT INTO menu_items (category_id, name, name_en, description, price, image_url, image_public_id, is_recommended, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id, name, name_en || null, description || null, price,
       image_url, image_public_id, is_recommended ? 1 : 0, sort_order || 0]
    );
    const [rows] = await pool.query('SELECT * FROM menu_items WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0], message: 'เพิ่มเมนูสำเร็จ' });
  } catch (err) { next(err); }
};

// PUT /api/admin/menu/:id
const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_id, name, name_en, description, price, is_available, is_recommended, sort_order } = req.body;

    const [existing] = await pool.query('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'ไม่พบเมนู' });
    const old = existing[0];

    let image_url = old.image_url;
    let image_public_id = old.image_public_id;

    if (req.file) {
      if (image_public_id) await deleteFromCloudinary(image_public_id);
      const result = await uploadToCloudinary(req.file.buffer);
      image_url = result.url;
      image_public_id = result.public_id;
    }

    await pool.query(
      `UPDATE menu_items SET category_id=?, name=?, name_en=?, description=?, price=?,
       image_url=?, image_public_id=?, is_available=?, is_recommended=?, sort_order=? WHERE id=?`,
      [
        category_id ?? old.category_id, name ?? old.name,
        name_en !== undefined ? name_en : old.name_en,
        description !== undefined ? description : old.description,
        price ?? old.price, image_url, image_public_id,
        is_available !== undefined ? (is_available == 'true' || is_available === true ? 1 : 0) : old.is_available,
        is_recommended !== undefined ? (is_recommended == 'true' || is_recommended === true ? 1 : 0) : old.is_recommended,
        sort_order ?? old.sort_order, id,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM menu_items WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0], message: 'แก้ไขเมนูสำเร็จ' });
  } catch (err) { next(err); }
};

// DELETE /api/admin/menu/:id
const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT image_public_id FROM menu_items WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบเมนู' });
    if (rows[0].image_public_id) await deleteFromCloudinary(rows[0].image_public_id);
    await pool.query('DELETE FROM menu_items WHERE id = ?', [id]);
    res.json({ success: true, message: 'ลบเมนูสำเร็จ' });
  } catch (err) { next(err); }
};

// GET /api/admin/categories
const getCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// POST /api/admin/categories
const createCategory = async (req, res, next) => {
  try {
    const { name, name_en, icon, sort_order } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อหมวดหมู่' });
    const [result] = await pool.query(
      'INSERT INTO categories (name, name_en, icon, sort_order) VALUES (?, ?, ?, ?)',
      [name, name_en || null, icon || null, sort_order || 0]
    );
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { getMenu, getAdminMenu, createMenuItem, updateMenuItem, deleteMenuItem, getCategories, createCategory };
