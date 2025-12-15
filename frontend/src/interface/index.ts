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
    is_active: boolean;
}

export interface Unit {
    id: number;
    code: string;
    name: string;
    type: string;
}

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
    recentMovements: InventoryLog[];
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
