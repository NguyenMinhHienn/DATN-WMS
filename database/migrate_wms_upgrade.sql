-- =============================================
-- WMS UPGRADE MIGRATION
-- Nâng cấp phiếu nhập kho + Tạo phiếu xuất kho độc lập
-- =============================================

-- ==================== 1. GOODS RECEIPTS - Bổ sung cột ====================

ALTER TABLE goods_receipts 
  ADD COLUMN delivery_person VARCHAR(100) DEFAULT NULL COMMENT 'Người giao hàng' AFTER notes,
  ADD COLUMN storekeeper VARCHAR(100) DEFAULT NULL COMMENT 'Thủ kho' AFTER delivery_person,
  ADD COLUMN reference_document VARCHAR(200) DEFAULT NULL COMMENT 'Số chứng từ kèm theo' AFTER storekeeper;

-- ==================== 2. GOODS RECEIPT ITEMS - Bổ sung cột ====================

ALTER TABLE goods_receipt_items
  ADD COLUMN quantity_document INT DEFAULT 0 COMMENT 'Số lượng theo chứng từ' AFTER quantity_received,
  ADD COLUMN quantity_actual INT DEFAULT 0 COMMENT 'Số lượng thực nhập' AFTER quantity_document;

-- ==================== 3. Migrate status goods_receipts ====================

UPDATE goods_receipts SET status = 'PENDING' WHERE status IN ('draft', 'pending');
UPDATE goods_receipts SET status = 'APPROVED' WHERE status = 'completed';
UPDATE goods_receipts SET status = 'CANCELLED' WHERE status = 'cancelled';

ALTER TABLE goods_receipts MODIFY COLUMN status 
  ENUM('PENDING','APPROVED','CANCELLED') DEFAULT 'PENDING';

-- ==================== 4. EXPORT RECEIPTS - Phiếu xuất kho độc lập ====================

CREATE TABLE IF NOT EXISTS export_receipts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  receipt_date DATE NOT NULL,
  receiver_name VARCHAR(100) DEFAULT NULL COMMENT 'Người nhận hàng',
  receiver_department VARCHAR(100) DEFAULT NULL COMMENT 'Bộ phận nhận',
  export_reason ENUM('sale','internal','disposal','transfer') DEFAULT 'sale' COMMENT 'Lý do xuất',
  warehouse_id INT UNSIGNED NOT NULL,
  notes TEXT,
  reference_document VARCHAR(200) DEFAULT NULL COMMENT 'Số chứng từ kèm theo',
  delivery_person VARCHAR(100) DEFAULT NULL COMMENT 'Người giao hàng',
  storekeeper VARCHAR(100) DEFAULT NULL COMMENT 'Thủ kho',
  total_items INT UNSIGNED DEFAULT 0,
  total_quantity INT DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  created_by INT UNSIGNED DEFAULT NULL,
  approved_by INT UNSIGNED DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  status ENUM('PENDING','APPROVED','CANCELLED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== 5. EXPORT RECEIPT ITEMS ====================

CREATE TABLE IF NOT EXISTS export_receipt_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  export_receipt_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  product_variant_id INT UNSIGNED DEFAULT NULL,
  quantity_requested INT DEFAULT 0 COMMENT 'Số lượng yêu cầu',
  quantity_actual INT DEFAULT 0 COMMENT 'Số lượng thực xuất',
  unit_price DECIMAL(15,2) DEFAULT 0 COMMENT 'Đơn giá',
  line_total DECIMAL(15,2) DEFAULT 0 COMMENT 'Thành tiền',
  notes TEXT,
  FOREIGN KEY (export_receipt_id) REFERENCES export_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== DONE ====================
