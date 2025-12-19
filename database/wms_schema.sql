-- ============================================================
-- WAREHOUSE MANAGEMENT SYSTEM (WMS) DATABASE SCHEMA
-- MySQL 8.0+ | InnoDB | UTF8MB4
-- ============================================================

-- Drop database if exists and create new
DROP DATABASE IF EXISTS wms_db;
CREATE DATABASE wms_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE wms_db;

-- ============================================================
-- 1. USER MANAGEMENT & ROLE-BASED ACCESS CONTROL
-- ============================================================

-- Roles table
CREATE TABLE roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT 'Role name: admin, warehouse_manager, staff, viewer',
    description VARCHAR(255) NULL COMMENT 'Role description',
    permissions JSON NULL COMMENT 'JSON array of permission strings',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_roles_name (name),
    INDEX idx_roles_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System roles for access control';

-- Users table
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT 'Login username',
    email VARCHAR(100) NOT NULL UNIQUE COMMENT 'User email address',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    full_name VARCHAR(100) NOT NULL COMMENT 'Full name of user',
    phone VARCHAR(20) NULL COMMENT 'Phone number',
    avatar_url VARCHAR(500) NULL COMMENT 'Profile picture URL',
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

-- User-Role mapping (many-to-many)
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

-- Activity logs for audit trail
CREATE TABLE activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL COMMENT 'User who performed the action (NULL for system)',
    action VARCHAR(100) NOT NULL COMMENT 'Action type: login, logout, create, update, delete, etc.',
    entity_type VARCHAR(50) NULL COMMENT 'Entity type affected: user, product, inventory, etc.',
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
-- 2. WAREHOUSE MANAGEMENT
-- ============================================================

-- Warehouses table
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

-- Warehouse zones (areas within warehouse)
CREATE TABLE warehouse_zones (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT UNSIGNED NOT NULL,
    code VARCHAR(20) NOT NULL COMMENT 'Zone code: Z-A, Z-B, COLD-1',
    name VARCHAR(100) NOT NULL COMMENT 'Zone name: Zone A, Cold Storage',
    zone_type ENUM('general', 'cold', 'hazardous', 'high_value', 'quarantine', 'staging', 'shipping', 'receiving') NOT NULL DEFAULT 'general',
    description TEXT NULL,
    temperature_min DECIMAL(5,2) NULL COMMENT 'Min temperature in Celsius',
    temperature_max DECIMAL(5,2) NULL COMMENT 'Max temperature in Celsius',
    humidity_min DECIMAL(5,2) NULL COMMENT 'Min humidity percentage',
    humidity_max DECIMAL(5,2) NULL COMMENT 'Max humidity percentage',
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

-- Storage locations (rack, level, bin)
CREATE TABLE storage_locations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT UNSIGNED NOT NULL,
    zone_id INT UNSIGNED NULL COMMENT 'Optional zone reference',
    code VARCHAR(50) NOT NULL COMMENT 'Location code: A-01-02-03 (Aisle-Rack-Level-Bin)',
    aisle VARCHAR(10) NULL COMMENT 'Aisle identifier',
    rack VARCHAR(10) NULL COMMENT 'Rack number',
    level VARCHAR(10) NULL COMMENT 'Shelf level',
    bin VARCHAR(10) NULL COMMENT 'Bin/slot position',
    location_type ENUM('rack', 'floor', 'pallet', 'shelf', 'bin', 'bulk') NOT NULL DEFAULT 'rack',
    barcode VARCHAR(100) NULL UNIQUE COMMENT 'Location barcode for scanning',
    max_weight DECIMAL(10,2) NULL COMMENT 'Maximum weight capacity in kg',
    max_volume DECIMAL(10,2) NULL COMMENT 'Maximum volume in cubic meters',
    width DECIMAL(10,2) NULL COMMENT 'Width in cm',
    height DECIMAL(10,2) NULL COMMENT 'Height in cm',
    depth DECIMAL(10,2) NULL COMMENT 'Depth in cm',
    is_occupied TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Currently occupied flag',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_warehouse_location_code (warehouse_id, code),
    INDEX idx_storage_locations_warehouse_id (warehouse_id),
    INDEX idx_storage_locations_zone_id (zone_id),
    INDEX idx_storage_locations_barcode (barcode),
    INDEX idx_storage_locations_type (location_type),
    INDEX idx_storage_locations_occupied (is_occupied),
    
    CONSTRAINT fk_storage_locations_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_storage_locations_zone FOREIGN KEY (zone_id) 
        REFERENCES warehouse_zones(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Storage locations within warehouses (rack/shelf/bin)';

-- ============================================================
-- 3. PRODUCT & CATEGORY MANAGEMENT
-- ============================================================

-- Categories (hierarchical with parent-child support)
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

-- Unit of measurements
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

-- Products table
CREATE TABLE products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE COMMENT 'Stock Keeping Unit',
    barcode VARCHAR(50) NULL UNIQUE COMMENT 'Product barcode (EAN/UPC)',
    name VARCHAR(255) NOT NULL COMMENT 'Product name',
    description TEXT NULL,
    category_id INT UNSIGNED NULL,
    unit_id INT UNSIGNED NULL COMMENT 'Primary unit of measurement',
    brand VARCHAR(100) NULL,
    model VARCHAR(100) NULL,
    
    -- Pricing
    cost_price DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Cost/purchase price',
    selling_price DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Selling price',
    wholesale_price DECIMAL(15,2) NULL COMMENT 'Wholesale price',
    currency VARCHAR(3) NOT NULL DEFAULT 'VND' COMMENT 'Currency code',
    tax_rate DECIMAL(5,2) NULL DEFAULT 0.00 COMMENT 'Tax percentage',
    
    -- Physical attributes
    weight DECIMAL(10,3) NULL COMMENT 'Weight in kg',
    length DECIMAL(10,2) NULL COMMENT 'Length in cm',
    width DECIMAL(10,2) NULL COMMENT 'Width in cm',
    height DECIMAL(10,2) NULL COMMENT 'Height in cm',
    volume DECIMAL(10,4) NULL COMMENT 'Volume in cubic meters',
    
    -- Inventory settings
    min_stock_level INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Minimum stock before reorder alert',
    max_stock_level INT UNSIGNED NULL COMMENT 'Maximum stock level',
    reorder_point INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Quantity at which to reorder',
    reorder_quantity INT UNSIGNED NULL COMMENT 'Suggested reorder quantity',
    lead_time_days INT UNSIGNED NULL COMMENT 'Supplier lead time in days',
    
    -- Tracking
    is_serialized TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Requires serial number tracking',
    is_batch_tracked TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Requires batch/lot tracking',
    has_expiry TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Has expiration date',
    shelf_life_days INT UNSIGNED NULL COMMENT 'Shelf life in days',
    
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
    INDEX idx_products_status (status),
    INDEX idx_products_deleted_at (deleted_at),
    FULLTEXT INDEX ft_products_name_desc (name, description),
    
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) 
        REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_products_unit FOREIGN KEY (unit_id) 
        REFERENCES units(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Product master data';

-- ============================================================
-- 4. INVENTORY TRACKING
-- ============================================================

-- Current inventory levels
CREATE TABLE inventories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    warehouse_id INT UNSIGNED NOT NULL,
    location_id INT UNSIGNED NULL COMMENT 'Specific storage location',
    
    -- Quantities
    quantity_on_hand INT NOT NULL DEFAULT 0 COMMENT 'Current physical quantity',
    quantity_reserved INT NOT NULL DEFAULT 0 COMMENT 'Reserved for orders',
    quantity_available INT GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED COMMENT 'Available for sale',
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
    INDEX idx_inventories_batch_number (batch_number),
    
    CONSTRAINT fk_inventories_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_inventories_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_inventories_location FOREIGN KEY (location_id) 
        REFERENCES storage_locations(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Current inventory levels by product, warehouse, and location';

-- Inventory movement logs
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
    
    -- Reference
    reference_type VARCHAR(50) NULL COMMENT 'Source document type: goods_receipt, goods_issue, transfer, etc.',
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
    INDEX idx_inventory_logs_created_at (created_at),
    
    CONSTRAINT fk_inventory_logs_inventory FOREIGN KEY (inventory_id) 
        REFERENCES inventories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_inventory_logs_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_inventory_logs_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_inventory_logs_location FOREIGN KEY (location_id) 
        REFERENCES storage_locations(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_inventory_logs_performed_by FOREIGN KEY (performed_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Inventory movement history and audit trail';

-- Reorder alerts/levels
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
    INDEX idx_reorder_alerts_triggered_at (triggered_at),
    
    CONSTRAINT fk_reorder_alerts_product FOREIGN KEY (product_id) 
        REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_reorder_alerts_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_reorder_alerts_handled_by FOREIGN KEY (handled_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Reorder point alerts for inventory replenishment';

-- ============================================================
-- 5. INBOUND (GOODS RECEIPT)
-- ============================================================

-- Suppliers
CREATE TABLE suppliers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE COMMENT 'Supplier code',
    name VARCHAR(255) NOT NULL COMMENT 'Supplier/company name',
    contact_person VARCHAR(100) NULL,
    email VARCHAR(100) NULL,
    phone VARCHAR(20) NULL,
    fax VARCHAR(20) NULL,
    website VARCHAR(255) NULL,
    
    -- Address
    address VARCHAR(500) NULL,
    city VARCHAR(100) NULL,
    state_province VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    country VARCHAR(100) NULL DEFAULT 'Vietnam',
    
    -- Business info
    tax_id VARCHAR(50) NULL COMMENT 'Tax identification number',
    payment_terms INT NULL COMMENT 'Payment terms in days',
    credit_limit DECIMAL(15,2) NULL,
    
    -- Banking
    bank_name VARCHAR(100) NULL,
    bank_account VARCHAR(50) NULL,
    bank_branch VARCHAR(100) NULL,
    
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

-- Goods receipt header (inbound)
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
    
    -- Status workflow
    status ENUM('draft', 'pending', 'partial', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    
    -- Shipping info
    shipping_method VARCHAR(100) NULL,
    tracking_number VARCHAR(100) NULL,
    carrier_name VARCHAR(100) NULL,
    
    notes TEXT NULL,
    internal_notes TEXT NULL COMMENT 'Internal notes not visible to supplier',
    
    -- Audit
    received_by INT UNSIGNED NULL COMMENT 'User who received the goods',
    approved_by INT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    created_by INT UNSIGNED NULL,
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
    CONSTRAINT fk_goods_receipts_received_by FOREIGN KEY (received_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_receipts_approved_by FOREIGN KEY (approved_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_receipts_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Goods receipt/inbound header';

-- Goods receipt line items
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
-- 6. OUTBOUND (GOODS ISSUE)
-- ============================================================

-- Goods issue header (outbound)
CREATE TABLE goods_issues (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    issue_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'GI number: GI-2024-000001',
    issue_type ENUM('sales', 'transfer', 'return_to_supplier', 'damage', 'adjustment', 'other') NOT NULL DEFAULT 'sales',
    
    -- Source
    warehouse_id INT UNSIGNED NOT NULL COMMENT 'Issuing warehouse',
    
    -- Destination
    destination_warehouse_id INT UNSIGNED NULL COMMENT 'Destination for transfers',
    customer_name VARCHAR(255) NULL COMMENT 'Customer name for sales',
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
    
    -- Status workflow
    status ENUM('draft', 'pending', 'picking', 'packed', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'draft',
    
    -- Shipping info
    shipping_method VARCHAR(100) NULL,
    tracking_number VARCHAR(100) NULL,
    carrier_name VARCHAR(100) NULL,
    
    -- Priority
    priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    
    notes TEXT NULL,
    internal_notes TEXT NULL,
    
    -- Audit
    issued_by INT UNSIGNED NULL COMMENT 'User who issued the goods',
    picked_by INT UNSIGNED NULL COMMENT 'User who picked the items',
    packed_by INT UNSIGNED NULL COMMENT 'User who packed the items',
    approved_by INT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_goods_issues_number (issue_number),
    INDEX idx_goods_issues_warehouse_id (warehouse_id),
    INDEX idx_goods_issues_issue_date (issue_date),
    INDEX idx_goods_issues_status (status),
    INDEX idx_goods_issues_priority (priority),
    INDEX idx_goods_issues_deleted_at (deleted_at),
    
    CONSTRAINT fk_goods_issues_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_dest_warehouse FOREIGN KEY (destination_warehouse_id) 
        REFERENCES warehouses(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_issued_by FOREIGN KEY (issued_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_picked_by FOREIGN KEY (picked_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_packed_by FOREIGN KEY (packed_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_approved_by FOREIGN KEY (approved_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_goods_issues_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Goods issue/outbound header';

-- Goods issue line items
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
-- 7. STOCK TRANSFER
-- ============================================================

-- Stock transfer header
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
    status ENUM('draft', 'pending_approval', 'approved', 'in_transit', 'partial_received', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    
    -- Shipping
    shipping_method VARCHAR(100) NULL,
    tracking_number VARCHAR(100) NULL,
    carrier_name VARCHAR(100) NULL,
    
    reason VARCHAR(255) NULL COMMENT 'Reason for transfer',
    notes TEXT NULL,
    
    -- Audit
    requested_by INT UNSIGNED NULL,
    approved_by INT UNSIGNED NULL,
    approved_at TIMESTAMP NULL,
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
    CONSTRAINT fk_stock_transfers_shipped_by FOREIGN KEY (shipped_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfers_received_by FOREIGN KEY (received_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_transfers_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stock transfer between warehouses or locations';

-- Stock transfer line items
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
-- 8. STOCK TAKING (INVENTORY COUNT)
-- ============================================================

-- Stock take header
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
    
    -- Scope filter (optional)
    category_ids JSON NULL COMMENT 'Limit to specific categories',
    product_ids JSON NULL COMMENT 'Limit to specific products',
    location_ids JSON NULL COMMENT 'Limit to specific locations',
    
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
    team_members JSON NULL COMMENT 'Array of user IDs in the team',
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
    INDEX idx_stock_takes_deleted_at (deleted_at),
    
    CONSTRAINT fk_stock_takes_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_takes_zone FOREIGN KEY (zone_id) 
        REFERENCES warehouse_zones(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_takes_assigned_to FOREIGN KEY (assigned_to) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_takes_started_by FOREIGN KEY (started_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_takes_completed_by FOREIGN KEY (completed_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_takes_reviewed_by FOREIGN KEY (reviewed_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_takes_approved_by FOREIGN KEY (approved_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_stock_takes_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stock take/inventory count header';

-- Stock take line items
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
    expiry_date DATE NULL,
    
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
    adjustment_reference VARCHAR(50) NULL COMMENT 'Reference to adjustment document',
    
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_stock_take_items_take_id (stock_take_id),
    INDEX idx_stock_take_items_product_id (product_id),
    INDEX idx_stock_take_items_location_id (location_id),
    INDEX idx_stock_take_items_inventory_id (inventory_id),
    INDEX idx_stock_take_items_status (status),
    INDEX idx_stock_take_items_variance (variance_quantity),
    
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
-- 9. ADDITIONAL SUPPORT TABLES
-- ============================================================

-- System settings/configurations
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

-- Document number sequences
CREATE TABLE document_sequences (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_type VARCHAR(50) NOT NULL UNIQUE COMMENT 'GR, GI, TR, ST, etc.',
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

-- User sessions (for token-based auth)
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

-- ============================================================
-- DEFAULT DATA INSERTS
-- ============================================================

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'System Administrator with full access', '["*"]'),
('warehouse_manager', 'Warehouse Manager with warehouse operations access', '["warehouse.*", "inventory.*", "product.read", "report.*"]'),
('staff', 'Warehouse Staff with limited operations access', '["inventory.read", "inventory.update", "product.read", "goods_receipt.*", "goods_issue.*"]'),
('viewer', 'Read-only access to reports and data', '["*.read", "report.*"]');

-- Insert default units
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

-- Insert document sequences
INSERT INTO document_sequences (document_type, prefix, current_number, number_length, reset_period) VALUES
('goods_receipt', 'GR-', 0, 6, 'yearly'),
('goods_issue', 'GI-', 0, 6, 'yearly'),
('stock_transfer', 'TR-', 0, 6, 'yearly'),
('stock_take', 'ST-', 0, 6, 'yearly'),
('product', 'PRD-', 0, 6, 'never'),
('supplier', 'SUP-', 0, 4, 'never'),
('warehouse', 'WH-', 0, 3, 'never');

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
('company_name', 'WMS Company', 'string', 'general', 'Company name'),
('default_currency', 'VND', 'string', 'general', 'Default currency code'),
('low_stock_alert_enabled', 'true', 'boolean', 'inventory', 'Enable low stock alerts'),
('auto_generate_barcode', 'true', 'boolean', 'product', 'Auto-generate barcode for new products'),
('session_timeout_minutes', '480', 'number', 'security', 'Session timeout in minutes'),
('password_min_length', '8', 'number', 'security', 'Minimum password length'),
('max_login_attempts', '5', 'number', 'security', 'Maximum failed login attempts before lockout'),
('lockout_duration_minutes', '30', 'number', 'security', 'Account lockout duration in minutes');

-- ============================================================
-- 10. ORDER STATUS MANAGEMENT (CUSTOMER ORDERS)
-- ============================================================
-- Quy tắc:
-- - Admin: Được cập nhật trạng thái (chỉ tiến, không lùi, có thể nhảy đến cancelled)
-- - Staff: Không được chỉnh sửa trạng thái
-- - User: Chỉ được xem trạng thái đơn hàng

-- Bảng định nghĩa các trạng thái đơn hàng
CREATE TABLE order_statuses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã trạng thái: pending, confirmed, processing...',
    name_vi VARCHAR(100) NOT NULL COMMENT 'Tên hiển thị tiếng Việt',
    name_en VARCHAR(100) NOT NULL COMMENT 'Tên hiển thị tiếng Anh',
    description TEXT NULL COMMENT 'Mô tả chi tiết',
    color VARCHAR(20) NOT NULL DEFAULT '#6B7280' COMMENT 'Màu hiển thị hex code',
    icon VARCHAR(50) NULL COMMENT 'Tên icon hiển thị',
    sort_order INT UNSIGNED NOT NULL COMMENT 'Thứ tự trạng thái (dùng để kiểm tra tiến/lùi)',
    is_final TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Trạng thái kết thúc (không chuyển được nữa)',
    is_cancellable TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Có thể hủy từ trạng thái này không',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_order_statuses_code (code),
    INDEX idx_order_statuses_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Định nghĩa các trạng thái đơn hàng';

-- Bảng đơn hàng của khách hàng (User đặt hàng)
CREATE TABLE customer_orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã đơn hàng: ORD-2024-000001',
    
    -- Thông tin khách hàng (User)
    user_id INT UNSIGNED NOT NULL COMMENT 'User đặt hàng',
    
    -- Thông tin giao hàng
    shipping_name VARCHAR(255) NOT NULL COMMENT 'Tên người nhận',
    shipping_phone VARCHAR(20) NOT NULL COMMENT 'SĐT người nhận',
    shipping_email VARCHAR(100) NULL,
    shipping_address TEXT NOT NULL COMMENT 'Địa chỉ giao hàng',
    shipping_city VARCHAR(100) NULL,
    shipping_district VARCHAR(100) NULL,
    shipping_ward VARCHAR(100) NULL,
    shipping_postal_code VARCHAR(20) NULL,
    
    -- Thời gian
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Ngày đặt hàng',
    confirmed_at TIMESTAMP NULL COMMENT 'Ngày xác nhận',
    processing_at TIMESTAMP NULL COMMENT 'Ngày bắt đầu xử lý',
    shipped_at TIMESTAMP NULL COMMENT 'Ngày giao cho vận chuyển',
    delivered_at TIMESTAMP NULL COMMENT 'Ngày giao thành công',
    cancelled_at TIMESTAMP NULL COMMENT 'Ngày hủy',
    expected_delivery_date DATE NULL COMMENT 'Ngày giao dự kiến',
    
    -- Tổng tiền
    total_items INT UNSIGNED NOT NULL DEFAULT 0,
    total_quantity INT NOT NULL DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    shipping_fee DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    
    -- Trạng thái
    status_id INT UNSIGNED NOT NULL COMMENT 'FK đến order_statuses',
    status_code VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT 'Mã trạng thái hiện tại',
    
    -- Kho xử lý
    warehouse_id INT UNSIGNED NULL COMMENT 'Kho xử lý đơn hàng',
    goods_issue_id INT UNSIGNED NULL COMMENT 'Liên kết với phiếu xuất kho',
    
    -- Vận chuyển
    shipping_method VARCHAR(100) NULL,
    carrier_name VARCHAR(100) NULL,
    tracking_number VARCHAR(100) NULL,
    
    -- Thanh toán
    payment_method VARCHAR(50) NULL COMMENT 'cod, bank_transfer, credit_card...',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP NULL,
    
    -- Ghi chú
    customer_notes TEXT NULL COMMENT 'Ghi chú từ khách hàng',
    internal_notes TEXT NULL COMMENT 'Ghi chú nội bộ',
    cancellation_reason TEXT NULL COMMENT 'Lý do hủy đơn',
    
    -- Audit
    confirmed_by INT UNSIGNED NULL COMMENT 'Admin xác nhận',
    processed_by INT UNSIGNED NULL COMMENT 'Admin/Staff xử lý',
    shipped_by INT UNSIGNED NULL COMMENT 'Người giao hàng',
    cancelled_by INT UNSIGNED NULL COMMENT 'Người hủy đơn',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_customer_orders_number (order_number),
    INDEX idx_customer_orders_user_id (user_id),
    INDEX idx_customer_orders_status (status_id, status_code),
    INDEX idx_customer_orders_order_date (order_date),
    INDEX idx_customer_orders_warehouse_id (warehouse_id),
    INDEX idx_customer_orders_payment_status (payment_status),
    INDEX idx_customer_orders_deleted_at (deleted_at),
    
    CONSTRAINT fk_customer_orders_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_customer_orders_status FOREIGN KEY (status_id) 
        REFERENCES order_statuses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_customer_orders_warehouse FOREIGN KEY (warehouse_id) 
        REFERENCES warehouses(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_orders_goods_issue FOREIGN KEY (goods_issue_id) 
        REFERENCES goods_issues(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_orders_confirmed_by FOREIGN KEY (confirmed_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_orders_processed_by FOREIGN KEY (processed_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_orders_cancelled_by FOREIGN KEY (cancelled_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Đơn hàng của khách hàng (User)';

-- Chi tiết đơn hàng
CREATE TABLE customer_order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    
    quantity INT NOT NULL DEFAULT 0,
    unit_id INT UNSIGNED NULL,
    
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
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

-- Lịch sử thay đổi trạng thái đơn hàng
CREATE TABLE order_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    
    from_status_id INT UNSIGNED NULL COMMENT 'Trạng thái trước (NULL nếu là đầu)',
    from_status_code VARCHAR(50) NULL,
    to_status_id INT UNSIGNED NOT NULL COMMENT 'Trạng thái sau',
    to_status_code VARCHAR(50) NOT NULL,
    
    reason TEXT NULL COMMENT 'Lý do thay đổi',
    notes TEXT NULL,
    
    changed_by INT UNSIGNED NOT NULL COMMENT 'Admin thay đổi',
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

-- Quy tắc chuyển trạng thái (chỉ Admin mới được chuyển)
CREATE TABLE order_status_transitions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    from_status_id INT UNSIGNED NOT NULL COMMENT 'Trạng thái nguồn',
    to_status_id INT UNSIGNED NOT NULL COMMENT 'Trạng thái đích',
    allowed_roles JSON NOT NULL COMMENT 'Danh sách role được phép: ["admin"]',
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
COMMENT='Quy tắc chuyển đổi trạng thái';

-- Insert trạng thái đơn hàng mặc định
INSERT INTO order_statuses (code, name_vi, name_en, description, color, icon, sort_order, is_final, is_cancellable) VALUES
('pending', 'Chờ xác nhận', 'Pending', 'Đơn hàng mới, chờ Admin xác nhận', '#F59E0B', 'clock', 1, 0, 1),
('confirmed', 'Đã xác nhận', 'Confirmed', 'Admin đã xác nhận đơn hàng', '#3B82F6', 'check-circle', 2, 0, 1),
('processing', 'Đang xử lý', 'Processing', 'Đang chuẩn bị hàng tại kho', '#8B5CF6', 'cog', 3, 0, 1),
('ready_to_ship', 'Sẵn sàng giao', 'Ready to Ship', 'Hàng đã đóng gói, chờ giao', '#06B6D4', 'package', 4, 0, 1),
('shipping', 'Đang giao hàng', 'Shipping', 'Hàng đang được vận chuyển', '#10B981', 'truck', 5, 0, 0),
('delivered', 'Đã giao hàng', 'Delivered', 'Khách đã nhận hàng thành công', '#22C55E', 'check-badge', 6, 1, 0),
('cancelled', 'Đã hủy', 'Cancelled', 'Đơn hàng đã bị hủy', '#EF4444', 'x-circle', 99, 1, 0);

-- Insert quy tắc chuyển trạng thái (chỉ Admin, chỉ tiến không lùi, có thể nhảy đến cancelled)
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
    '["admin"]', 0
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'confirmed'),
    (SELECT id FROM order_statuses WHERE code = 'cancelled'),
    '["admin"]', 1
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'processing'),
    (SELECT id FROM order_statuses WHERE code = 'ready_to_ship'),
    '["admin"]', 0
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'processing'),
    (SELECT id FROM order_statuses WHERE code = 'cancelled'),
    '["admin"]', 1
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'ready_to_ship'),
    (SELECT id FROM order_statuses WHERE code = 'shipping'),
    '["admin"]', 0
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'ready_to_ship'),
    (SELECT id FROM order_statuses WHERE code = 'cancelled'),
    '["admin"]', 1
UNION ALL SELECT 
    (SELECT id FROM order_statuses WHERE code = 'shipping'),
    (SELECT id FROM order_statuses WHERE code = 'delivered'),
    '["admin"]', 0;

-- Insert document sequence cho đơn hàng
INSERT INTO document_sequences (document_type, prefix, current_number, number_length, reset_period) VALUES
('customer_order', 'ORD-', 0, 6, 'yearly');

-- ============================================================
-- 11. VIEWS FOR ORDER STATUS
-- ============================================================
-- Lưu ý: Stored Procedure và Function được xử lý ở phía Backend (Node.js)
-- để tương thích với phpMyAdmin import

-- View cho User xem đơn hàng của mình
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

-- View cho Admin xem tất cả đơn hàng
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

-- View các trạng thái có thể chuyển đến
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

-- ============================================================
-- END OF SCHEMA
-- ============================================================
