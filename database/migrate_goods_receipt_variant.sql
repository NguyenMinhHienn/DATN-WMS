-- Migration: Add product_variant_id to goods_receipt_items
-- Purpose: Enable weighted average cost calculation per variant when completing goods receipts
-- Date: 2026-03-06

-- Add product_variant_id column to goods_receipt_items
ALTER TABLE goods_receipt_items
ADD COLUMN product_variant_id INT UNSIGNED NULL 
COMMENT 'Biến thể sản phẩm - dùng để tính giá vốn bình quân gia quyền (MWA)'
AFTER product_id;

-- Add index for performance
ALTER TABLE goods_receipt_items
ADD INDEX idx_goods_receipt_items_variant_id (product_variant_id);
