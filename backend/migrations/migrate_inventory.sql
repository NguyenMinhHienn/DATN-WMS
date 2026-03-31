-- =============================================
-- Migration: Inventory Management System Overhaul
-- Date: 2026-03-29
-- Description: Add product_variant_id support to inventories,
--              ensure quantity_reserved is properly set up,
--              update inventory_logs for new movement types,
--              and migrate existing data from product_variants.stock
-- =============================================

-- 1. Add product_variant_id to inventories if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventories' AND COLUMN_NAME = 'product_variant_id');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE inventories ADD COLUMN product_variant_id INT(10) UNSIGNED NULL AFTER product_id',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Add FK for product_variant_id (only if column was just added)
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventories' AND CONSTRAINT_NAME = 'fk_inventories_variant');

SET @sql = IF(@fk_exists = 0 AND @col_exists = 0, 
    'ALTER TABLE inventories ADD CONSTRAINT fk_inventories_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE SET NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add index on product_variant_id + warehouse_id
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventories' AND INDEX_NAME = 'idx_inv_variant_warehouse');

SET @sql = IF(@idx_exists = 0, 
    'ALTER TABLE inventories ADD INDEX idx_inv_variant_warehouse (product_variant_id, warehouse_id)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Add product_variant_id to inventory_logs if not exists
SET @col_exists2 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory_logs' AND COLUMN_NAME = 'product_variant_id');

SET @sql = IF(@col_exists2 = 0, 
    'ALTER TABLE inventory_logs ADD COLUMN product_variant_id INT(10) UNSIGNED NULL AFTER product_id',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Data Migration: Create inventory records from product_variants.stock
-- This populates inventories for warehouse_id = 1 (Kho Tổng) for each variant that has stock > 0
-- Only insert if the variant doesn't already have an inventory record
INSERT INTO inventories (product_id, product_variant_id, warehouse_id, quantity_on_hand, quantity_reserved, unit_cost, status, last_movement_date)
SELECT 
    pv.product_id,
    pv.id AS product_variant_id,
    1 AS warehouse_id,
    pv.stock AS quantity_on_hand,
    0 AS quantity_reserved,
    COALESCE(pv.average_cost, p.cost_price, 0) AS unit_cost,
    'available' AS status,
    NOW() AS last_movement_date
FROM product_variants pv
INNER JOIN products p ON pv.product_id = p.id
WHERE pv.stock > 0
AND pv.is_active = 1
AND NOT EXISTS (
    SELECT 1 FROM inventories i 
    WHERE i.product_variant_id = pv.id AND i.warehouse_id = 1
);

SELECT 'Migration completed successfully' AS status;
