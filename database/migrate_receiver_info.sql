-- =============================================
-- ADD RECEIVER ADDRESS & PHONE TO EXPORT TABLES
-- =============================================

-- 1. export_receipts (Admin export)
ALTER TABLE export_receipts
  ADD COLUMN receiver_address VARCHAR(255) DEFAULT NULL COMMENT 'Địa chỉ người nhận' AFTER receiver_department,
  ADD COLUMN receiver_phone VARCHAR(20) DEFAULT NULL COMMENT 'SĐT người nhận' AFTER receiver_address;

-- 2. stock_transfers (Staff export)
ALTER TABLE stock_transfers
  ADD COLUMN receiver_address VARCHAR(255) DEFAULT NULL COMMENT 'Địa chỉ người nhận' AFTER receiver_department,
  ADD COLUMN receiver_phone VARCHAR(20) DEFAULT NULL COMMENT 'SĐT người nhận' AFTER receiver_address;

-- DONE
