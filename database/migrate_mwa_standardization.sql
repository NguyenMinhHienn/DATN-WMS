-- Thêm COGS columns vào export_slip_details
ALTER TABLE export_slip_details
ADD COLUMN unit_cost_snapshot DECIMAL(15,2) DEFAULT 0 AFTER quantity,
ADD COLUMN cost_of_goods_sold DECIMAL(15,2) DEFAULT 0 AFTER unit_cost_snapshot;
