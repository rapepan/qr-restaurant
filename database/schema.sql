-- ============================================
-- QR Restaurant System - MariaDB Schema
-- ============================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS qr_restaurant
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE qr_restaurant;

-- ============================================
-- USERS (Admin / Staff)
-- ============================================
CREATE TABLE users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,             -- bcrypt hashed
  full_name   VARCHAR(100) NOT NULL,
  role        ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- TABLES (Restaurant tables)
-- ============================================
CREATE TABLE restaurant_tables (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  table_number VARCHAR(10) NOT NULL UNIQUE,     -- e.g. "1", "A1", "VIP1"
  capacity    TINYINT UNSIGNED NOT NULL DEFAULT 4,
  token       CHAR(64) NOT NULL UNIQUE,          -- random 32-byte hex for QR
  qr_url      VARCHAR(500) NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  status      ENUM('available','occupied','reserved') NOT NULL DEFAULT 'available',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- CATEGORIES (Food categories)
-- ============================================
CREATE TABLE categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  name_en     VARCHAR(100) NULL,
  icon        VARCHAR(10)  NULL,                 -- emoji icon
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- MENU ITEMS
-- ============================================
CREATE TABLE menu_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id     INT UNSIGNED NOT NULL,
  name            VARCHAR(200) NOT NULL,
  name_en         VARCHAR(200) NULL,
  description     TEXT NULL,
  price           DECIMAL(10,2) NOT NULL,
  image_url       VARCHAR(500) NULL,
  image_public_id VARCHAR(200) NULL,            -- Cloudinary public_id
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  is_recommended  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE orders (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number    VARCHAR(20) NOT NULL UNIQUE,   -- e.g. "ORD-20240101-0001"
  table_id        INT UNSIGNED NOT NULL,
  status          ENUM('pending','confirmed','preparing','ready','served','bill_requested','closed','cancelled')
                    NOT NULL DEFAULT 'pending',
  note            TEXT NULL,
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax             DECIMAL(10,2) NOT NULL DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method  ENUM('cash','qr_payment','credit_card') NULL,
  payment_status  ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
  paid_at         DATETIME NULL,
  created_by      INT UNSIGNED NULL,             -- NULL = customer self-order
  served_by       INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id)   REFERENCES restaurant_tables(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (served_by)  REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE order_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        INT UNSIGNED NOT NULL,
  menu_item_id    INT UNSIGNED NOT NULL,
  quantity        TINYINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price      DECIMAL(10,2) NOT NULL,         -- snapshot price at order time
  total_price     DECIMAL(10,2) NOT NULL,
  note            VARCHAR(255) NULL,               -- e.g. "ไม่เผ็ด"
  status          ENUM('pending','preparing','ready','served','cancelled')
                    NOT NULL DEFAULT 'pending',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)     REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- PAYMENT SLIPS
-- ============================================
CREATE TABLE payment_slips (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id            INT UNSIGNED NOT NULL,
  slip_url            VARCHAR(500) NOT NULL,
  slip_public_id      VARCHAR(200) NULL,
  provider            VARCHAR(50) NOT NULL DEFAULT 'easyslip',
  verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  trans_ref           VARCHAR(100) NULL,
  amount              DECIMAL(10,2) NULL,
  raw_response        JSON NULL,
  error_message       VARCHAR(255) NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_payment_slips_trans_ref (trans_ref)
) ENGINE=InnoDB;

-- ============================================
-- CALL STAFF LOG (เรียกพนักงาน)
-- ============================================
CREATE TABLE staff_calls (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  table_id    INT UNSIGNED NOT NULL,
  type        ENUM('call_staff','request_bill') NOT NULL DEFAULT 'call_staff',
  status      ENUM('pending','acknowledged') NOT NULL DEFAULT 'pending',
  acknowledged_by INT UNSIGNED NULL,
  acknowledged_at DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id)         REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  FOREIGN KEY (acknowledged_by)  REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- REFRESH TOKENS
-- ============================================
CREATE TABLE refresh_tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token       VARCHAR(500) NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_menu_items_category   ON menu_items(category_id, is_available, sort_order);
CREATE INDEX idx_orders_table_status   ON orders(table_id, status);
CREATE INDEX idx_orders_created        ON orders(created_at);
CREATE INDEX idx_order_items_order     ON order_items(order_id, status);
CREATE INDEX idx_payment_slips_order   ON payment_slips(order_id, verification_status);
CREATE INDEX idx_staff_calls_table     ON staff_calls(table_id, status);
CREATE INDEX idx_refresh_tokens_user   ON refresh_tokens(user_id);

-- ============================================
-- SEED: Default admin user
-- password = "admin1234" (bcrypt)
-- ============================================
INSERT INTO users (username, password, full_name, role) VALUES
('admin', '$2a$12$ATZpteojQ.s.VaHbVUNPMu4FNqSoG4.EidmvI7urSU4NWQVy5v.7S', 'Admin ระบบ', 'admin');

-- ============================================
-- SEED: Sample categories
-- ============================================
INSERT INTO categories (name, name_en, icon, sort_order) VALUES
('อาหารจานหลัก', 'Main Course', '🍽️', 1),
('อาหารทานเล่น', 'Appetizer', '🍤', 2),
('เครื่องดื่ม', 'Beverages', '🥤', 3),
('ของหวาน', 'Dessert', '🍮', 4),
('อาหารเส้น', 'Noodles', '🍜', 5);

-- ============================================
-- SEED: Sample menu items
-- ============================================
INSERT INTO menu_items (category_id, name, name_en, description, price, is_recommended) VALUES
(1, 'ข้าวผัดกุ้ง', 'Shrimp Fried Rice', 'ข้าวผัดกุ้งสด ไข่ไก่ ผักรวม', 120.00, TRUE),
(1, 'ผัดกะเพราหมูสับ', 'Basil Pork', 'หมูสับผัดกะเพราใบสด ไข่ดาว', 95.00, TRUE),
(1, 'ต้มยำกุ้ง', 'Tom Yum Shrimp', 'ต้มยำกุ้งแม่น้ำ เห็ดฟาง ตะไคร้', 180.00, FALSE),
(2, 'ปอเปี๊ยะทอด', 'Spring Rolls', 'ปอเปี๊ยะไส้หมู-ผัก กรอบนอกนุ่มใน', 70.00, FALSE),
(2, 'ไก่ทอดกระเทียม', 'Garlic Chicken', 'ไก่ทอดกระเทียมพริกไทยดำ', 90.00, TRUE),
(3, 'น้ำเปล่า', 'Water', 'น้ำดื่มบรรจุขวด', 15.00, FALSE),
(3, 'โค้ก', 'Coke', 'โค้ก 325 ml', 30.00, FALSE),
(3, 'ชาไทย', 'Thai Tea', 'ชาไทยเย็นรสชาติเข้มข้น', 45.00, TRUE),
(4, 'ไอศกรีมกะทิ', 'Coconut Ice Cream', 'ไอศกรีมกะทิสด โรยถั่วลิสงคั่ว', 60.00, TRUE),
(5, 'ผัดซีอิ๊วหมู', 'Pork Fried Noodle', 'เส้นใหญ่ผัดซีอิ๊วหมู ไข่ คะน้า', 85.00, FALSE);
