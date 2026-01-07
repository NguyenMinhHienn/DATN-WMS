-- ============================================================
-- STOCKFLOW - WAREHOUSE MANAGEMENT SYSTEM DATABASE SCHEMA
-- Version: 2.0.0
-- MySQL 8.0+ | InnoDB | UTF8MB4
-- Created: 2026-01-07
-- ============================================================
-- Đợt 1: Core functionality (Bắt buộc)
-- Đợt 2: Extended features (Mở rộng)
-- ============================================================

-- Drop database if exists and create new
DROP DATABASE IF EXISTS wms_db;
CREATE DATABASE wms_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE wms_db;

-- ============================================================
-- SECTION 1: USER MANAGEMENT & ACCESS CONTROL (ĐỢT 1)
-- ============================================================

-- 1.1 Roles table
CREATE TABLE roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT 'Role name: admin, staff, user',
    description VARCHAR(255) NULL COMMENT 'Role description',
    permissions JSON NULL COMMENT 'JSON array of permission strings',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_roles_name (name),
    INDEX idx_roles_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System roles for access control';

-- 1.2 Users table
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT 'Login username',
    email VARCHAR(100) NOT NULL UNIQUE COMMENT 'User email address',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    full_name VARCHAR(100) NOT NULL COMMENT 'Full name of user',
    phone VARCHAR(20) NULL COMMENT 'Phone number',
    avatar_url VARCHAR(500) NULL COMMENT 'Profile picture URL',
    
    -- Address fields (Đợt 2 - Profile)
    address VARCHAR(500) NULL COMMENT 'Street address',
    ward VARCHAR(100) NULL COMMENT 'Phường/Xã',
    district VARCHAR(100) NULL COMMENT 'Quận/Huyện',
    city VARCHAR(100) NULL COMMENT 'Tỉnh/Thành phố',
    
    status ENUM('active', 'inactive', 'suspended', 'pending') NOT NULL DEFAULT 'pending' COMMENT 'Account status',
    email_verified_at TIMESTAMP NULL COMMENT 'Email verification timestamp',
    last_login_at TIMESTAMP NULL COMMENT 'Last successful login',
    last_login_ip VARCHAR(45) NULL COMMENT 'Last login IP address (IPv6 compatible)',
    failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL COMMENT 'Account lock expiry time',
    password_changed_at TIMESTAMP NULL COMMENT 'Last password change',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL COMMENT 'Soft delete timestamp',
    
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_status (status),
    INDEX idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System users';

-- 1.3 User-Role mapping (many-to-many)
CREATE TABLE user_roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    role_id INT UNSIGNED NOT NULL,
    assigned_by INT UNSIGNED NULL COMMENT 'User who assigned this role',
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL COMMENT 'Role expiration date (optional)',
    
    UNIQUE KEY uk_user_role (user_id, role_id),
    INDEX idx_user_roles_user_id (user_id),
    INDEX idx_user_roles_role_id (role_id),
    
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) 
        REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User to role assignments';

-- 1.4 User sessions (for token-based auth)
CREATE TABLE user_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE COMMENT 'Hashed session token',
    device_info VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_sessions_user_id (user_id),
    INDEX idx_user_sessions_token_hash (token_hash),
    INDEX idx_user_sessions_expires_at (expires_at),
    
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User session tokens for authentication';

-- 1.5 Activity logs for audit trail (ĐỢT 2)
CREATE TABLE activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL COMMENT 'User who performed the action (NULL for system)',
    action VARCHAR(100) NOT NULL COMMENT 'Action type: login, logout, create, update, delete',
    entity_type VARCHAR(50) NULL COMMENT 'Entity type affected: user, product, inventory',
    entity_id INT UNSIGNED NULL COMMENT 'ID of the affected entity',
    old_values JSON NULL COMMENT 'Previous values before change',
    new_values JSON NULL COMMENT 'New values after change',
    ip_address VARCHAR(45) NULL COMMENT 'Client IP address',
    user_agent VARCHAR(500) NULL COMMENT 'Browser/client user agent',
    description TEXT NULL COMMENT 'Human readable description',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_activity_logs_user_id (user_id),
    INDEX idx_activity_logs_action (action),
    INDEX idx_activity_logs_entity (entity_type, entity_id),
    INDEX idx_activity_logs_created_at (created_at),
    
    CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit trail for all system activities';

-- ============================================================
-- SECTION 2: WAREHOUSE MANAGEMENT (ĐỢT 1)
-- ============================================================

-- 2.1 Warehouses table
CREATE TABLE warehouses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE COMMENT 'Warehouse code: WH-001',
    name VARCHAR(100) NOT NULL COMMENT 'Warehouse name',
    description TEXT NULL,
    address VARCHAR(500) NULL COMMENT 'Full address',
    city VARCHAR(100) NULL,
    state_province VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    country VARCHAR(100) NULL DEFAULT 'Vietnam',
    phone VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    manager_id INT UNSIGNED NULL COMMENT 'Warehouse manager user ID',
    capacity_volume DECIMAL(15,2) NULL COMMENT 'Total capacity in cubic meters',
    capacity_weight DECIMAL(15,2) NULL COMMENT 'Total capacity in kg',
    status ENUM('active', 'inactive', 'maintenance') NOT NULL DEFAULT 'active',
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_warehouses_code (code),
    INDEX idx_warehouses_status (status),
    INDEX idx_warehouses_manager_id (manager_id),
    INDEX idx_warehouses_deleted_at (deleted_at),
    
    CONSTRAINT fk_warehouses_manager FOREIGN KEY (manager_id) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_warehouses_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Warehouse locations';

-- 2.2 Warehouse zones (areas within warehouse)
CREATE TABLE warehouse_zones (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT UNSIGNED NOT NULL,
    code VARCHAR(20) NOT NULL COMMENT 'Zone code: Z-A, Z-B, COLD-1',
    name VARCHAR(100) NOT NULL COMMENT 'Zone name: Zone A, Cold Storage',
    zone_type ENUM('general', 'cold', 'hazardous', 'high_value', 'quarantine', 'staging', 'shipping', 'receiving') NOT NULL DEFAULT 'general',
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_warehouse_zone_code (warehouse_id, code),
    INDEX idx_warehouse_zones_warehouse_id (warehouse_id),
    INDEX idx_warehouse_zones_type (zone_type),
    
    CONSTRAINT fk_warehouse_zones_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Zones/areas within warehouses';

-- 2.3 Storage locations (rack, level, bin)
CREATE TABLE storage_locations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT UNSIGNED NOT NULL,
    zone_id INT UNSIGNED NULL COMMENT 'Optional zone reference',
    code VARCHAR(50) NOT NULL COMMENT 'Location code: A-01-02-03',
    aisle VARCHAR(10) NULL COMMENT 'Aisle identifier',
    rack VARCHAR(10) NULL COMMENT 'Rack number',
    level VARCHAR(10) NULL COMMENT 'Shelf level',
    bin VARCHAR(10) NULL COMMENT 'Bin/slot position',
    location_type ENUM('rack', 'floor', 'pallet', 'shelf', 'bin', 'bulk') NOT NULL DEFAULT 'rack',
    barcode VARCHAR(100) NULL UNIQUE COMMENT 'Location barcode for scanning',
    max_weight DECIMAL(10,2) NULL COMMENT 'Maximum weight capacity in kg',
    max_volume DECIMAL(10,2) NULL COMMENT 'Maximum volume in cubic meters',
    is_occupied TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Currently occupied flag',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_warehouse_location_code (warehouse_id, code),
    INDEX idx_storage_locations_warehouse_id (warehouse_id),
    INDEX idx_storage_locations_zone_id (zone_id),
    INDEX idx_storage_locations_barcode (barcode),
    INDEX idx_storage_locations_occupied (is_occupied),
    
    CONSTRAINT fk_storage_locations_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_storage_locations_zone FOREIGN KEY (zone_id) 
        REFERENCES warehouse_zones(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Storage locations within warehouses';

-- ============================================================
-- SECTION 3: SUPPLIERS & CUSTOMERS (ĐỢT 2)
-- ============================================================

-- 3.1 Suppliers
CREATE TABLE suppliers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE COMMENT 'Supplier code',
    name VARCHAR(255) NOT NULL COMMENT 'Supplier/company name',
    contact_person VARCHAR(100) NULL,
    email VARCHAR(100) NULL,
    phone VARCHAR(20) NULL,
    address VARCHAR(500) NULL,
    city VARCHAR(100) NULL,
    country VARCHAR(100) NULL DEFAULT 'Vietnam',
    tax_id VARCHAR(50) NULL COMMENT 'Tax identification number',
    payment_terms INT NULL COMMENT 'Payment terms in days',
    bank_name VARCHAR(100) NULL,
    bank_account VARCHAR(50) NULL,
    status ENUM('active', 'inactive', 'blacklisted') NOT NULL DEFAULT 'active',
    notes TEXT NULL,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_suppliers_code (code),
    INDEX idx_suppliers_name (name),
    INDEX idx_suppliers_status (status),
    INDEX idx_suppliers_deleted_at (deleted_at),
    
    CONSTRAINT fk_suppliers_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Supplier master data';

-- 3.2 Customers (ĐỢT 2)
CREATE TABLE customers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE COMMENT 'Customer code: CUS-0001',
    user_id INT UNSIGNED NULL COMMENT 'FK to users if customer has account',
    name VARCHAR(255) NOT NULL COMMENT 'Customer name',
    email VARCHAR(100) NULL,
    phone VARCHAR(20) NULL,
    address VARCHAR(500) NULL,
    ward VARCHAR(100) NULL,
    district VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    tax_id VARCHAR(50) NULL COMMENT 'Tax ID for B2B',
    company_name VARCHAR(255) NULL COMMENT 'Company name for B2B',
    customer_type ENUM('individual', 'company') NOT NULL DEFAULT 'individual',
    status ENUM('active', 'inactive', 'blacklisted') NOT NULL DEFAULT 'active',
    notes TEXT NULL,
    total_orders INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Total order count',
    total_spent DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Total amount spent',
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_customers_code (code),
    INDEX idx_customers_user_id (user_id),
    INDEX idx_customers_email (email),
    INDEX idx_customers_phone (phone),
    INDEX idx_customers_status (status),
    INDEX idx_customers_deleted_at (deleted_at),
    
    CONSTRAINT fk_customers_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customers_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Customer master data';

-- ============================================================
-- SECTION 4: PRODUCT & CATEGORY MANAGEMENT (ĐỢT 1)
-- ============================================================

-- 4.1 Categories (hierarchical)
CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id INT UNSIGNED NULL COMMENT 'Parent category ID for hierarchy',
    code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Category code',
    name VARCHAR(100) NOT NULL COMMENT 'Category name',
    description TEXT NULL,
    image_url VARCHAR(500) NULL,
    level INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Hierarchy level (0=root)',
    path VARCHAR(255) NULL COMMENT 'Full path: /1/5/12/ for breadcrumb',
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_categories_parent_id (parent_id),
    INDEX idx_categories_code (code),
    INDEX idx_categories_level (level),
    INDEX idx_categories_is_active (is_active),
    INDEX idx_categories_deleted_at (deleted_at),
    
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) 
        REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Product categories with hierarchical support';

-- 4.2 Unit of measurements
CREATE TABLE units (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE COMMENT 'Unit code: PCS, KG, BOX',
    name VARCHAR(50) NOT NULL COMMENT 'Unit name: Piece, Kilogram, Box',
    type ENUM('quantity', 'weight', 'volume', 'length', 'area') NOT NULL DEFAULT 'quantity',
    base_unit_id INT UNSIGNED NULL COMMENT 'Base unit for conversion',
    conversion_factor DECIMAL(15,6) NULL COMMENT 'Factor to convert to base unit',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_units_code (code),
    INDEX idx_units_type (type),
    
    CONSTRAINT fk_units_base_unit FOREIGN KEY (base_unit_id) 
        REFERENCES units(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Units of measurement';

-- 4.3 Products table
CREATE TABLE products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE COMMENT 'Stock Keeping Unit',
    barcode VARCHAR(50) NULL UNIQUE COMMENT 'Product barcode (EAN/UPC)',
    name VARCHAR(255) NOT NULL COMMENT 'Product name',
    description TEXT NULL,
    category_id INT UNSIGNED NULL,
    unit_id INT UNSIGNED NULL COMMENT 'Primary unit of measurement',
    supplier_id INT UNSIGNED NULL COMMENT 'Default supplier',
    brand VARCHAR(100) NULL,
    
    -- Pricing
    cost_price DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Cost/purchase price',
    selling_price DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Selling price',
    currency VARCHAR(3) NOT NULL DEFAULT 'VND' COMMENT 'Currency code',
    tax_rate DECIMAL(5,2) NULL DEFAULT 0.00 COMMENT 'Tax percentage',
    
    -- Physical attributes
    weight DECIMAL(10,3) NULL COMMENT 'Weight in kg',
    length DECIMAL(10,2) NULL COMMENT 'Length in cm',
    width DECIMAL(10,2) NULL COMMENT 'Width in cm',
    height DECIMAL(10,2) NULL COMMENT 'Height in cm',
    
    -- Inventory settings
    min_stock_level INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Minimum stock before reorder alert',
    max_stock_level INT UNSIGNED NULL COMMENT 'Maximum stock level',
    reorder_point INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Quantity at which to reorder',
    reorder_quantity INT UNSIGNED NULL COMMENT 'Suggested reorder quantity',
    
    -- Tracking
    is_serialized TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Requires serial number tracking',
    is_batch_tracked TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Requires batch/lot tracking',
    has_expiry TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Has expiration date',
    
    -- Media
    image_url VARCHAR(500) NULL COMMENT 'Primary product image',
    images JSON NULL COMMENT 'Array of additional image URLs',
    
    -- Status
    status ENUM('active', 'inactive', 'discontinued', 'draft') NOT NULL DEFAULT 'draft',
    
    -- Audit
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_products_sku (sku),
    INDEX idx_products_barcode (barcode),
    INDEX idx_products_category_id (category_id),
    INDEX idx_products_supplier_id (supplier_id),
    INDEX idx_products_status (status),
    INDEX idx_products_deleted_at (deleted_at),
    FULLTEXT INDEX ft_products_name_desc (name, description),
    
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) 
        REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_products_unit FOREIGN KEY (unit_id) 
        REFERENCES units(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) 
        REFERENCES suppliers(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Product master data';

-- ============================================================
-- SECTION 5: INVENTORY TRACKING (ĐỢT 1)
-- ============================================================

-- 5.1 Current inventory levels
CREATE TABLE inventories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    warehouse_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NULL COMMENT 'Specific storage location',
    
    -- Quantities (CHỈ THAY ĐỔI QUA PHIẾU NHẬP/XUẤT)
    quantity_on_hand INT NOT NULL DEFAULT 0 COMMENT 'Current physical quantity',
    quantity_reserved INT NOT NULL DEFAULT 0 COMMENT 'Reserved for orders',
    quantity_available INT GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    quantity_incoming INT NOT NULL DEFAULT 0 COMMENT 'Expected from purchase orders',
    
    -- Batch/Lot tracking
    batch_number VARCHAR(50) NULL COMMENT 'Batch or lot number',
    serial_number VARCHAR(100) NULL COMMENT 'Serial number if serialized',
    manufacturing_date DATE NULL,
    expiry_date DATE NULL,
    
    -- Valuation
    unit_cost DECIMAL(15,2) NULL COMMENT 'Unit cost for this batch',
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity_on_hand * COALESCE(unit_cost, 0)) STORED,
    
    -- Status
    status ENUM('available', 'reserved', 'damaged', 'expired', 'quarantine') NOT NULL DEFAULT 'available',
    
    last_count_date TIMESTAMP NULL COMMENT 'Last physical count date',
    last_movement_date TIMESTAMP NULL COMMENT 'Last inventory movement',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_inventory_product_location_batch (product_id, warehouse_id, location_id, batch_number, serial_number),
    INDEX idx_inventories_product_id (product_id),
    INDEX idx_inventories_warehouse_id (warehouse_id),
    INDEX idx_inventories_location_id (location_id),
    INDEX idx_inventories_status (status),
    INDEX idx_inventories_expiry_date (expiry_date),
    
    CONSTRAINT fk_inventories_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_inventories_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_inventories_location FOREIGN KEY (location_id) 
        REFERENCES storage_locations(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Current inventory levels - ONLY modified through approved receipts/issues';

-- 5.2 Inventory movement logs
CREATE TABLE inventory_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    inventory_id BIGINT UNSIGNED NULL COMMENT 'Related inventory record',
    product_id INT UNSIGNED NOT NULL,
    warehouse_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NULL,
    
    -- Movement type
    movement_type ENUM(
        'goods_receipt', 
        'goods_issue', 
        'transfer_in', 
        'transfer_out', 
        'adjustment_in', 
        'adjustment_out',
        'return_in',
        'return_out',
        'damage',
        'expired',
        'stock_take'
    ) NOT NULL COMMENT 'Type of inventory movement',
    
    -- Reference to source document
    reference_type VARCHAR(50) NULL COMMENT 'Source document type',
    reference_id INT UNSIGNED NULL COMMENT 'Source document ID',
    reference_number VARCHAR(50) NULL COMMENT 'Source document number',
    
    -- Quantities
    quantity_before INT NOT NULL DEFAULT 0,
    quantity_change INT NOT NULL COMMENT 'Positive for in, negative for out',
    quantity_after INT NOT NULL DEFAULT 0,
    
    -- Batch info
    batch_number VARCHAR(50) NULL,
    serial_number VARCHAR(100) NULL,
    
    -- Cost tracking
    unit_cost DECIMAL(15,2) NULL,
    total_cost DECIMAL(15,2) NULL,
    
    reason VARCHAR(255) NULL COMMENT 'Reason for movement',
    notes TEXT NULL,
    
    performed_by INT UNSIGNED NULL COMMENT 'User who performed the action',
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_inventory_logs_inventory_id (inventory_id),
    INDEX idx_inventory_logs_product_id (product_id),
    INDEX idx_inventory_logs_warehouse_id (warehouse_id),
    INDEX idx_inventory_logs_movement_type (movement_type),
    INDEX idx_inventory_logs_reference (reference_type, reference_id),
    INDEX idx_inventory_logs_performed_at (performed_at),
    
    CONSTRAINT fk_inventory_logs_inventory FOREIGN KEY (inventory_id) 
        REFERENCES inventories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_inventory_logs_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_inventory_logs_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_inventory_logs_performed_by FOREIGN KEY (performed_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Inventory movement history and audit trail';

-- 5.3 Reorder alerts (ĐỢT 2)
CREATE TABLE reorder_alerts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    warehouse_id INT UNSIGNED NULL COMMENT 'NULL means all warehouses',
    current_quantity INT NOT NULL,
    reorder_point INT NOT NULL,
    suggested_quantity INT NULL,
    status ENUM('pending', 'ordered', 'received', 'dismissed') NOT NULL DEFAULT 'pending',
    triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    handled_by INT UNSIGNED NULL,
    handled_at TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_reorder_alerts_product_id (product_id),
    INDEX idx_reorder_alerts_warehouse_id (warehouse_id),
    INDEX idx_reorder_alerts_status (status),
    
    CONSTRAINT fk_reorder_alerts_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_reorder_alerts_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_reorder_alerts_handled_by FOREIGN KEY (handled_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Reorder point alerts for inventory replenishment';

-- ============================================================
-- SECTION 6: GOODS RECEIPT / PHIẾU NHẬP KHO (ĐỢT 1)
-- ============================================================

-- 6.1 Goods receipt header (inbound)
CREATE TABLE goods_receipts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    receipt_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'GR number: GR-2024-000001',
    receipt_type ENUM('purchase', 'return', 'transfer', 'adjustment', 'other') NOT NULL DEFAULT 'purchase',
    
    -- Source
    supplier_id INT UNSIGNED NULL COMMENT 'Supplier for purchase receipts',
    source_warehouse_id INT UNSIGNED NULL COMMENT 'Source for transfers',
    purchase_order_number VARCHAR(50) NULL COMMENT 'Related PO number',
    
    -- Destination
    warehouse_id INT UNSIGNED NOT NULL COMMENT 'Receiving warehouse',
    
    -- Dates
    receipt_date DATE NOT NULL COMMENT 'Date of receipt',
    expected_date DATE NULL COMMENT 'Expected delivery date',
    
    -- Totals
    total_items INT UNSIGNED NOT NULL DEFAULT 0,
    total_quantity INT NOT NULL DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    shipping_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    
    -- Status workflow: QUAN TRỌNG - Chỉ cập nhật tồn kho khi APPROVED
    status ENUM('draft', 'pending', 'approved', 'rejected', 'partial', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    
    -- Shipping info
    shipping_method VARCHAR(100) NULL,
    tracking_number VARCHAR(100) NULL,
    carrier_name VARCHAR(100) NULL,
    
    notes TEXT NULL,
    internal_notes TEXT NULL COMMENT 'Internal notes not visible to supplier',
    rejection_reason TEXT NULL COMMENT 'Reason if rejected',
    
    -- Audit: Người tạo & Người duyệt
    created_by INT UNSIGNED NULL COMMENT 'Staff who created',
    received_by INT UNSIGNED NULL COMMENT 'User who received the goods',
    approved_by INT UNSIGNED NULL COMMENT 'Admin who approved',
    approved_at TIMESTAMP NULL COMMENT 'Approval timestamp',
    rejected_by INT UNSIGNED NULL COMMENT 'Admin who rejected',
    rejected_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_goods_receipts_number (receipt_number),
    INDEX idx_goods_receipts_supplier_id (supplier_id),
    INDEX idx_goods_receipts_warehouse_id (warehouse_id),
    INDEX idx_goods_receipts_receipt_date (receipt_date),
    INDEX idx_goods_receipts_status (status),
    INDEX idx_goods_receipts_deleted_at (deleted_at),
    
    CONSTRAINT fk_goods_receipts_supplier FOREIGN KEY (supplier_id) 
        REFERENCES suppliers(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_receipts_source_warehouse FOREIGN KEY (source_warehouse_id) 
        REFERENCES warehouses(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_receipts_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_goods_receipts_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_receipts_received_by FOREIGN KEY (received_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_receipts_approved_by FOREIGN KEY (approved_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_receipts_rejected_by FOREIGN KEY (rejected_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Goods receipt/inbound header - Inventory updated ONLY when approved';

-- 6.2 Goods receipt line items
CREATE TABLE goods_receipt_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    goods_receipt_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NULL COMMENT 'Storage location for received items',
    
    -- Quantities
    quantity_expected INT NOT NULL DEFAULT 0 COMMENT 'Expected quantity',
    quantity_received INT NOT NULL DEFAULT 0 COMMENT 'Actually received quantity',
    quantity_rejected INT NOT NULL DEFAULT 0 COMMENT 'Rejected/damaged quantity',
    unit_id INT UNSIGNED NULL,
    
    -- Pricing
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    -- Batch/Serial tracking
    batch_number VARCHAR(50) NULL,
    serial_numbers JSON NULL COMMENT 'Array of serial numbers if serialized',
    manufacturing_date DATE NULL,
    expiry_date DATE NULL,
    
    -- Quality
    quality_status ENUM('pending', 'passed', 'failed', 'partial') NOT NULL DEFAULT 'pending',
    quality_notes TEXT NULL,
    
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_goods_receipt_items_receipt_id (goods_receipt_id),
    INDEX idx_goods_receipt_items_product_id (product_id),
    INDEX idx_goods_receipt_items_location_id (location_id),
    INDEX idx_goods_receipt_items_batch_number (batch_number),
    
    CONSTRAINT fk_goods_receipt_items_receipt FOREIGN KEY (goods_receipt_id) 
        REFERENCES goods_receipts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_goods_receipt_items_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_goods_receipt_items_location FOREIGN KEY (location_id) 
        REFERENCES storage_locations(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_receipt_items_unit FOREIGN KEY (unit_id) 
        REFERENCES units(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Goods receipt line items';

-- ============================================================
-- SECTION 7: GOODS ISSUE / PHIẾU XUẤT KHO (ĐỢT 1)
-- ============================================================

-- 7.1 Goods issue header (outbound)
CREATE TABLE goods_issues (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    issue_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'GI number: GI-2024-000001',
    issue_type ENUM('sales', 'transfer', 'return_to_supplier', 'damage', 'adjustment', 'other') NOT NULL DEFAULT 'sales',
    
    -- Source
    warehouse_id INT UNSIGNED NOT NULL COMMENT 'Issuing warehouse',
    
    -- Destination
    destination_warehouse_id INT UNSIGNED NULL COMMENT 'Destination for transfers',
    customer_id INT UNSIGNED NULL COMMENT 'FK to customers table',
    customer_order_id INT UNSIGNED NULL COMMENT 'FK to customer_orders',
    
    -- Legacy fields for backward compatibility
    customer_name VARCHAR(255) NULL COMMENT 'Customer name if no customer_id',
    customer_address TEXT NULL,
    customer_phone VARCHAR(20) NULL,
    customer_email VARCHAR(100) NULL,
    sales_order_number VARCHAR(50) NULL COMMENT 'Related SO number',
    
    -- Dates
    issue_date DATE NOT NULL COMMENT 'Date of issue',
    required_date DATE NULL COMMENT 'Required delivery date',
    shipped_date DATE NULL COMMENT 'Actual ship date',
    
    -- Totals
    total_items INT UNSIGNED NOT NULL DEFAULT 0,
    total_quantity INT NOT NULL DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    shipping_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    
    -- Status workflow: QUAN TRỌNG - Chỉ trừ tồn kho khi APPROVED
    status ENUM('draft', 'pending', 'approved', 'rejected', 'picking', 'packed', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'draft',
    
    -- Shipping info
    shipping_method VARCHAR(100) NULL,
    tracking_number VARCHAR(100) NULL,
    carrier_name VARCHAR(100) NULL,
    
    -- Priority
    priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    
    notes TEXT NULL,
    internal_notes TEXT NULL,
    rejection_reason TEXT NULL,
    
    -- Audit: Người tạo & Người duyệt
    created_by INT UNSIGNED NULL COMMENT 'Staff who created',
    issued_by INT UNSIGNED NULL COMMENT 'User who issued the goods',
    picked_by INT UNSIGNED NULL COMMENT 'User who picked the items',
    packed_by INT UNSIGNED NULL COMMENT 'User who packed the items',
    approved_by INT UNSIGNED NULL COMMENT 'Admin who approved',
    approved_at TIMESTAMP NULL,
    rejected_by INT UNSIGNED NULL,
    rejected_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_goods_issues_number (issue_number),
    INDEX idx_goods_issues_warehouse_id (warehouse_id),
    INDEX idx_goods_issues_customer_id (customer_id),
    INDEX idx_goods_issues_order_id (customer_order_id),
    INDEX idx_goods_issues_issue_date (issue_date),
    INDEX idx_goods_issues_status (status),
    INDEX idx_goods_issues_priority (priority),
    INDEX idx_goods_issues_deleted_at (deleted_at),
    
    CONSTRAINT fk_goods_issues_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_dest_warehouse FOREIGN KEY (destination_warehouse_id) 
        REFERENCES warehouses(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_issued_by FOREIGN KEY (issued_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_picked_by FOREIGN KEY (picked_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_packed_by FOREIGN KEY (packed_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_approved_by FOREIGN KEY (approved_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_rejected_by FOREIGN KEY (rejected_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Goods issue/outbound header - Inventory updated ONLY when approved';

-- 7.2 Goods issue line items
CREATE TABLE goods_issue_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    goods_issue_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NULL COMMENT 'Pick location',
    inventory_id BIGINT UNSIGNED NULL COMMENT 'Specific inventory record',
    
    -- Quantities
    quantity_requested INT NOT NULL DEFAULT 0,
    quantity_picked INT NOT NULL DEFAULT 0,
    quantity_shipped INT NOT NULL DEFAULT 0,
    unit_id INT UNSIGNED NULL,
    
    -- Pricing
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'For margin calculation',
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    -- Batch/Serial tracking
    batch_number VARCHAR(50) NULL,
    serial_numbers JSON NULL,
    expiry_date DATE NULL,
    
    -- Status
    pick_status ENUM('pending', 'partial', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_goods_issue_items_issue_id (goods_issue_id),
    INDEX idx_goods_issue_items_product_id (product_id),
    INDEX idx_goods_issue_items_location_id (location_id),
    INDEX idx_goods_issue_items_inventory_id (inventory_id),
    INDEX idx_goods_issue_items_pick_status (pick_status),
    
    CONSTRAINT fk_goods_issue_items_issue FOREIGN KEY (goods_issue_id) 
        REFERENCES goods_issues(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issue_items_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issue_items_location FOREIGN KEY (location_id) 
        REFERENCES storage_locations(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issue_items_inventory FOREIGN KEY (inventory_id) 
        REFERENCES inventories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issue_items_unit FOREIGN KEY (unit_id) 
        REFERENCES units(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Goods issue line items';

-- ============================================================
-- SECTION 8: STOCK TRANSFER (ĐỢT 1)
-- ============================================================

-- 8.1 Stock transfer header
CREATE TABLE stock_transfers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transfer_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'TR number: TR-2024-000001',
    
    -- Locations
    source_warehouse_id INT UNSIGNED NOT NULL,
    source_location_id INT UNSIGNED NULL,
    destination_warehouse_id INT UNSIGNED NOT NULL,
    destination_location_id INT UNSIGNED NULL,
    
    -- Dates
    transfer_date DATE NOT NULL,
    expected_arrival_date DATE NULL,
    actual_arrival_date DATE NULL,
    
    -- Totals
    total_items INT UNSIGNED NOT NULL DEFAULT 0,
    total_quantity INT NOT NULL DEFAULT 0,
    total_value DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    -- Status
    status ENUM('draft', 'pending', 'approved', 'rejected', 'in_transit', 'partial_received', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    
    -- Shipping
    shipping_method VARCHAR(100) NULL,
    tracking_number VARCHAR(100) NULL,
    carrier_name VARCHAR(100) NULL,
    
    reason VARCHAR(255) NULL COMMENT 'Reason for transfer',
    notes TEXT NULL,
    rejection_reason TEXT NULL,
    
    -- Audit
    requested_by INT UNSIGNED NULL,
    approved_by INT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    rejected_by INT UNSIGNED NULL,
    rejected_at TIMESTAMP NULL,
    shipped_by INT UNSIGNED NULL,
    shipped_at TIMESTAMP NULL,
    received_by INT UNSIGNED NULL,
    received_at TIMESTAMP NULL,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_stock_transfers_number (transfer_number),
    INDEX idx_stock_transfers_source_warehouse (source_warehouse_id),
    INDEX idx_stock_transfers_dest_warehouse (destination_warehouse_id),
    INDEX idx_stock_transfers_transfer_date (transfer_date),
    INDEX idx_stock_transfers_status (status),
    INDEX idx_stock_transfers_deleted_at (deleted_at),
    
    CONSTRAINT fk_stock_transfers_source_warehouse FOREIGN KEY (source_warehouse_id) 
        REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfers_source_location FOREIGN KEY (source_location_id) 
        REFERENCES storage_locations(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfers_dest_warehouse FOREIGN KEY (destination_warehouse_id) 
        REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfers_dest_location FOREIGN KEY (destination_location_id) 
        REFERENCES storage_locations(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfers_requested_by FOREIGN KEY (requested_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfers_approved_by FOREIGN KEY (approved_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfers_rejected_by FOREIGN KEY (rejected_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfers_shipped_by FOREIGN KEY (shipped_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfers_received_by FOREIGN KEY (received_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfers_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stock transfer between warehouses or locations';

-- 8.2 Stock transfer line items
CREATE TABLE stock_transfer_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    stock_transfer_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    source_inventory_id BIGINT UNSIGNED NULL,
    destination_inventory_id BIGINT UNSIGNED NULL,
    
    -- Quantities
    quantity_requested INT NOT NULL DEFAULT 0,
    quantity_shipped INT NOT NULL DEFAULT 0,
    quantity_received INT NOT NULL DEFAULT 0,
    quantity_damaged INT NOT NULL DEFAULT 0,
    unit_id INT UNSIGNED NULL,
    
    -- Cost tracking
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    -- Batch/Serial tracking
    batch_number VARCHAR(50) NULL,
    serial_numbers JSON NULL,
    expiry_date DATE NULL,
    
    -- Status
    status ENUM('pending', 'shipped', 'received', 'partial', 'cancelled') NOT NULL DEFAULT 'pending',
    
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_stock_transfer_items_transfer_id (stock_transfer_id),
    INDEX idx_stock_transfer_items_product_id (product_id),
    INDEX idx_stock_transfer_items_status (status),
    
    CONSTRAINT fk_stock_transfer_items_transfer FOREIGN KEY (stock_transfer_id) 
        REFERENCES stock_transfers(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfer_items_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfer_items_source_inv FOREIGN KEY (source_inventory_id) 
        REFERENCES inventories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfer_items_dest_inv FOREIGN KEY (destination_inventory_id) 
        REFERENCES inventories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfer_items_unit FOREIGN KEY (unit_id) 
        REFERENCES units(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stock transfer line items';

-- ============================================================
-- SECTION 9: STOCK TAKING / KIỂM KÊ (ĐỢT 2)
-- ============================================================

-- 9.1 Stock take header
CREATE TABLE stock_takes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    stocktake_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'ST number: ST-2024-000001',
    
    -- Scope
    warehouse_id INT UNSIGNED NOT NULL,
    zone_id INT UNSIGNED NULL COMMENT 'Limit to specific zone',
    stocktake_type ENUM('full', 'partial', 'cycle', 'spot') NOT NULL DEFAULT 'partial',
    
    -- Dates
    scheduled_date DATE NOT NULL,
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    
    -- Results summary
    total_items INT UNSIGNED NOT NULL DEFAULT 0,
    counted_items INT UNSIGNED NOT NULL DEFAULT 0,
    matched_items INT UNSIGNED NOT NULL DEFAULT 0,
    variance_items INT UNSIGNED NOT NULL DEFAULT 0,
    total_variance_value DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    -- Status
    status ENUM('draft', 'scheduled', 'in_progress', 'pending_review', 'approved', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    
    reason VARCHAR(255) NULL COMMENT 'Reason for stock take',
    notes TEXT NULL,
    
    -- Audit
    assigned_to INT UNSIGNED NULL COMMENT 'Primary user assigned',
    started_by INT UNSIGNED NULL,
    completed_by INT UNSIGNED NULL,
    reviewed_by INT UNSIGNED NULL,
    reviewed_at TIMESTAMP NULL,
    approved_by INT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_stock_takes_number (stocktake_number),
    INDEX idx_stock_takes_warehouse_id (warehouse_id),
    INDEX idx_stock_takes_scheduled_date (scheduled_date),
    INDEX idx_stock_takes_status (status),
    
    CONSTRAINT fk_stock_takes_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_takes_zone FOREIGN KEY (zone_id) 
        REFERENCES warehouse_zones(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_takes_assigned_to FOREIGN KEY (assigned_to) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_takes_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stock take/inventory count header';

-- 9.2 Stock take line items
CREATE TABLE stock_take_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    stock_take_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NULL,
    inventory_id BIGINT UNSIGNED NULL,
    
    -- Quantities
    system_quantity INT NOT NULL DEFAULT 0 COMMENT 'Quantity in system at snapshot',
    counted_quantity INT NULL COMMENT 'Actual counted quantity',
    variance_quantity INT GENERATED ALWAYS AS (COALESCE(counted_quantity, 0) - system_quantity) STORED,
    
    -- Values
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    system_value DECIMAL(15,2) GENERATED ALWAYS AS (system_quantity * unit_cost) STORED,
    counted_value DECIMAL(15,2) GENERATED ALWAYS AS (COALESCE(counted_quantity, 0) * unit_cost) STORED,
    variance_value DECIMAL(15,2) GENERATED ALWAYS AS ((COALESCE(counted_quantity, 0) - system_quantity) * unit_cost) STORED,
    
    -- Batch tracking
    batch_number VARCHAR(50) NULL,
    serial_number VARCHAR(100) NULL,
    
    -- Status
    status ENUM('pending', 'counted', 'recounted', 'verified', 'adjusted') NOT NULL DEFAULT 'pending',
    
    -- Variance handling
    variance_reason ENUM('no_variance', 'damaged', 'expired', 'theft', 'misplaced', 'data_error', 'unknown', 'other') NULL,
    variance_notes TEXT NULL,
    
    -- Audit
    counted_by INT UNSIGNED NULL,
    counted_at TIMESTAMP NULL,
    verified_by INT UNSIGNED NULL,
    verified_at TIMESTAMP NULL,
    
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_stock_take_items_take_id (stock_take_id),
    INDEX idx_stock_take_items_product_id (product_id),
    INDEX idx_stock_take_items_status (status),
    
    CONSTRAINT fk_stock_take_items_take FOREIGN KEY (stock_take_id) 
        REFERENCES stock_takes(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_stock_take_items_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_take_items_location FOREIGN KEY (location_id) 
        REFERENCES storage_locations(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_take_items_inventory FOREIGN KEY (inventory_id) 
        REFERENCES inventories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_take_items_counted_by FOREIGN KEY (counted_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_take_items_verified_by FOREIGN KEY (verified_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stock take line items with variance tracking';

-- ============================================================
-- SECTION 10: ORDER STATUS MANAGEMENT (ĐỢT 1)
-- ============================================================

-- 10.1 Order statuses definition
CREATE TABLE order_statuses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã trạng thái: pending, confirmed...',
    name_vi VARCHAR(100) NOT NULL COMMENT 'Tên tiếng Việt',
    name_en VARCHAR(100) NOT NULL COMMENT 'Tên tiếng Anh',
    description TEXT NULL COMMENT 'Mô tả chi tiết',
    color VARCHAR(20) NOT NULL DEFAULT '#6B7280' COMMENT 'Màu hiển thị',
    icon VARCHAR(50) NULL COMMENT 'Tên icon',
    sort_order INT UNSIGNED NOT NULL COMMENT 'Thứ tự (để kiểm tra tiến/lùi)',
    is_final TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Trạng thái kết thúc',
    is_cancellable TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Có thể hủy không',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_order_statuses_code (code),
    INDEX idx_order_statuses_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Định nghĩa các trạng thái đơn hàng';

-- 10.2 Customer orders (User đặt hàng)
CREATE TABLE customer_orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã đơn: ORD-2024-000001',
    
    -- Khách hàng
    user_id INT UNSIGNED NOT NULL COMMENT 'User đặt hàng',
    customer_id INT UNSIGNED NULL COMMENT 'FK to customers (nếu có)',
    
    -- Thông tin giao hàng
    shipping_name VARCHAR(255) NOT NULL COMMENT 'Tên người nhận',
    shipping_phone VARCHAR(20) NOT NULL COMMENT 'SĐT người nhận',
    shipping_email VARCHAR(100) NULL,
    shipping_address TEXT NOT NULL COMMENT 'Địa chỉ giao hàng',
    shipping_ward VARCHAR(100) NULL,
    shipping_district VARCHAR(100) NULL,
    shipping_city VARCHAR(100) NULL,
    shipping_postal_code VARCHAR(20) NULL,
    
    -- Thời gian
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL,
    processing_at TIMESTAMP NULL,
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    expected_delivery_date DATE NULL,
    
    -- Tổng tiền
    total_items INT UNSIGNED NOT NULL DEFAULT 0,
    total_quantity INT NOT NULL DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    shipping_fee DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    coupon_code VARCHAR(50) NULL COMMENT 'Mã giảm giá đã dùng',
    coupon_discount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    
    -- Trạng thái đơn hàng
    status_id INT UNSIGNED NOT NULL COMMENT 'FK đến order_statuses',
    status_code VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Trạng thái thanh toán
    payment_method VARCHAR(50) NULL COMMENT 'cod, bank_transfer, card...',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded', 'partial') NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP NULL,
    paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    -- Kho xử lý
    warehouse_id INT UNSIGNED NULL COMMENT 'Kho xử lý đơn',
    goods_issue_id INT UNSIGNED NULL COMMENT 'Liên kết phiếu xuất',
    
    -- Vận chuyển
    shipping_method VARCHAR(100) NULL,
    carrier_name VARCHAR(100) NULL,
    tracking_number VARCHAR(100) NULL,
    
    -- Nguồn đơn hàng
    source VARCHAR(50) NULL COMMENT 'web, app, pos, phone...',
    
    -- Ghi chú
    customer_notes TEXT NULL,
    internal_notes TEXT NULL,
    cancellation_reason TEXT NULL,
    
    -- Audit
    confirmed_by INT UNSIGNED NULL,
    processed_by INT UNSIGNED NULL,
    shipped_by INT UNSIGNED NULL,
    cancelled_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_customer_orders_number (order_number),
    INDEX idx_customer_orders_user_id (user_id),
    INDEX idx_customer_orders_customer_id (customer_id),
    INDEX idx_customer_orders_status (status_id, status_code),
    INDEX idx_customer_orders_order_date (order_date),
    INDEX idx_customer_orders_warehouse_id (warehouse_id),
    INDEX idx_customer_orders_payment_status (payment_status),
    INDEX idx_customer_orders_deleted_at (deleted_at),
    
    CONSTRAINT fk_customer_orders_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_customer_orders_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_orders_status FOREIGN KEY (status_id) 
        REFERENCES order_statuses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_customer_orders_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_orders_confirmed_by FOREIGN KEY (confirmed_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_orders_processed_by FOREIGN KEY (processed_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_orders_cancelled_by FOREIGN KEY (cancelled_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Đơn hàng của khách hàng';

-- 10.3 Customer order items
CREATE TABLE customer_order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    
    quantity INT NOT NULL DEFAULT 0,
    unit_id INT UNSIGNED NULL,
    
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_customer_order_items_order_id (order_id),
    INDEX idx_customer_order_items_product_id (product_id),
    
    CONSTRAINT fk_customer_order_items_order FOREIGN KEY (order_id) 
        REFERENCES customer_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_customer_order_items_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_customer_order_items_unit FOREIGN KEY (unit_id) 
        REFERENCES units(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Chi tiết đơn hàng';

-- 10.4 Order status history
CREATE TABLE order_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    
    from_status_id INT UNSIGNED NULL,
    from_status_code VARCHAR(50) NULL,
    to_status_id INT UNSIGNED NOT NULL,
    to_status_code VARCHAR(50) NOT NULL,
    
    reason TEXT NULL COMMENT 'Lý do thay đổi',
    notes TEXT NULL,
    
    changed_by INT UNSIGNED NOT NULL COMMENT 'User thay đổi',
    changed_by_role VARCHAR(50) NOT NULL COMMENT 'Role của người thay đổi',
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_order_status_history_order_id (order_id),
    INDEX idx_order_status_history_created_at (created_at),
    
    CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) 
        REFERENCES customer_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_order_status_history_from_status FOREIGN KEY (from_status_id) 
        REFERENCES order_statuses(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_order_status_history_to_status FOREIGN KEY (to_status_id) 
        REFERENCES order_statuses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_order_status_history_changed_by FOREIGN KEY (changed_by) 
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Lịch sử thay đổi trạng thái đơn hàng';

-- 10.5 Order status transitions (quy tắc chuyển trạng thái)
CREATE TABLE order_status_transitions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    from_status_id INT UNSIGNED NOT NULL,
    to_status_id INT UNSIGNED NOT NULL,
    allowed_roles JSON NOT NULL COMMENT 'Roles được phép: ["admin", "staff"]',
    requires_reason TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Bắt buộc nhập lý do',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_status_transition (from_status_id, to_status_id),
    INDEX idx_status_transitions_from (from_status_id),
    INDEX idx_status_transitions_to (to_status_id),
    
    CONSTRAINT fk_status_transitions_from FOREIGN KEY (from_status_id) 
        REFERENCES order_statuses(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_status_transitions_to FOREIGN KEY (to_status_id) 
        REFERENCES order_statuses(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Quy tắc chuyển đổi trạng thái - Admin và Staff có thể update';

-- ============================================================
-- SECTION 11: SHOPPING CART (ĐỢT 2)
-- ============================================================

-- 11.1 Shopping cart
CREATE TABLE carts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL COMMENT 'FK to users (NULL for guest)',
    session_id VARCHAR(100) NULL COMMENT 'Session ID for guest cart',
    
    total_items INT UNSIGNED NOT NULL DEFAULT 0,
    total_quantity INT NOT NULL DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    coupon_code VARCHAR(50) NULL,
    coupon_discount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    notes TEXT NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL COMMENT 'Cart expiry for cleanup',
    
    INDEX idx_carts_user_id (user_id),
    INDEX idx_carts_session_id (session_id),
    INDEX idx_carts_expires_at (expires_at),
    
    CONSTRAINT fk_carts_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Shopping cart';

-- 11.2 Cart items
CREATE TABLE cart_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cart_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    notes TEXT NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_cart_product (cart_id, product_id),
    INDEX idx_cart_items_cart_id (cart_id),
    INDEX idx_cart_items_product_id (product_id),
    
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) 
        REFERENCES carts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cart items';

-- ============================================================
-- SECTION 12: PAYMENTS (ĐỢT 2)
-- ============================================================

-- 12.1 Payments
CREATE TABLE payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'PAY-2024-000001',
    order_id INT UNSIGNED NOT NULL,
    
    -- Payment info
    method ENUM('cod', 'bank_transfer', 'credit_card', 'e_wallet', 'other') NOT NULL DEFAULT 'cod',
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    
    -- Status
    status ENUM('pending', 'processing', 'success', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
    
    -- Gateway response
    transaction_id VARCHAR(100) NULL COMMENT 'Payment gateway transaction ID',
    gateway_response JSON NULL COMMENT 'Full response from payment gateway',
    
    -- Bank transfer info
    bank_name VARCHAR(100) NULL,
    bank_account VARCHAR(50) NULL,
    bank_reference VARCHAR(100) NULL,
    
    -- Timestamps
    paid_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    refunded_at TIMESTAMP NULL,
    refund_amount DECIMAL(15,2) NULL,
    refund_reason TEXT NULL,
    
    notes TEXT NULL,
    
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_payments_number (payment_number),
    INDEX idx_payments_order_id (order_id),
    INDEX idx_payments_status (status),
    INDEX idx_payments_method (method),
    INDEX idx_payments_transaction_id (transaction_id),
    
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) 
        REFERENCES customer_orders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_payments_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Payment records';

-- ============================================================
-- SECTION 13: NOTIFICATIONS (ĐỢT 2)
-- ============================================================

-- 13.1 Notifications
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL COMMENT 'Recipient user',
    
    type VARCHAR(50) NOT NULL COMMENT 'order, inventory, system, promotion...',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Reference to related entity
    entity_type VARCHAR(50) NULL COMMENT 'order, product, goods_receipt...',
    entity_id INT UNSIGNED NULL,
    
    -- Link and action
    link VARCHAR(500) NULL COMMENT 'URL to navigate to',
    action_text VARCHAR(100) NULL COMMENT 'Button text',
    
    -- Status
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    read_at TIMESTAMP NULL,
    
    -- Priority and display
    priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    icon VARCHAR(50) NULL,
    
    -- Expiry
    expires_at TIMESTAMP NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_is_read (is_read),
    INDEX idx_notifications_created_at (created_at),
    INDEX idx_notifications_entity (entity_type, entity_id),
    
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User notifications';

-- ============================================================
-- SECTION 14: SUPPORT TICKETS (ĐỢT 2)
-- ============================================================

-- 14.1 Support tickets
CREATE TABLE support_tickets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'TKT-2024-000001',
    user_id INT UNSIGNED NOT NULL COMMENT 'User who created ticket',
    
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category ENUM('general', 'order', 'payment', 'product', 'technical', 'complaint', 'other') NOT NULL DEFAULT 'general',
    
    -- Related order
    order_id INT UNSIGNED NULL,
    
    -- Status
    status ENUM('open', 'in_progress', 'waiting_customer', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    
    -- Assignment
    assigned_to INT UNSIGNED NULL COMMENT 'Staff assigned',
    assigned_at TIMESTAMP NULL,
    
    -- Resolution
    resolved_at TIMESTAMP NULL,
    resolved_by INT UNSIGNED NULL,
    resolution_notes TEXT NULL,
    
    -- Timestamps
    first_response_at TIMESTAMP NULL,
    last_activity_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    closed_by INT UNSIGNED NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_support_tickets_number (ticket_number),
    INDEX idx_support_tickets_user_id (user_id),
    INDEX idx_support_tickets_status (status),
    INDEX idx_support_tickets_priority (priority),
    INDEX idx_support_tickets_assigned_to (assigned_to),
    INDEX idx_support_tickets_order_id (order_id),
    
    CONSTRAINT fk_support_tickets_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_support_tickets_order FOREIGN KEY (order_id) 
        REFERENCES customer_orders(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_support_tickets_assigned_to FOREIGN KEY (assigned_to) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_support_tickets_resolved_by FOREIGN KEY (resolved_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_support_tickets_closed_by FOREIGN KEY (closed_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Support tickets';

-- 14.2 Support ticket messages
CREATE TABLE support_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL COMMENT 'User who sent message',
    
    message TEXT NOT NULL,
    is_staff_reply TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Is this from staff',
    
    -- Attachments
    attachments JSON NULL COMMENT 'Array of attachment URLs',
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_support_messages_ticket_id (ticket_id),
    INDEX idx_support_messages_user_id (user_id),
    INDEX idx_support_messages_created_at (created_at),
    
    CONSTRAINT fk_support_messages_ticket FOREIGN KEY (ticket_id) 
        REFERENCES support_tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_support_messages_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Support ticket messages';

-- ============================================================
-- SECTION 15: SYSTEM CONFIGURATION (ĐỢT 1)
-- ============================================================

-- 15.1 System settings
CREATE TABLE system_settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
    category VARCHAR(50) NULL COMMENT 'Settings category for grouping',
    description VARCHAR(255) NULL,
    is_public TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Visible to all users',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_system_settings_key (setting_key),
    INDEX idx_system_settings_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System configuration settings';

-- 15.2 Document number sequences
CREATE TABLE document_sequences (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_type VARCHAR(50) NOT NULL UNIQUE COMMENT 'GR, GI, TR, ST, ORD, PAY, TKT...',
    prefix VARCHAR(20) NOT NULL DEFAULT '' COMMENT 'Document prefix',
    suffix VARCHAR(20) NOT NULL DEFAULT '' COMMENT 'Document suffix',
    current_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
    number_length INT UNSIGNED NOT NULL DEFAULT 6 COMMENT 'Zero-padded length',
    reset_period ENUM('never', 'daily', 'monthly', 'yearly') NOT NULL DEFAULT 'yearly',
    last_reset_date DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_document_sequences_type (document_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Auto-incrementing document number sequences';

-- ============================================================
-- SECTION 16: DEFAULT DATA INSERTS
-- ============================================================

-- 16.1 Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'System Administrator - Full access to all features', '["*"]'),
('staff', 'Warehouse Staff - Create receipts/issues, view inventory, update order status', '["inventory.read", "product.read", "goods_receipt.*", "goods_issue.*", "order.read", "order.update_status", "supplier.read", "customer.read", "notification.read", "reorder_alert.read"]'),
('user', 'Customer/Viewer - Browse products, create orders, view own data', '["product.read", "order.create", "order.read_own", "cart.*", "profile.*", "notification.read_own", "support.*"]');

-- 16.2 Insert default units
INSERT INTO units (code, name, type) VALUES
('PCS', 'Piece', 'quantity'),
('BOX', 'Box', 'quantity'),
('CTN', 'Carton', 'quantity'),
('PKT', 'Packet', 'quantity'),
('SET', 'Set', 'quantity'),
('PAL', 'Pallet', 'quantity'),
('KG', 'Kilogram', 'weight'),
('G', 'Gram', 'weight'),
('LB', 'Pound', 'weight'),
('L', 'Liter', 'volume'),
('ML', 'Milliliter', 'volume'),
('M', 'Meter', 'length'),
('CM', 'Centimeter', 'length'),
('M2', 'Square Meter', 'area');

-- 16.3 Insert document sequences
INSERT INTO document_sequences (document_type, prefix, current_number, number_length, reset_period) VALUES
('goods_receipt', 'GR-', 0, 6, 'yearly'),
('goods_issue', 'GI-', 0, 6, 'yearly'),
('stock_transfer', 'TR-', 0, 6, 'yearly'),
('stock_take', 'ST-', 0, 6, 'yearly'),
('customer_order', 'ORD-', 0, 6, 'yearly'),
('payment', 'PAY-', 0, 6, 'yearly'),
('support_ticket', 'TKT-', 0, 6, 'yearly'),
('product', 'PRD-', 0, 6, 'never'),
('supplier', 'SUP-', 0, 4, 'never'),
('customer', 'CUS-', 0, 4, 'never'),
('warehouse', 'WH-', 0, 3, 'never');

-- 16.4 Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
('company_name', 'StockFlow WMS', 'string', 'general', 'Company name'),
('default_currency', 'VND', 'string', 'general', 'Default currency code'),
('default_warehouse_id', '1', 'number', 'general', 'Default warehouse ID'),
('low_stock_alert_enabled', 'true', 'boolean', 'inventory', 'Enable low stock alerts'),
('auto_generate_barcode', 'true', 'boolean', 'product', 'Auto-generate barcode for new products'),
('session_timeout_minutes', '480', 'number', 'security', 'Session timeout in minutes'),
('password_min_length', '8', 'number', 'security', 'Minimum password length'),
('max_login_attempts', '5', 'number', 'security', 'Maximum failed login attempts before lockout'),
('lockout_duration_minutes', '30', 'number', 'security', 'Account lockout duration in minutes'),
('order_auto_confirm', 'false', 'boolean', 'order', 'Auto-confirm orders'),
('shipping_fee_default', '30000', 'number', 'order', 'Default shipping fee in VND');

-- 16.5 Insert order statuses
INSERT INTO order_statuses (code, name_vi, name_en, description, color, icon, sort_order, is_final, is_cancellable) VALUES
('pending', 'Chờ xác nhận', 'Pending', 'Đơn hàng mới, chờ Admin xác nhận', '#F59E0B', 'clock', 1, 0, 1),
('confirmed', 'Đã xác nhận', 'Confirmed', 'Admin đã xác nhận đơn hàng', '#3B82F6', 'check-circle', 2, 0, 1),
('processing', 'Đang xử lý', 'Processing', 'Đang chuẩn bị hàng tại kho', '#8B5CF6', 'cog', 3, 0, 1),
('ready_to_ship', 'Sẵn sàng giao', 'Ready to Ship', 'Hàng đã đóng gói, chờ giao', '#06B6D4', 'package', 4, 0, 1),
('shipping', 'Đang giao hàng', 'Shipping', 'Hàng đang được vận chuyển', '#10B981', 'truck', 5, 0, 0),
('delivered', 'Đã giao hàng', 'Delivered', 'Khách đã nhận hàng thành công', '#22C55E', 'check-badge', 6, 1, 0),
('cancelled', 'Đã hủy', 'Cancelled', 'Đơn hàng đã bị hủy', '#EF4444', 'x-circle', 99, 1, 0);

-- 16.6 Insert order status transitions
-- Admin có thể chuyển tất cả, Staff có thể chuyển processing -> ready_to_ship
INSERT INTO order_status_transitions (from_status_id, to_status_id, allowed_roles, requires_reason)
SELECT 
    (SELECT id FROM order_statuses WHERE code = 'pending'),
    (SELECT id FROM order_statuses WHERE code = 'confirmed'),
    '["admin"]', 0
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'pending'),
    (SELECT id FROM order_statuses WHERE code = 'cancelled'),
    '["admin"]', 1
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'confirmed'),
    (SELECT id FROM order_statuses WHERE code = 'processing'),
    '["admin", "staff"]', 0
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'confirmed'),
    (SELECT id FROM order_statuses WHERE code = 'cancelled'),
    '["admin"]', 1
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'processing'),
    (SELECT id FROM order_statuses WHERE code = 'ready_to_ship'),
    '["admin", "staff"]', 0
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'processing'),
    (SELECT id FROM order_statuses WHERE code = 'cancelled'),
    '["admin"]', 1
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'ready_to_ship'),
    (SELECT id FROM order_statuses WHERE code = 'shipping'),
    '["admin", "staff"]', 0
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'ready_to_ship'),
    (SELECT id FROM order_statuses WHERE code = 'cancelled'),
    '["admin"]', 1
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'shipping'),
    (SELECT id FROM order_statuses WHERE code = 'delivered'),
    '["admin"]', 0;

-- ============================================================
-- SECTION 17: VIEWS
-- ============================================================

-- 17.1 View: User orders for customers
CREATE OR REPLACE VIEW v_user_orders AS
SELECT 
    co.id, co.order_number, co.user_id,
    co.shipping_name, co.shipping_phone, co.shipping_address,
    co.order_date, co.expected_delivery_date,
    co.total_items, co.total_quantity, co.total_amount, co.currency,
    co.status_code,
    os.name_vi AS status_name_vi, os.name_en AS status_name_en,
    os.color AS status_color, os.icon AS status_icon,
    os.sort_order AS status_order, os.is_final AS status_is_final,
    co.payment_method, co.payment_status,
    co.shipping_method, co.carrier_name, co.tracking_number,
    co.confirmed_at, co.processing_at, co.shipped_at, co.delivered_at,
    co.cancelled_at, co.cancellation_reason, co.customer_notes,
    co.created_at, co.updated_at
FROM customer_orders co
JOIN order_statuses os ON co.status_id = os.id
WHERE co.deleted_at IS NULL;

-- 17.2 View: Admin orders with full details
CREATE OR REPLACE VIEW v_admin_orders AS
SELECT 
    co.*,
    os.name_vi AS status_name_vi, os.name_en AS status_name_en,
    os.color AS status_color, os.icon AS status_icon,
    os.sort_order AS status_order, os.is_final AS status_is_final, os.is_cancellable,
    u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone_account,
    w.name AS warehouse_name,
    confirmed_user.full_name AS confirmed_by_name,
    cancelled_user.full_name AS cancelled_by_name
FROM customer_orders co
JOIN order_statuses os ON co.status_id = os.id
JOIN users u ON co.user_id = u.id
LEFT JOIN warehouses w ON co.warehouse_id = w.id
LEFT JOIN users confirmed_user ON co.confirmed_by = confirmed_user.id
LEFT JOIN users cancelled_user ON co.cancelled_by = cancelled_user.id
WHERE co.deleted_at IS NULL;

-- 17.3 View: Available status transitions
CREATE OR REPLACE VIEW v_available_transitions AS
SELECT 
    ost.from_status_id, os_from.code AS from_status_code, os_from.name_vi AS from_status_name,
    ost.to_status_id, os_to.code AS to_status_code, os_to.name_vi AS to_status_name,
    os_to.color AS to_status_color, os_to.icon AS to_status_icon,
    ost.allowed_roles, ost.requires_reason
FROM order_status_transitions ost
JOIN order_statuses os_from ON ost.from_status_id = os_from.id
JOIN order_statuses os_to ON ost.to_status_id = os_to.id
WHERE ost.is_active = 1 AND os_from.is_active = 1 AND os_to.is_active = 1;

-- 17.4 View: Inventory summary by product
CREATE OR REPLACE VIEW v_inventory_summary AS
SELECT 
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    p.min_stock_level,
    p.reorder_point,
    COALESCE(SUM(i.quantity_on_hand), 0) AS total_on_hand,
    COALESCE(SUM(i.quantity_reserved), 0) AS total_reserved,
    COALESCE(SUM(i.quantity_available), 0) AS total_available,
    COALESCE(SUM(i.quantity_incoming), 0) AS total_incoming,
    COALESCE(SUM(i.total_value), 0) AS total_value,
    COUNT(DISTINCT i.warehouse_id) AS warehouse_count,
    CASE 
        WHEN COALESCE(SUM(i.quantity_on_hand), 0) <= p.min_stock_level THEN 'critical'
        WHEN COALESCE(SUM(i.quantity_on_hand), 0) <= p.reorder_point THEN 'low'
        ELSE 'normal'
    END AS stock_status
FROM products p
LEFT JOIN inventories i ON p.id = i.product_id
WHERE p.deleted_at IS NULL AND p.status = 'active'
GROUP BY p.id, p.sku, p.name, p.min_stock_level, p.reorder_point;

-- 17.5 View: Inventory by warehouse
CREATE OR REPLACE VIEW v_inventory_by_warehouse AS
SELECT 
    w.id AS warehouse_id,
    w.code AS warehouse_code,
    w.name AS warehouse_name,
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    c.name AS category_name,
    COALESCE(SUM(i.quantity_on_hand), 0) AS quantity_on_hand,
    COALESCE(SUM(i.quantity_reserved), 0) AS quantity_reserved,
    COALESCE(SUM(i.quantity_available), 0) AS quantity_available,
    COALESCE(SUM(i.total_value), 0) AS total_value
FROM warehouses w
CROSS JOIN products p
LEFT JOIN inventories i ON w.id = i.warehouse_id AND p.id = i.product_id
LEFT JOIN categories c ON p.category_id = c.id
WHERE w.deleted_at IS NULL AND w.status = 'active'
  AND p.deleted_at IS NULL AND p.status = 'active'
GROUP BY w.id, w.code, w.name, p.id, p.sku, p.name, c.name
HAVING quantity_on_hand > 0;

-- 17.6 View: Pending receipts for approval
CREATE OR REPLACE VIEW v_pending_receipts AS
SELECT 
    gr.id, gr.receipt_number, gr.receipt_type,
    gr.receipt_date, gr.expected_date,
    gr.total_items, gr.total_quantity, gr.total_amount,
    gr.status,
    s.name AS supplier_name,
    w.name AS warehouse_name,
    u.full_name AS created_by_name,
    gr.created_at
FROM goods_receipts gr
LEFT JOIN suppliers s ON gr.supplier_id = s.id
JOIN warehouses w ON gr.warehouse_id = w.id
LEFT JOIN users u ON gr.created_by = u.id
WHERE gr.status = 'pending' AND gr.deleted_at IS NULL
ORDER BY gr.created_at ASC;

-- 17.7 View: Pending issues for approval
CREATE OR REPLACE VIEW v_pending_issues AS
SELECT 
    gi.id, gi.issue_number, gi.issue_type,
    gi.issue_date, gi.required_date,
    gi.total_items, gi.total_quantity, gi.total_amount,
    gi.status, gi.priority,
    gi.customer_name,
    w.name AS warehouse_name,
    u.full_name AS created_by_name,
    gi.created_at
FROM goods_issues gi
JOIN warehouses w ON gi.warehouse_id = w.id
LEFT JOIN users u ON gi.created_by = u.id
WHERE gi.status = 'pending' AND gi.deleted_at IS NULL
ORDER BY 
    CASE gi.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'normal' THEN 3 
        WHEN 'low' THEN 4 
    END,
    gi.created_at ASC;

-- 17.8 View: Low stock alerts
CREATE OR REPLACE VIEW v_low_stock_products AS
SELECT 
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    p.min_stock_level,
    p.reorder_point,
    p.reorder_quantity AS suggested_reorder_qty,
    COALESCE(SUM(i.quantity_on_hand), 0) AS current_quantity,
    s.id AS supplier_id,
    s.name AS supplier_name,
    s.email AS supplier_email,
    s.phone AS supplier_phone
FROM products p
LEFT JOIN inventories i ON p.id = i.product_id
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE p.deleted_at IS NULL AND p.status = 'active'
GROUP BY p.id, p.sku, p.name, p.min_stock_level, p.reorder_point, 
         p.reorder_quantity, s.id, s.name, s.email, s.phone
HAVING current_quantity <= p.reorder_point;

-- 17.9 View: Daily/Monthly revenue report
CREATE OR REPLACE VIEW v_revenue_report AS
SELECT 
    DATE(co.order_date) AS order_date,
    YEAR(co.order_date) AS order_year,
    MONTH(co.order_date) AS order_month,
    WEEK(co.order_date) AS order_week,
    COUNT(co.id) AS total_orders,
    SUM(co.total_quantity) AS total_items_sold,
    SUM(co.subtotal) AS gross_revenue,
    SUM(co.discount_amount + co.coupon_discount) AS total_discounts,
    SUM(co.shipping_fee) AS total_shipping,
    SUM(co.total_amount) AS net_revenue,
    SUM(CASE WHEN co.payment_status = 'paid' THEN co.total_amount ELSE 0 END) AS paid_amount,
    SUM(CASE WHEN co.payment_status = 'pending' THEN co.total_amount ELSE 0 END) AS pending_amount
FROM customer_orders co
WHERE co.deleted_at IS NULL 
  AND co.status_code NOT IN ('cancelled')
GROUP BY DATE(co.order_date), YEAR(co.order_date), MONTH(co.order_date), WEEK(co.order_date);

-- 17.10 View: Goods receipt/issue report
CREATE OR REPLACE VIEW v_inbound_outbound_report AS
SELECT 
    'inbound' AS movement_type,
    DATE(gr.receipt_date) AS movement_date,
    YEAR(gr.receipt_date) AS movement_year,
    MONTH(gr.receipt_date) AS movement_month,
    COUNT(gr.id) AS total_documents,
    SUM(gr.total_quantity) AS total_quantity,
    SUM(gr.total_amount) AS total_amount
FROM goods_receipts gr
WHERE gr.status IN ('approved', 'completed') AND gr.deleted_at IS NULL
GROUP BY DATE(gr.receipt_date), YEAR(gr.receipt_date), MONTH(gr.receipt_date)
UNION ALL
SELECT 
    'outbound' AS movement_type,
    DATE(gi.issue_date) AS movement_date,
    YEAR(gi.issue_date) AS movement_year,
    MONTH(gi.issue_date) AS movement_month,
    COUNT(gi.id) AS total_documents,
    SUM(gi.total_quantity) AS total_quantity,
    SUM(gi.total_amount) AS total_amount
FROM goods_issues gi
WHERE gi.status IN ('approved', 'completed', 'shipped', 'delivered') AND gi.deleted_at IS NULL
GROUP BY DATE(gi.issue_date), YEAR(gi.issue_date), MONTH(gi.issue_date);

-- ============================================================
-- ADD FK CONSTRAINT FOR customer_order_id IN goods_issues
-- (After customer_orders table is created)
-- ============================================================
ALTER TABLE goods_issues
ADD CONSTRAINT fk_goods_issues_order FOREIGN KEY (customer_order_id) 
    REFERENCES customer_orders(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add FK for goods_issue_id in customer_orders
ALTER TABLE customer_orders
ADD CONSTRAINT fk_customer_orders_goods_issue FOREIGN KEY (goods_issue_id) 
    REFERENCES goods_issues(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- END OF STOCKFLOW WMS DATABASE SCHEMA
-- Version: 2.0.0
-- Total Tables: 37
-- ============================================================
