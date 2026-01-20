-- ============================================================
-- FLEXIBLE VARIANT SYSTEM - Migration Script
-- Thiết kế lại hệ thống biến thể theo mô hình Shopee/Lazada
-- 
-- WARNING: Run this AFTER backing up your database!
-- ============================================================

USE wms_db;

-- ============================================================
-- STEP 1: Create new attribute tables
-- ============================================================

-- 1.1 Attributes table (loại thuộc tính: color, size, storage...)
CREATE TABLE IF NOT EXISTS attributes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT 'Tên thuộc tính: color, size, storage',
    display_name VARCHAR(100) NOT NULL COMMENT 'Tên hiển thị: Màu sắc, Kích thước',
    type ENUM('select', 'color', 'text') NOT NULL DEFAULT 'select' COMMENT 'Loại input UI',
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_attributes_name (name),
    INDEX idx_attributes_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Loại thuộc tính biến thể - không phụ thuộc danh mục';

-- 1.2 Attribute values table (giá trị của thuộc tính: Black, White, S, M, L...)
CREATE TABLE IF NOT EXISTS attribute_values (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    attribute_id INT UNSIGNED NOT NULL,
    value VARCHAR(100) NOT NULL COMMENT 'Giá trị lưu DB: black, 64gb, xl',
    display_value VARCHAR(100) NOT NULL COMMENT 'Giá trị hiển thị: Đen, 64GB, XL',
    color_code VARCHAR(7) NULL COMMENT 'Mã màu HEX nếu type=color: #000000',
    image_url VARCHAR(500) NULL COMMENT 'Hình ảnh của giá trị (nếu có)',
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_attribute_value (attribute_id, value),
    INDEX idx_attribute_values_attribute_id (attribute_id),
    INDEX idx_attribute_values_is_active (is_active),
    
    CONSTRAINT fk_attribute_values_attribute FOREIGN KEY (attribute_id) 
        REFERENCES attributes(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Giá trị của thuộc tính biến thể';

-- 1.3 Variant attribute values (liên kết variant với attribute values)
CREATE TABLE IF NOT EXISTS variant_attribute_values (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variant_id INT UNSIGNED NOT NULL,
    attribute_value_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_variant_attribute (variant_id, attribute_value_id),
    INDEX idx_vav_variant_id (variant_id),
    INDEX idx_vav_attribute_value_id (attribute_value_id),
    
    CONSTRAINT fk_vav_variant FOREIGN KEY (variant_id) 
        REFERENCES product_variants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_vav_attribute_value FOREIGN KEY (attribute_value_id) 
        REFERENCES attribute_values(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Liên kết variant với các attribute values';

-- ============================================================
-- STEP 2: Add has_variants column to products
-- ============================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS has_variants TINYINT(1) NOT NULL DEFAULT 0 
COMMENT '0=sản phẩm đơn (1 variant mặc định), 1=có nhiều biến thể'
AFTER image_url;

-- ============================================================
-- STEP 3: Remove category variant_types (no longer needed)
-- ============================================================

-- We keep the column for backward compatibility but it's no longer used
-- ALTER TABLE categories DROP COLUMN variant_types;

-- ============================================================
-- STEP 4: Seed default attributes
-- ============================================================

-- Insert default attributes
INSERT INTO attributes (name, display_name, type, sort_order) VALUES
('color', 'Màu sắc', 'color', 1),
('size', 'Kích thước', 'select', 2),
('storage', 'Dung lượng', 'select', 3),
('ram', 'RAM', 'select', 4),
('material', 'Chất liệu', 'select', 5),
('inch', 'Kích thước màn hình', 'select', 6),
('weight', 'Trọng lượng', 'select', 7),
('capacity', 'Dung tích', 'select', 8)
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- Insert default attribute values for Color
INSERT INTO attribute_values (attribute_id, value, display_value, color_code, sort_order) 
SELECT a.id, v.value, v.display_value, v.color_code, v.sort_order
FROM attributes a
CROSS JOIN (
    SELECT 'black' as value, 'Đen' as display_value, '#000000' as color_code, 1 as sort_order
    UNION SELECT 'white', 'Trắng', '#FFFFFF', 2
    UNION SELECT 'red', 'Đỏ', '#EF4444', 3
    UNION SELECT 'blue', 'Xanh dương', '#3B82F6', 4
    UNION SELECT 'green', 'Xanh lá', '#22C55E', 5
    UNION SELECT 'yellow', 'Vàng', '#EAB308', 6
    UNION SELECT 'pink', 'Hồng', '#EC4899', 7
    UNION SELECT 'purple', 'Tím', '#A855F7', 8
    UNION SELECT 'orange', 'Cam', '#F97316', 9
    UNION SELECT 'gray', 'Xám', '#6B7280', 10
    UNION SELECT 'silver', 'Bạc', '#C0C0C0', 11
    UNION SELECT 'gold', 'Vàng gold', '#FFD700', 12
) v
WHERE a.name = 'color'
ON DUPLICATE KEY UPDATE display_value = VALUES(display_value), color_code = VALUES(color_code);

-- Insert default attribute values for Size
INSERT INTO attribute_values (attribute_id, value, display_value, sort_order) 
SELECT a.id, v.value, v.display_value, v.sort_order
FROM attributes a
CROSS JOIN (
    SELECT 'XS' as value, 'XS' as display_value, 1 as sort_order
    UNION SELECT 'S', 'S', 2
    UNION SELECT 'M', 'M', 3
    UNION SELECT 'L', 'L', 4
    UNION SELECT 'XL', 'XL', 5
    UNION SELECT 'XXL', 'XXL', 6
    UNION SELECT 'XXXL', 'XXXL', 7
    UNION SELECT 'Free Size', 'Free Size', 8
) v
WHERE a.name = 'size'
ON DUPLICATE KEY UPDATE display_value = VALUES(display_value);

-- Insert default attribute values for Storage
INSERT INTO attribute_values (attribute_id, value, display_value, sort_order) 
SELECT a.id, v.value, v.display_value, v.sort_order
FROM attributes a
CROSS JOIN (
    SELECT '16GB' as value, '16GB' as display_value, 1 as sort_order
    UNION SELECT '32GB', '32GB', 2
    UNION SELECT '64GB', '64GB', 3
    UNION SELECT '128GB', '128GB', 4
    UNION SELECT '256GB', '256GB', 5
    UNION SELECT '512GB', '512GB', 6
    UNION SELECT '1TB', '1TB', 7
    UNION SELECT '2TB', '2TB', 8
) v
WHERE a.name = 'storage'
ON DUPLICATE KEY UPDATE display_value = VALUES(display_value);

-- Insert default attribute values for RAM
INSERT INTO attribute_values (attribute_id, value, display_value, sort_order) 
SELECT a.id, v.value, v.display_value, v.sort_order
FROM attributes a
CROSS JOIN (
    SELECT '2GB' as value, '2GB' as display_value, 1 as sort_order
    UNION SELECT '4GB', '4GB', 2
    UNION SELECT '6GB', '6GB', 3
    UNION SELECT '8GB', '8GB', 4
    UNION SELECT '12GB', '12GB', 5
    UNION SELECT '16GB', '16GB', 6
    UNION SELECT '32GB', '32GB', 7
    UNION SELECT '64GB', '64GB', 8
) v
WHERE a.name = 'ram'
ON DUPLICATE KEY UPDATE display_value = VALUES(display_value);

-- Insert default attribute values for Material
INSERT INTO attribute_values (attribute_id, value, display_value, sort_order) 
SELECT a.id, v.value, v.display_value, v.sort_order
FROM attributes a
CROSS JOIN (
    SELECT 'cotton' as value, 'Cotton' as display_value, 1 as sort_order
    UNION SELECT 'polyester', 'Polyester', 2
    UNION SELECT 'leather', 'Da', 3
    UNION SELECT 'plastic', 'Nhựa', 4
    UNION SELECT 'metal', 'Kim loại', 5
    UNION SELECT 'wood', 'Gỗ', 6
    UNION SELECT 'glass', 'Kính', 7
    UNION SELECT 'fabric', 'Vải', 8
) v
WHERE a.name = 'material'
ON DUPLICATE KEY UPDATE display_value = VALUES(display_value);

-- ============================================================
-- STEP 5: Update existing products (set has_variants based on variant count)
-- ============================================================

UPDATE products p
SET has_variants = (
    SELECT IF(COUNT(*) > 1, 1, 0)
    FROM product_variants pv
    WHERE pv.product_id = p.id
);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check attributes created
SELECT '=== ATTRIBUTES ===' as info;
SELECT * FROM attributes;

-- Check attribute values created
SELECT '=== ATTRIBUTE VALUES COUNT ===' as info;
SELECT a.name, a.display_name, COUNT(av.id) as value_count
FROM attributes a
LEFT JOIN attribute_values av ON av.attribute_id = a.id
GROUP BY a.id;

-- Check products with has_variants
SELECT '=== PRODUCTS WITH VARIANTS ===' as info;
SELECT id, name, has_variants, 
       (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) as variant_count
FROM products p
LIMIT 10;
