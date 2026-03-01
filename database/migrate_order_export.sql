-- =============================================
-- Migration: Order Management & ExportSlip System
-- Date: 2026-02-15
-- =============================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Drop old empty tables
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS support_messages;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS customer_order_items;
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS order_status_transitions;
DROP TABLE IF EXISTS customer_orders;
DROP TABLE IF EXISTS order_statuses;
DROP VIEW IF EXISTS v_admin_orders;
DROP VIEW IF EXISTS v_user_orders;
DROP VIEW IF EXISTS v_available_transitions;

-- 2. Create orders table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('COD','BANKING') NOT NULL DEFAULT 'COD',
    payment_status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
    status ENUM('pending','confirmed','shipping','delivered','failed','cancelled') NOT NULL DEFAULT 'pending',
    shipping_name VARCHAR(100) NOT NULL,
    shipping_phone VARCHAR(20) NOT NULL,
    shipping_address TEXT NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_orders_user (user_id),
    INDEX idx_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Don hang';

-- 3. Create order_items table
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    variant_id INT NULL,
    product_name VARCHAR(255) NOT NULL,
    variant_sku VARCHAR(100) NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    variant_attributes TEXT NULL,
    INDEX idx_oi_order (order_id),
    CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi tiet don hang';

-- 4. Create export_slips table
CREATE TABLE export_slips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    created_by INT NOT NULL,
    approved_by INT NULL,
    status ENUM('waiting_approval','approved','completed','returned') NOT NULL DEFAULT 'waiting_approval',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_es_order (order_id),
    INDEX idx_es_status (status),
    CONSTRAINT fk_es_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phieu xuat kho';

-- 5. Create export_slip_details table
CREATE TABLE export_slip_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    export_slip_id INT NOT NULL,
    product_id INT NOT NULL,
    variant_id INT NULL,
    quantity INT NOT NULL DEFAULT 1,
    INDEX idx_esd_slip (export_slip_id),
    CONSTRAINT fk_esd_slip FOREIGN KEY (export_slip_id) REFERENCES export_slips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi tiet phieu xuat kho';

SET FOREIGN_KEY_CHECKS = 1;
