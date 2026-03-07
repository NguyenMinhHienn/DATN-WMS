-- Migration: Add product_variant_id to stock_transfer_items
-- Purpose: Enable variant-aware stock management and MWA cost calculation
-- Date: 2026-03-06

-- Add product_variant_id column
ALTER TABLE stock_transfer_items
ADD COLUMN product_variant_id INT UNSIGNED NULL 
COMMENT 'Biến thể sản phẩm - dùng để tính giá vốn bình quân gia quyền (MWA)'
AFTER product_id;

-- Add cost_of_goods_sold column for EXPORT tracking
ALTER TABLE stock_transfer_items
ADD COLUMN cost_of_goods_sold DECIMAL(15,2) NULL DEFAULT NULL
COMMENT 'Giá vốn hàng bán tại thời điểm xuất kho'
AFTER line_total;

-- Add indexes
ALTER TABLE stock_transfer_items
ADD INDEX idx_stock_transfer_items_variant_id (product_variant_id);

-- Add average_cost column to product_variants if not exists
ALTER TABLE product_variants
ADD COLUMN average_cost DECIMAL(15,2) NOT NULL DEFAULT 0
COMMENT 'Giá vốn bình quân gia quyền (MWA)'
AFTER stock;
