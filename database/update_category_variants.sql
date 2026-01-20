-- Chọn database
USE wms_db;

-- ============================================================
-- Tạo bảng product_variants (nếu chưa tồn tại)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variants (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    
    -- Variant attributes
    color VARCHAR(50) NULL COMMENT 'Màu sắc: red, blue, black...',
    size VARCHAR(50) NULL COMMENT 'Kích thước: S, M, L, XL, XXL',
    storage VARCHAR(50) NULL COMMENT 'Dung lượng: 64GB, 128GB, 256GB...',
    ram VARCHAR(50) NULL COMMENT 'RAM: 4GB, 8GB, 16GB...',
    material VARCHAR(50) NULL COMMENT 'Chất liệu: Gỗ, Nhựa, Kim loại...',
    capacity VARCHAR(50) NULL COMMENT 'Công suất pin: 5000mAh...',
    
    -- Pricing & Stock
    sku VARCHAR(100) NOT NULL UNIQUE COMMENT 'SKU riêng cho variant',
    price DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Giá bán của variant',
    stock INT NOT NULL DEFAULT 0 COMMENT 'Tồn kho của variant',
    
    -- Media
    image_url VARCHAR(500) NULL COMMENT 'Hình ảnh riêng cho variant',
    
    -- Status
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_variants_product_id (product_id),
    INDEX idx_variants_color (color),
    INDEX idx_variants_size (size),
    INDEX idx_variants_sku (sku),
    INDEX idx_variants_is_active (is_active),
    
    -- Foreign key
    CONSTRAINT fk_variants_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Product variants - Mỗi variant là một đơn vị bán hàng độc lập';

-- ============================================================
-- Update variant_types cho từng category
-- ============================================================
UPDATE categories SET variant_types = '["color", "storage", "ram"]' WHERE id = 1;
UPDATE categories SET variant_types = '["color", "size"]' WHERE id = 2;
UPDATE categories SET variant_types = '["color", "material"]' WHERE id = 3;
UPDATE categories SET variant_types = NULL WHERE id = 4;
UPDATE categories SET variant_types = '["color"]' WHERE id = 5;

-- Verify
SELECT id, name, variant_types FROM categories;
