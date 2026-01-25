import { Request } from 'express';

// User types
export interface User {
    id: number;
    username: string;
    email: string;
    password_hash?: string;
    full_name: string;
    phone?: string;
    avatar_url?: string;
    status: 'active' | 'inactive' | 'suspended' | 'pending';
    email_verified_at?: Date;
    last_login_at?: Date;
    last_login_ip?: string;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
}

export interface Role {
    id: number;
    name: string;
    description?: string;
    permissions?: string[];
    is_active: boolean;
}

export interface UserWithRoles extends User {
    roles: Role[];
}

// Product types
export interface Product {
    id: number;
    sku: string;
    barcode?: string;
    name: string;
    description?: string;
    category_id?: number;
    unit_id?: number;
    brand?: string;
    model?: string;
    cost_price: number;
    selling_price: number;
    wholesale_price?: number;
    currency: string;
    tax_rate?: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    volume?: number;
    min_stock_level: number;
    max_stock_level?: number;
    reorder_point: number;
    reorder_quantity?: number;
    lead_time_days?: number;
    is_serialized: boolean;
    is_batch_tracked: boolean;
    has_expiry: boolean;
    shelf_life_days?: number;
    image_url?: string;
    images?: string[];
    status: 'active' | 'inactive' | 'discontinued' | 'draft';
    created_by?: number;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
}

export interface Category {
    id: number;
    parent_id?: number;
    code: string;
    name: string;
    description?: string;
    image_url?: string;
    level: number;
    path?: string;
    sort_order: number;
    is_active: boolean;
}

export interface Unit {
    id: number;
    code: string;
    name: string;
    type: 'quantity' | 'weight' | 'volume' | 'length' | 'area';
    base_unit_id?: number;
    conversion_factor?: number;
    is_active: boolean;
}

// Product Variant types (E-commerce model - flexible attributes)
export interface ProductVariant {
    id: number;
    product_id: number;
    sku: string;
    price: number;
    stock: number;
    image_url?: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    // Populated from variant_attribute_values
    attribute_values?: VariantAttributeValue[];
}

export interface ProductWithVariants extends Product {
    has_variants?: boolean;
    variants?: ProductVariant[];
    variant_count?: number;
    min_price?: number;
    max_price?: number;
    total_stock?: number;
    available_colors?: string;
}

// Flexible Attribute System Types
export interface Attribute {
    id: number;
    name: string;
    display_name: string;
    type: 'select' | 'color' | 'text';
    sort_order: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    values?: AttributeValue[];
}

export interface AttributeValue {
    id: number;
    attribute_id: number;
    value: string;
    display_value: string;
    color_code?: string;
    image_url?: string;
    sort_order: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    // Populated for display
    attribute_name?: string;
    attribute_display_name?: string;
}

export interface VariantAttributeValue {
    id: number;
    variant_id: number;
    attribute_value_id: number;
    // Populated for display
    attribute_id?: number;
    attribute_name?: string;
    attribute_display_name?: string;
    value?: string;
    display_value?: string;
    color_code?: string;
}

// DTOs for Attribute operations
export interface CreateAttributeDto {
    name: string;
    display_name: string;
    type?: 'select' | 'color' | 'text';
    sort_order?: number;
}

export interface CreateAttributeValueDto {
    attribute_id: number;
    value: string;
    display_value: string;
    color_code?: string;
    image_url?: string;
    sort_order?: number;
}

// DTOs for Product Variant operations (flexible)
export interface CreateProductVariantDto {
    product_id: number;
    sku: string;
    price: number;
    stock?: number;
    image_url?: string;
    attribute_value_ids?: number[]; // Array of attribute_value IDs
}

export interface UpdateProductVariantDto {
    sku?: string;
    price?: number;
    stock?: number;
    image_url?: string;
    is_active?: boolean;
    attribute_value_ids?: number[];
}

// DTO for generating variant combinations
export interface GenerateVariantsDto {
    product_id: number;
    attributes: {
        attribute_id: number;
        value_ids: number[];
    }[];
    base_price?: number;
    base_stock?: number;
}

export interface FindVariantDto {
    product_id: number;
    attribute_value_ids: number[];
}

// Warehouse types
export interface Warehouse {
    id: number;
    code: string;
    name: string;
    description?: string;
    address?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
    email?: string;
    manager_id?: number;
    capacity_volume?: number;
    capacity_weight?: number;
    status: 'active' | 'inactive' | 'maintenance';
    created_by?: number;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
}

export interface StorageLocation {
    id: number;
    warehouse_id: number;
    zone_id?: number;
    code: string;
    aisle?: string;
    rack?: string;
    level?: string;
    bin?: string;
    location_type: 'rack' | 'floor' | 'pallet' | 'shelf' | 'bin' | 'bulk';
    barcode?: string;
    max_weight?: number;
    max_volume?: number;
    is_occupied: boolean;
    is_active: boolean;
}

// Inventory types
export interface Inventory {
    id: number;
    product_id: number;
    warehouse_id: number;
    location_id?: number;
    quantity_on_hand: number;
    quantity_reserved: number;
    quantity_available: number;
    quantity_incoming: number;
    batch_number?: string;
    serial_number?: string;
    manufacturing_date?: Date;
    expiry_date?: Date;
    unit_cost?: number;
    total_value: number;
    status: 'available' | 'reserved' | 'damaged' | 'expired' | 'quarantine';
    last_count_date?: Date;
    last_movement_date?: Date;
    created_at: Date;
    updated_at: Date;
}

export interface InventoryLog {
    id: number;
    inventory_id?: number;
    product_id: number;
    warehouse_id: number;
    location_id?: number;
    movement_type: string;
    reference_type?: string;
    reference_id?: number;
    reference_number?: string;
    quantity_before: number;
    quantity_change: number;
    quantity_after: number;
    batch_number?: string;
    serial_number?: string;
    unit_cost?: number;
    total_cost?: number;
    reason?: string;
    notes?: string;
    performed_by?: number;
    performed_at: Date;
}

// Goods Receipt (Stock In)
export interface GoodsReceipt {
    id: number;
    receipt_number: string;
    receipt_type: 'purchase' | 'return' | 'transfer' | 'adjustment' | 'other';
    supplier_id?: number;
    source_warehouse_id?: number;
    purchase_order_number?: string;
    warehouse_id: number;
    receipt_date: Date;
    expected_date?: Date;
    total_items: number;
    total_quantity: number;
    subtotal: number;
    tax_amount: number;
    shipping_cost: number;
    discount_amount: number;
    total_amount: number;
    currency: string;
    status: 'draft' | 'pending' | 'partial' | 'completed' | 'cancelled';
    shipping_method?: string;
    tracking_number?: string;
    carrier_name?: string;
    notes?: string;
    internal_notes?: string;
    received_by?: number;
    approved_by?: number;
    approved_at?: Date;
    created_by?: number;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
}

export interface GoodsReceiptItem {
    id: number;
    goods_receipt_id: number;
    product_id: number;
    location_id?: number;
    quantity_expected: number;
    quantity_received: number;
    quantity_rejected: number;
    unit_id?: number;
    unit_cost: number;
    tax_rate: number;
    tax_amount: number;
    discount_percent: number;
    discount_amount: number;
    line_total: number;
    batch_number?: string;
    serial_numbers?: string[];
    manufacturing_date?: Date;
    expiry_date?: Date;
    quality_status: 'pending' | 'passed' | 'failed' | 'partial';
    quality_notes?: string;
    notes?: string;
}

// Goods Issue (Stock Out)
export interface GoodsIssue {
    id: number;
    issue_number: string;
    issue_type: 'sales' | 'transfer' | 'return_to_supplier' | 'damage' | 'adjustment' | 'other';
    warehouse_id: number;
    destination_warehouse_id?: number;
    customer_name?: string;
    customer_address?: string;
    customer_phone?: string;
    customer_email?: string;
    sales_order_number?: string;
    issue_date: Date;
    required_date?: Date;
    shipped_date?: Date;
    total_items: number;
    total_quantity: number;
    subtotal: number;
    tax_amount: number;
    shipping_cost: number;
    discount_amount: number;
    total_amount: number;
    currency: string;
    status: 'draft' | 'pending' | 'picking' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
    shipping_method?: string;
    tracking_number?: string;
    carrier_name?: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    notes?: string;
    internal_notes?: string;
    issued_by?: number;
    picked_by?: number;
    packed_by?: number;
    approved_by?: number;
    approved_at?: Date;
    created_by?: number;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
}

export interface GoodsIssueItem {
    id: number;
    goods_issue_id: number;
    product_id: number;
    location_id?: number;
    inventory_id?: number;
    quantity_requested: number;
    quantity_picked: number;
    quantity_shipped: number;
    unit_id?: number;
    unit_price: number;
    unit_cost: number;
    tax_rate: number;
    tax_amount: number;
    discount_percent: number;
    discount_amount: number;
    line_total: number;
    batch_number?: string;
    serial_numbers?: string[];
    expiry_date?: Date;
    pick_status: 'pending' | 'partial' | 'completed' | 'cancelled';
    notes?: string;
}

// Supplier
export interface Supplier {
    id: number;
    code: string;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    tax_id?: string;
    payment_terms?: number;
    credit_limit?: number;
    status: 'active' | 'inactive' | 'blacklisted';
    notes?: string;
    created_by?: number;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
}

// API Response types
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    pagination?: PaginationInfo;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: PaginationInfo;
}

// Auth types
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    user: UserWithRoles;
    token: string;
}

export interface JwtPayload {
    userId: number;
    username: string;
    roles: string[];
}

// Extended Express Request
export interface AuthRequest extends Request {
    user?: JwtPayload;
}

// Create/Update DTOs
export interface CreateUserDto {
    username: string;
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role_ids?: number[];
}

export interface UpdateUserDto {
    email?: string;
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    status?: 'active' | 'inactive' | 'suspended' | 'pending';
    role_ids?: number[];
}

export interface CreateProductDto {
    sku: string;
    barcode?: string;
    name: string;
    description?: string;
    category_id?: number;
    unit_id?: number;
    brand?: string;
    model?: string;
    cost_price: number;
    selling_price: number;
    wholesale_price?: number;
    min_stock_level?: number;
    max_stock_level?: number;
    reorder_point?: number;
    reorder_quantity?: number;
    is_serialized?: boolean;
    is_batch_tracked?: boolean;
    has_expiry?: boolean;
    shelf_life_days?: number;
    image_url?: string;
    status?: 'active' | 'inactive' | 'discontinued' | 'draft';
}

export interface UpdateProductDto extends Partial<CreateProductDto> { }

export interface CreateWarehouseDto {
    code: string;
    name: string;
    description?: string;
    address?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    country?: string;
    phone?: string;
    email?: string;
    manager_id?: number;
    capacity_volume?: number;
    capacity_weight?: number;
    status?: 'active' | 'inactive' | 'maintenance';
}

export interface UpdateWarehouseDto extends Partial<CreateWarehouseDto> { }

export interface CreateGoodsReceiptDto {
    receipt_type: 'purchase' | 'return' | 'transfer' | 'adjustment' | 'other';
    supplier_id?: number;
    source_warehouse_id?: number;
    purchase_order_number?: string;
    warehouse_id: number;
    receipt_date: string;
    expected_date?: string;
    shipping_method?: string;
    notes?: string;
    items: CreateGoodsReceiptItemDto[];
}

export interface CreateGoodsReceiptItemDto {
    product_id: number;
    location_id?: number;
    quantity_expected: number;
    unit_cost: number;
    batch_number?: string;
    manufacturing_date?: string;
    expiry_date?: string;
}

export interface CreateGoodsIssueDto {
    issue_type: 'sales' | 'transfer' | 'return_to_supplier' | 'damage' | 'adjustment' | 'other';
    warehouse_id: number;
    destination_warehouse_id?: number;
    customer_name?: string;
    customer_address?: string;
    customer_phone?: string;
    customer_email?: string;
    sales_order_number?: string;
    issue_date: string;
    required_date?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    notes?: string;
    items: CreateGoodsIssueItemDto[];
}

export interface CreateGoodsIssueItemDto {
    product_id: number;
    location_id?: number;
    quantity_requested: number;
    unit_price: number;
    batch_number?: string;
}

export interface InventoryAdjustmentDto {
    product_id: number;
    warehouse_id: number;
    location_id?: number;
    adjustment_type: 'in' | 'out';
    quantity: number;
    reason: string;
    notes?: string;
}

// Report types
export interface DashboardStats {
    totalProducts: number;
    totalWarehouses: number;
    totalInventoryValue: number;
    lowStockItems: number;
    pendingReceipts: number;
    pendingIssues: number;
    recentMovements: InventoryLog[];
}

export interface InventoryReport {
    product_id: number;
    product_name: string;
    sku: string;
    warehouse_name: string;
    quantity_on_hand: number;
    quantity_available: number;
    unit_cost: number;
    total_value: number;
}

export interface MovementReport {
    date: string;
    movement_type: string;
    product_name: string;
    warehouse_name: string;
    quantity_change: number;
    reference_number?: string;
    performed_by?: string;
}

// Stock Transfer types
export interface StockTransfer {
    id: number;
    transfer_number: string;
    transfer_type: 'IMPORT' | 'EXPORT' | 'TRANSFER';
    source_warehouse_id?: number;
    source_warehouse_name?: string;
    destination_warehouse_id?: number;
    destination_warehouse_name?: string;
    transfer_date: Date;
    expected_arrival_date?: Date;
    actual_arrival_date?: Date;
    total_items: number;
    total_quantity: number;
    total_value: number;
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'in_transit' | 'partial_received' | 'completed' | 'cancelled';
    shipping_method?: string;
    tracking_number?: string;
    carrier_name?: string;
    reason?: string;
    notes?: string;
    rejection_reason?: string;
    requested_by?: number;
    approved_by?: number;
    approved_by_name?: string;
    approved_at?: Date;
    rejected_by?: number;
    rejected_by_name?: string;
    rejected_at?: Date;
    created_by?: number;
    created_by_name?: string;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
}

export interface StockTransferItem {
    id: number;
    stock_transfer_id: number;
    product_id: number;
    product_name?: string;
    sku?: string;
    source_inventory_id?: number;
    destination_inventory_id?: number;
    quantity_requested: number;
    quantity_shipped: number;
    quantity_received: number;
    quantity_damaged: number;
    unit_id?: number;
    unit_cost: number;
    line_total: number;
    batch_number?: string;
    serial_numbers?: string[];
    expiry_date?: Date;
    status: 'pending' | 'shipped' | 'received' | 'partial' | 'cancelled';
    notes?: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateStockTransferDto {
    transfer_type?: 'IMPORT' | 'EXPORT' | 'TRANSFER';
    type?: 'IMPORT' | 'EXPORT' | 'TRANSFER'; // Alias cho transfer_type
    source_warehouse_id?: number;
    destination_warehouse_id?: number;
    transfer_date?: string;
    expected_arrival_date?: string;
    reason?: string;
    notes?: string;
    items: CreateStockTransferItemDto[];
}

export interface CreateStockTransferItemDto {
    // Có thể chọn product_id (sản phẩm có sẵn) HOẶC nhập thông tin mới
    product_id?: number;

    // NHẬP MỚI: Thông tin sản phẩm mới (cho phiếu nhập kho)  
    product_name?: string;
    product_sku?: string;
    product_image_url?: string;

    // Số lượng và giá
    quantity?: number;
    quantity_requested?: number;
    unit_price?: number;
    unit_cost?: number;

    // Thông tin bổ sung
    batch_number?: string;
    expiry_date?: string;
    notes?: string;
}


