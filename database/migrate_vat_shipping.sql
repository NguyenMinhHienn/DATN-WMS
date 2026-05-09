-- =============================================
-- MIGRATION: VAT & Shipping Fee cho Phiếu Nhập/Xuất
-- Date: 2026-04-14
-- =============================================

-- ==================== 1. GOODS_RECEIPTS ====================
-- Bảng goods_receipts ĐÃ có: subtotal, tax_amount, shipping_cost, total_amount
-- Chỉ cần thêm cột vat_percent để lưu % VAT

ALTER TABLE goods_receipts
  ADD COLUMN vat_percent DECIMAL(5,2) NOT NULL DEFAULT 0.10 
  COMMENT 'Phần trăm VAT (0.10 = 10%)' AFTER subtotal;

-- Cập nhật dữ liệu cũ: tính lại total_amount = subtotal (vì chưa có VAT/ship)
-- Không cần thay đổi gì vì tax_amount và shipping_cost đều đang = 0

-- ==================== 2. EXPORT_RECEIPTS ====================
-- Bảng export_receipts chỉ có total_amount, cần thêm các cột tài chính

ALTER TABLE export_receipts
  ADD COLUMN subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00 
  COMMENT 'Tổng tiền hàng (trước VAT, ship)' AFTER total_quantity;

ALTER TABLE export_receipts
  ADD COLUMN vat_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00
  COMMENT 'Phần trăm VAT (0.10 = 10%)' AFTER subtotal;

ALTER TABLE export_receipts
  ADD COLUMN vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00
  COMMENT 'Tiền VAT = subtotal * vat_percent' AFTER vat_percent;

ALTER TABLE export_receipts
  ADD COLUMN shipping_fee DECIMAL(15,2) NOT NULL DEFAULT 0.00
  COMMENT 'Phí vận chuyển' AFTER vat_amount;

ALTER TABLE export_receipts
  ADD COLUMN delivery_method VARCHAR(20) DEFAULT 'delivery'
  COMMENT 'Phương thức: delivery / pickup' AFTER shipping_fee;

-- Cập nhật dữ liệu cũ: subtotal = total_amount (vì chưa có VAT/ship)
UPDATE export_receipts SET subtotal = total_amount WHERE subtotal = 0 AND total_amount > 0;

-- ==================== DONE ====================
