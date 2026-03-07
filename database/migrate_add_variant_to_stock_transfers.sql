-- Migration: Add product_variant_id to stock_transfer_items
-- AND add average_cost to product_variants
-- This enables variant-based inventory tracking with separate cost/selling price

-- ========================================
-- STEP 1: stock_transfer_items changes
-- ========================================

-- Add product_variant_id column (INT UNSIGNED to match product_variants.id)
ALTER TABLE stock_transfer_items
ADD COLUMN product_variant_id INT UNSIGNED NULL AFTER product_id;

-- Add foreign key constraint
ALTER TABLE stock_transfer_items
ADD CONSTRAINT fk_sti_product_variant 
FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) 
ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_sti_product_variant_id ON stock_transfer_items(product_variant_id);

-- ========================================
-- STEP 2: product_variants pricing separation
-- ========================================

-- Add average_cost column (internal cost, separate from selling price)
-- price = selling price (customer-facing, only changed by admin)
-- average_cost = weighted average cost (updated automatically on IMPORT)
ALTER TABLE product_variants
ADD COLUMN average_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00 
COMMENT 'Gia von binh quan (noi bo, tu dong cap nhat khi nhap kho)' AFTER price;

-- Initialize average_cost from current price for existing data
UPDATE product_variants SET average_cost = price WHERE average_cost = 0;
