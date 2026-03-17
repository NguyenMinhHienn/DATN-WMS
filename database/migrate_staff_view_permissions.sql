-- ============================================================
-- STAFF VIEW PERMISSIONS - Migration Script
-- Thêm quyền xem tồn kho và cấu hình sản phẩm cho Staff
-- ============================================================

USE wms_db;

-- Update permissions for staff role
-- Lấy permissions hiện tại của staff và thêm các quyền mới
UPDATE roles 
SET permissions = JSON_ARRAY_APPEND(
    JSON_ARRAY_APPEND(permissions, '$', 'view_inventory'),
    '$', 'view_product_config'
)
WHERE name = 'staff' AND JSON_CONTAINS(permissions, '"view_inventory"') = 0;

-- Verification
SELECT name, permissions FROM roles WHERE name IN ('admin', 'staff');

-- Last updated: Tue Mar 17 20:26:32 +07 2026
