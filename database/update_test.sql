UPDATE stock_transfers 
SET vat_percent = 0.10, vat_amount = 240000.00, shipping_fee = 50000.00, total_value = 2690000.00 
WHERE transfer_number = 'TR-2026-000046';
