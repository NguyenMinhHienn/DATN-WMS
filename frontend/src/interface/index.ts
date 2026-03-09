// User types
export interface User {
    id: number;
    username: string;
    email: string;
    full_name: string;
    phone?: string;
    avatar_url?: string;
    status: 'active' | 'inactive' | 'suspended' | 'pending';
    created_at: string;
    updated_at: string;
    roles: Role[];
}

export interface Role {
    id: number;
    name: string;
    description?: string;
    permissions?: string[];
}

// Product types
export interface Product {
    id: number;
    sku: string;
    barcode?: string;
    name: string;
    description?: string;
    category_id?: number;
    category_name?: string;
    unit_id?: number;
    unit_name?: string;
    brand?: string;
    model?: string;
    cost_price: number;
    selling_price: number;
    wholesale_price?: number;
    min_stock_level: number;
    max_stock_level?: number;
    reorder_point: number;
    is_serialized: boolean;
    is_batch_tracked: boolean;
    has_expiry: boolean;
    image_url?: string;
    status: 'active' | 'inactive' | 'discontinued' | 'draft';
    created_at: string;
    updated_at: string;
}

export interface Category {
    id: number;
    parent_id?: number;
    code: string;
    name: string;
    description?: string;
    variant_types?: string[] | null; // ["color", "size", "storage", ...]
    is_active: boolean;
}

export interface Unit {
    id: number;
    code: string;
    name: string;
    type: string;
}

// ==================== Flexible Attribute System ====================

export interface Attribute {
    id: number;
    name: string;
    display_name: string;
    type: 'select' | 'color' | 'text';
    sort_order: number;
    is_active: boolean;
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
    // Populated for display
    attribute_name?: string;
    attribute_display_name?: string;
}

export interface VariantAttributeValue {
    id: number;
    variant_id: number;
    attribute_value_id: number;
    // Populated
    attribute_id?: number;
    attribute_name?: string;
    attribute_display_name?: string;
    value?: string;
    display_value?: string;
    color_code?: string;
}

// Product Variant types (Flexible E-commerce model)
export interface ProductVariant {
    id: number;
    product_id: number;
    sku: string;
    price: number;
    average_cost?: number;
    stock: number;
    image_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Populated attribute values (new flexible system)
    attribute_values?: VariantAttributeValue[];
    // Legacy properties for backward compatibility
    color?: string | null;
    size?: string | null;
    storage?: string | null;
    ram?: string | null;
    material?: string | null;
    capacity?: string | null;
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

// DTO for generating variants
export interface GenerateVariantsDto {
    attributes: {
        attribute_id: number;
        value_ids: number[];
    }[];
    base_price?: number;
    base_stock?: number;
}

export interface ProductVariantFormData {
    sku: string;
    price: number;
    stock: number;
    image_url?: string;
    attribute_value_ids?: number[];
    // Legacy properties for backward compatibility
    color?: string;
    size?: string;
    storage?: string;
    ram?: string;
    material?: string;
    capacity?: string;
}

// Legacy config - kept for backward compatibility but data now comes from API
export type VariantTypeKey = 'color' | 'size' | 'storage' | 'ram' | 'material' | 'capacity';

export interface VariantTypeConfig {
    key: VariantTypeKey;
    label: string;
    options: { value: string; label: string; hex?: string }[];
}

export const VARIANT_TYPES_CONFIG: VariantTypeConfig[] = [
    {
        key: 'color',
        label: 'Màu sắc',
        options: [
            { value: 'black', label: 'Đen', hex: '#000000' },
            { value: 'white', label: 'Trắng', hex: '#FFFFFF' },
            { value: 'red', label: 'Đỏ', hex: '#EF4444' },
            { value: 'blue', label: 'Xanh dương', hex: '#3B82F6' },
            { value: 'green', label: 'Xanh lá', hex: '#22C55E' },
            { value: 'gray', label: 'Xám', hex: '#6B7280' },
        ]
    },
];

// Warehouse types
export interface Warehouse {
    id: number;
    code: string;
    name: string;
    description?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    manager_id?: number;
    manager_name?: string;
    status: 'active' | 'inactive' | 'maintenance';
    created_at: string;
}

export interface StorageLocation {
    id: number;
    warehouse_id: number;
    code: string;
    location_type: string;
    is_occupied: boolean;
    is_active: boolean;
}

// Inventory types
export interface Inventory {
    id: number;
    product_id: number;
    product_name: string;
    sku: string;
    warehouse_id: number;
    warehouse_name: string;
    location_id?: number;
    location_code?: string;
    quantity_on_hand: number;
    quantity_reserved: number;
    quantity_available: number;
    batch_number?: string;
    expiry_date?: string;
    unit_cost?: number;
    total_value?: number;
    status: string;
}

export interface InventoryLog {
    id: number;
    product_id: number;
    product_name: string;
    warehouse_id: number;
    warehouse_name: string;
    movement_type: string;
    quantity_before: number;
    quantity_change: number;
    quantity_after: number;
    reference_number?: string;
    reason?: string;
    performed_by?: number;
    performed_by_name?: string;
    created_at: string;
}

// Goods Receipt (Stock In)
export interface GoodsReceipt {
    id: number;
    receipt_number: string;
    receipt_type: string;
    supplier_id?: number;
    supplier_name?: string;
    warehouse_id: number;
    warehouse_name: string;
    receipt_date: string;
    total_items: number;
    total_quantity: number;
    total_amount: number;
    status: string;
    notes?: string;
    created_by_name?: string;
    created_at: string;
    items?: GoodsReceiptItem[];
}

export interface GoodsReceiptItem {
    id: number;
    goods_receipt_id: number;
    product_id: number;
    product_name: string;
    sku: string;
    quantity_expected: number;
    quantity_received: number;
    unit_cost: number;
    batch_number?: string;
    expiry_date?: string;
}

// Goods Issue (Stock Out)
export interface GoodsIssue {
    id: number;
    issue_number: string;
    issue_type: string;
    warehouse_id: number;
    warehouse_name: string;
    customer_name?: string;
    customer_phone?: string;
    issue_date: string;
    total_items: number;
    total_quantity: number;
    total_amount: number;
    status: string;
    priority: string;
    notes?: string;
    created_by_name?: string;
    created_at: string;
    items?: GoodsIssueItem[];
}

export interface GoodsIssueItem {
    id: number;
    goods_issue_id: number;
    product_id: number;
    product_name: string;
    sku: string;
    quantity_requested: number;
    quantity_picked: number;
    quantity_shipped: number;
    unit_price: number;
    pick_status: string;
}

// Reports
export interface DashboardStats {
    totalProducts: number;
    totalWarehouses: number;
    totalInventoryValue: number;
    lowStockItems: number;
    pendingReceipts: number;
    pendingIssues: number;
    pendingOrders: number;
    recentMovements: InventoryLog[];
}

export interface SalesSummary {
    total_orders: number;
    total_revenue: number;
    total_cost: number;
    total_profit: number;
}

export interface MonthlyReportItem {
    month: number;
    revenue: number;
    cost: number;
    profit: number;
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

// Auth types
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    user: User;
    token: string;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
    refreshUser?: () => Promise<void>;
}

// Form types
export interface ProductFormData {
    sku: string;
    barcode?: string;
    name: string;
    description?: string;
    category_id?: number;
    unit_id?: number;
    brand?: string;
    cost_price: number;
    selling_price: number;
    min_stock_level: number;
    reorder_point: number;
    status: string;
    image_url?: string;
}

export interface WarehouseFormData {
    code: string;
    name: string;
    description?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    status: string;
}

export interface UserFormData {
    username: string;
    email: string;
    password?: string;
    full_name: string;
    phone?: string;
    role_ids: number[];
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
    transfer_date: string;
    expected_arrival_date?: string;
    total_items: number;
    total_quantity: number;
    total_value: number;
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'in_transit' | 'completed' | 'cancelled';
    reason?: string;
    notes?: string;
    rejection_reason?: string;
    approved_by_name?: string;
    approved_at?: string;
    rejected_by_name?: string;
    rejected_at?: string;
    created_by?: number;
    created_by_name?: string;
    created_at: string;
    items?: StockTransferItem[];
}

export interface StockTransferItem {
    id: number;
    stock_transfer_id: number;
    product_id: number;
    product_name?: string;
    sku?: string;
    quantity_requested: number;
    quantity_received: number;
    unit_cost: number;
    line_total: number;
    batch_number?: string;
    expiry_date?: string;
    status: string;
}
