ALTER TABLE stock_transfers
  ADD COLUMN subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER total_quantity,
  ADD COLUMN vat_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER subtotal,
  ADD COLUMN vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER vat_percent,
  ADD COLUMN shipping_fee DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER vat_amount;

UPDATE stock_transfers SET subtotal = total_value WHERE subtotal = 0 AND total_value > 0;
