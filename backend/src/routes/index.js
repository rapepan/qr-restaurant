const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { upload } = require('../utils/cloudinary');

const authCtrl      = require('../controllers/authController');
const menuCtrl      = require('../controllers/menuController');
const orderCtrl     = require('../controllers/orderController');
const paymentCtrl   = require('../controllers/paymentController');
const tableCtrl     = require('../controllers/tableController');
const staffCallCtrl = require('../controllers/staffCallController');

// ─── Public: ลูกค้า ──────────────────────────────────────────
router.get('/menu',                    menuCtrl.getMenu);
router.get('/table/verify',            tableCtrl.verifyTable);
router.post('/order',                  orderCtrl.createOrder);
router.get('/order/:order_number',     orderCtrl.getOrderByNumber);
router.post('/order/:order_number/slip', upload.single('slip'), paymentCtrl.submitSlip);
router.post('/table/call',             staffCallCtrl.callStaff);

// ─── Admin Auth ───────────────────────────────────────────────
router.post('/admin/login',            authCtrl.login);
router.post('/admin/refresh',          authCtrl.refresh);
router.post('/admin/logout',           authCtrl.logout);
router.get('/admin/me',  authMiddleware(), authCtrl.me);

// ─── Admin: Menu ──────────────────────────────────────────────
router.get('/admin/menu',              authMiddleware(), menuCtrl.getAdminMenu);
router.post('/admin/menu',             authMiddleware(['admin']), upload.single('image'), menuCtrl.createMenuItem);
router.put('/admin/menu/:id',          authMiddleware(['admin']), upload.single('image'), menuCtrl.updateMenuItem);
router.delete('/admin/menu/:id',       authMiddleware(['admin']), menuCtrl.deleteMenuItem);
router.get('/admin/categories',        authMiddleware(), menuCtrl.getCategories);
router.post('/admin/categories',       authMiddleware(['admin']), menuCtrl.createCategory);

// ─── Admin: Orders ────────────────────────────────────────────
router.get('/admin/orders',                            authMiddleware(), orderCtrl.getAdminOrders);
router.get('/admin/orders/stats',                      authMiddleware(), orderCtrl.getStats);
router.patch('/admin/orders/:id/status',               authMiddleware(), orderCtrl.updateOrderStatus);
router.patch('/admin/orders/:id/items/:item_id/status',authMiddleware(), orderCtrl.updateItemStatus);

// ─── Admin: Tables ────────────────────────────────────────────
router.get('/admin/tables',                           authMiddleware(), tableCtrl.getTables);
router.post('/admin/tables',                          authMiddleware(['admin']), tableCtrl.createTable);
router.post('/admin/tables/:id/regenerate-token',     authMiddleware(['admin']), tableCtrl.regenerateToken);
router.patch('/admin/tables/:id/status',              authMiddleware(), tableCtrl.updateTableStatus);
router.delete('/admin/tables/:id',                    authMiddleware(['admin']), tableCtrl.deleteTable);

// ─── Admin: Staff Calls ───────────────────────────────────────
router.get('/admin/calls',                   authMiddleware(), staffCallCtrl.getCalls);
router.patch('/admin/calls/:id/acknowledge', authMiddleware(), staffCallCtrl.acknowledgeCall);

module.exports = router;
