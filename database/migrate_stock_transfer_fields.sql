-- =============================================
-- Add accounting fields to stock_transfers
-- =============================================

ALTER TABLE stock_transfers
  ADD COLUMN supplier_id INT UNSIGNED DEFAULT NULL COMMENT 'Nhà cung cấp (cho phiếu nhập)' AFTER transfer_type,
  ADD COLUMN delivery_person VARCHAR(100) DEFAULT NULL COMMENT 'Người giao hàng' AFTER notes,
  ADD COLUMN storekeeper VARCHAR(100) DEFAULT NULL COMMENT 'Thủ kho' AFTER delivery_person,
  ADD COLUMN receiver_name VARCHAR(100) DEFAULT NULL COMMENT 'Người nhận hàng (cho phiếu xuất)' AFTER storekeeper,
  ADD COLUMN receiver_department VARCHAR(100) DEFAULT NULL COMMENT 'Bộ phận nhận (cho phiếu xuất)' AFTER receiver_name;
