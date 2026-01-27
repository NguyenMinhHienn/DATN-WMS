-- ============================================================
-- PRODUCT SPECIFICATIONS - Migration Script
-- Thông số kỹ thuật sản phẩm (khác với biến thể)
-- ============================================================

USE wms_db;

-- ============================================================
-- STEP 1: Create product_specifications table
-- ============================================================

CREATE TABLE IF NOT EXISTS product_specifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL COMMENT 'FK to products',
    spec_name VARCHAR(100) NOT NULL COMMENT 'Tên thông số: Màn hình, Chip, Pin, Trọng lượng...',
    spec_value VARCHAR(500) NOT NULL COMMENT 'Giá trị: 6.7 inch AMOLED, Snapdragon 8 Gen 3...',
    sort_order INT NOT NULL DEFAULT 0 COMMENT 'Thứ tự hiển thị',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_specs_product_id (product_id),
    INDEX idx_specs_sort_order (sort_order),
    
    CONSTRAINT fk_specs_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Thông số kỹ thuật sản phẩm - KHÔNG phải biến thể';

-- ============================================================
-- STEP 2: Insert sample specifications for existing products
-- ============================================================

-- Example: Add specs for a laptop product (if exists)
-- INSERT INTO product_specifications (product_id, spec_name, spec_value, sort_order)
-- SELECT id, 'Màn hình', '15.6 inch Full HD IPS', 1 FROM products WHERE name LIKE '%Laptop%' LIMIT 1;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT '=== PRODUCT_SPECIFICATIONS TABLE CREATED ===' as info;
DESCRIBE product_specifications;
