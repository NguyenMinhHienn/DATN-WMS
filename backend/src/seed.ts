/**
 * Seed Script for WMS Database
 * Run with: npx ts-node src/seed.ts
 * 
 * This script populates the database with sample data for testing and demo purposes.
 */

import bcrypt from 'bcryptjs';
import pool from './config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

// ============================================================
// SEED DATA DEFINITIONS
// ============================================================

const ROLES = [
    { name: 'admin', description: 'Full system access - manage users, warehouses, products, and all operations' },
    { name: 'warehouse_manager', description: 'Manage warehouses and products, approve stock operations' },
    { name: 'staff', description: 'Handle daily warehouse operations - stock in, stock out, inventory' },
    { name: 'user', description: 'Customer - Browse products, create orders, view own data' },
];

const USERS = [
    { username: 'admin', email: 'admin@wms.vn', password: 'admin123', full_name: 'System Administrator', phone: '0901234567', roles: ['admin'] },
    { username: 'manager', email: 'manager@wms.vn', password: 'manager123', full_name: 'Warehouse Manager', phone: '0901234568', roles: ['warehouse_manager'] },
    { username: 'staff', email: 'staff@wms.vn', password: 'staff123', full_name: 'Warehouse Staff', phone: '0901234569', roles: ['staff'] },
    { username: 'user', email: 'user@wms.vn', password: 'user123', full_name: 'Regular User', phone: '0901234570', roles: ['user'] },
];

const CATEGORIES = [
    { code: 'ELEC', name: 'Electronics', description: 'Electronic devices and accessories' },
    { code: 'CLOTH', name: 'Clothing & Apparel', description: 'Clothes, shoes, and fashion accessories' },
    { code: 'FOOD', name: 'Food & Beverages', description: 'Food items, drinks, and snacks' },
    { code: 'FURN', name: 'Furniture', description: 'Home and office furniture' },
    { code: 'SPORT', name: 'Sports & Outdoors', description: 'Sports equipment and outdoor gear' },
];

const UNITS = [
    { code: 'PCS', name: 'Piece', type: 'quantity' },
    { code: 'KG', name: 'Kilogram', type: 'weight' },
    { code: 'BOX', name: 'Box', type: 'quantity' },
    { code: 'CTN', name: 'Carton', type: 'quantity' },
    { code: 'L', name: 'Liter', type: 'volume' },
    { code: 'M', name: 'Meter', type: 'length' },
];

const WAREHOUSES = [
    {
        code: 'WH-001',
        name: 'Hanoi Main Warehouse',
        description: 'Main distribution center in Hanoi',
        address: '123 Cau Giay District',
        city: 'Hanoi',
        country: 'Vietnam',
        phone: '024-1234567',
        email: 'hanoi@wms.vn',
        capacity_volume: 10000,
        capacity_weight: 500000,
    },
    {
        code: 'WH-002',
        name: 'HCMC South Warehouse',
        description: 'Southern region distribution center',
        address: '456 District 7',
        city: 'Ho Chi Minh City',
        country: 'Vietnam',
        phone: '028-7654321',
        email: 'hcmc@wms.vn',
        capacity_volume: 15000,
        capacity_weight: 750000,
    },
    {
        code: 'WH-003',
        name: 'Da Nang Central Warehouse',
        description: 'Central region hub',
        address: '789 Hai Chau District',
        city: 'Da Nang',
        country: 'Vietnam',
        phone: '0236-9876543',
        email: 'danang@wms.vn',
        capacity_volume: 8000,
        capacity_weight: 400000,
    },
];

const PRODUCTS = [
    { sku: 'ELEC-001', name: 'iPhone 15 Pro Max 256GB', category: 'ELEC', unit: 'PCS', cost: 25000000, price: 32000000, min_stock: 10, brand: 'Apple' },
    { sku: 'ELEC-002', name: 'Samsung Galaxy S24 Ultra', category: 'ELEC', unit: 'PCS', cost: 22000000, price: 28000000, min_stock: 10, brand: 'Samsung' },
    { sku: 'ELEC-003', name: 'MacBook Pro 14" M3', category: 'ELEC', unit: 'PCS', cost: 45000000, price: 55000000, min_stock: 5, brand: 'Apple' },
    { sku: 'ELEC-004', name: 'Sony WH-1000XM5 Headphones', category: 'ELEC', unit: 'PCS', cost: 6000000, price: 8500000, min_stock: 20, brand: 'Sony' },
    { sku: 'CLOTH-001', name: 'Nike Air Max 90', category: 'CLOTH', unit: 'PCS', cost: 2500000, price: 3500000, min_stock: 30, brand: 'Nike' },
    { sku: 'CLOTH-002', name: 'Adidas Ultraboost 22', category: 'CLOTH', unit: 'PCS', cost: 3000000, price: 4200000, min_stock: 25, brand: 'Adidas' },
    { sku: 'CLOTH-003', name: 'Levi\'s 501 Original Jeans', category: 'CLOTH', unit: 'PCS', cost: 800000, price: 1500000, min_stock: 50, brand: 'Levi\'s' },
    { sku: 'FOOD-001', name: 'Coca Cola 330ml (24 pack)', category: 'FOOD', unit: 'CTN', cost: 180000, price: 250000, min_stock: 100, brand: 'Coca Cola' },
    { sku: 'FOOD-002', name: 'Oreo Cookies Family Pack', category: 'FOOD', unit: 'BOX', cost: 45000, price: 65000, min_stock: 200, brand: 'Oreo' },
    { sku: 'FURN-001', name: 'IKEA MARKUS Office Chair', category: 'FURN', unit: 'PCS', cost: 3500000, price: 4990000, min_stock: 15, brand: 'IKEA' },
    { sku: 'FURN-002', name: 'Standing Desk 120x60cm', category: 'FURN', unit: 'PCS', cost: 2800000, price: 3800000, min_stock: 10, brand: 'FlexiSpot' },
    { sku: 'SPORT-001', name: 'Wilson Tennis Racket Pro', category: 'SPORT', unit: 'PCS', cost: 1500000, price: 2200000, min_stock: 20, brand: 'Wilson' },
    { sku: 'SPORT-002', name: 'Yoga Mat Premium 6mm', category: 'SPORT', unit: 'PCS', cost: 350000, price: 550000, min_stock: 40, brand: 'Manduka' },
];


// Inventory data: product SKU -> warehouse code -> quantity
const INVENTORY_DATA: { [sku: string]: { [whCode: string]: number } } = {
    'ELEC-001': { 'WH-001': 50, 'WH-002': 80, 'WH-003': 30 },
    'ELEC-002': { 'WH-001': 60, 'WH-002': 70, 'WH-003': 25 },
    'ELEC-003': { 'WH-001': 20, 'WH-002': 30, 'WH-003': 10 },
    'ELEC-004': { 'WH-001': 100, 'WH-002': 120, 'WH-003': 50 },
    'CLOTH-001': { 'WH-001': 150, 'WH-002': 200, 'WH-003': 80 },
    'CLOTH-002': { 'WH-001': 120, 'WH-002': 180, 'WH-003': 60 },
    'CLOTH-003': { 'WH-001': 200, 'WH-002': 250, 'WH-003': 100 },
    'FOOD-001': { 'WH-001': 500, 'WH-002': 600, 'WH-003': 300 },
    'FOOD-002': { 'WH-001': 400, 'WH-002': 500, 'WH-003': 250 },
    'FURN-001': { 'WH-001': 30, 'WH-002': 40, 'WH-003': 15 },
    'FURN-002': { 'WH-001': 25, 'WH-002': 35, 'WH-003': 12 },
    'SPORT-001': { 'WH-001': 60, 'WH-002': 80, 'WH-003': 40 },
    'SPORT-002': { 'WH-001': 100, 'WH-002': 150, 'WH-003': 70 },
};

// ============================================================
// SEED FUNCTIONS
// ============================================================

async function clearData() {
    console.log('🗑️  Clearing existing data...');
    const tables = [
        'inventory_logs', 'inventories', 'goods_receipt_items', 'goods_receipts',
        'goods_issue_items', 'goods_issues', 'stock_transfer_items', 'stock_transfers',
        'reorder_alerts', 'storage_locations', 'warehouse_zones', 'products',
        'categories', 'units', 'suppliers', 'user_roles', 'users', 'roles', 'warehouses'
    ];

    for (const table of tables) {
        try {
            await pool.query(`DELETE FROM ${table}`);
            await pool.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
        } catch (e) {
            // Ignore errors for tables that don't exist
        }
    }
    console.log('✅ Data cleared');
}

async function seedRoles(): Promise<Map<string, number>> {
    console.log('📋 Seeding roles...');
    const roleMap = new Map<string, number>();

    for (const role of ROLES) {
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO roles (name, description, is_active) VALUES (?, ?, 1)',
            [role.name, role.description]
        );
        roleMap.set(role.name, result.insertId);
        console.log(`   ✓ Role: ${role.name}`);
    }

    return roleMap;
}

async function seedUsers(roleMap: Map<string, number>): Promise<Map<string, number>> {
    console.log('👥 Seeding users...');
    const userMap = new Map<string, number>();

    for (const user of USERS) {
        const passwordHash = await bcrypt.hash(user.password, 10);

        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO users (username, email, password_hash, full_name, phone, status, email_verified_at)
             VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
            [user.username, user.email, passwordHash, user.full_name, user.phone]
        );

        const userId = result.insertId;
        userMap.set(user.username, userId);

        // Assign roles
        for (const roleName of user.roles) {
            const roleId = roleMap.get(roleName);
            if (roleId) {
                await pool.query(
                    'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
                    [userId, roleId]
                );
            }
        }

        console.log(`   ✓ User: ${user.username} (${user.roles.join(', ')})`);
    }

    return userMap;
}

async function seedCategories(): Promise<Map<string, number>> {
    console.log('📁 Seeding categories...');
    const categoryMap = new Map<string, number>();

    for (const cat of CATEGORIES) {
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO categories (code, name, description, is_active) VALUES (?, ?, ?, 1)',
            [cat.code, cat.name, cat.description]
        );
        categoryMap.set(cat.code, result.insertId);
        console.log(`   ✓ Category: ${cat.name}`);
    }

    return categoryMap;
}

async function seedUnits(): Promise<Map<string, number>> {
    console.log('📏 Seeding units...');
    const unitMap = new Map<string, number>();

    for (const unit of UNITS) {
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO units (code, name, type, is_active) VALUES (?, ?, ?, 1)',
            [unit.code, unit.name, unit.type]
        );
        unitMap.set(unit.code, result.insertId);
        console.log(`   ✓ Unit: ${unit.name} (${unit.code})`);
    }

    return unitMap;
}

async function seedWarehouses(adminId: number): Promise<Map<string, number>> {
    console.log('🏭 Seeding warehouses...');
    const warehouseMap = new Map<string, number>();

    for (const wh of WAREHOUSES) {
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO warehouses (code, name, description, address, city, country, phone, email, 
             capacity_volume, capacity_weight, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
            [wh.code, wh.name, wh.description, wh.address, wh.city, wh.country,
            wh.phone, wh.email, wh.capacity_volume, wh.capacity_weight, adminId]
        );
        warehouseMap.set(wh.code, result.insertId);
        console.log(`   ✓ Warehouse: ${wh.name} (${wh.code})`);

        // Create sample zones for each warehouse
        const zones = [
            { code: 'ZONE-A', name: 'Zone A - General Storage', type: 'general' },
            { code: 'ZONE-B', name: 'Zone B - Cold Storage', type: 'cold' },
            { code: 'ZONE-C', name: 'Zone C - High Value', type: 'high_value' },
        ];

        for (const zone of zones) {
            await pool.query(
                `INSERT INTO warehouse_zones (warehouse_id, code, name, zone_type, is_active)
                 VALUES (?, ?, ?, ?, 1)`,
                [result.insertId, zone.code, zone.name, zone.type]
            );
        }
    }

    return warehouseMap;
}

async function seedProducts(
    categoryMap: Map<string, number>,
    unitMap: Map<string, number>,
    adminId: number
): Promise<Map<string, number>> {
    console.log('📦 Seeding products...');
    const productMap = new Map<string, number>();

    for (const prod of PRODUCTS) {
        const categoryId = categoryMap.get(prod.category);
        const unitId = unitMap.get(prod.unit);

        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO products (sku, name, category_id, unit_id, cost_price, selling_price, 
             min_stock_level, brand, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
            [prod.sku, prod.name, categoryId, unitId, prod.cost, prod.price, prod.min_stock, prod.brand, adminId]
        );

        productMap.set(prod.sku, result.insertId);
        console.log(`   ✓ Product: ${prod.name}`);
    }

    return productMap;
}

async function seedInventory(
    productMap: Map<string, number>,
    warehouseMap: Map<string, number>
): Promise<void> {
    console.log('📊 Seeding inventory...');

    for (const [sku, warehouses] of Object.entries(INVENTORY_DATA)) {
        const productId = productMap.get(sku);
        if (!productId) continue;

        for (const [whCode, quantity] of Object.entries(warehouses)) {
            const warehouseId = warehouseMap.get(whCode);
            if (!warehouseId) continue;

            // Get product cost for unit_cost
            const [products] = await pool.query<RowDataPacket[]>(
                'SELECT cost_price FROM products WHERE id = ?',
                [productId]
            );
            const unitCost = products[0]?.cost_price || 0;

            await pool.query(
                `INSERT INTO inventories (product_id, warehouse_id, quantity_on_hand, unit_cost, status, last_movement_date)
                 VALUES (?, ?, ?, ?, 'available', NOW())`,
                [productId, warehouseId, quantity, unitCost]
            );
        }
        console.log(`   ✓ Inventory for: ${sku}`);
    }
}

async function seedSuppliers(): Promise<void> {
    console.log('🏢 Seeding suppliers...');

    const suppliers = [
        { code: 'SUP-001', name: 'Apple Vietnam', contact: 'John Doe', email: 'contact@apple.vn', phone: '028-1111111', city: 'HCMC' },
        { code: 'SUP-002', name: 'Samsung Electronics', contact: 'Jane Kim', email: 'contact@samsung.vn', phone: '028-2222222', city: 'HCMC' },
        { code: 'SUP-003', name: 'Nike Vietnam', contact: 'Mike Johnson', email: 'contact@nike.vn', phone: '024-3333333', city: 'Hanoi' },
    ];

    for (const sup of suppliers) {
        await pool.query(
            `INSERT INTO suppliers (code, name, contact_person, email, phone, city, status)
             VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            [sup.code, sup.name, sup.contact, sup.email, sup.phone, sup.city]
        );
        console.log(`   ✓ Supplier: ${sup.name}`);
    }
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function seed() {
    console.log('\n🚀 Starting WMS Database Seed...\n');
    console.log('='.repeat(50));

    try {
        // Clear existing data
        await clearData();

        // Seed in order (respecting foreign key constraints)
        const roleMap = await seedRoles();
        const userMap = await seedUsers(roleMap);
        const adminId = userMap.get('admin') || 1;

        const categoryMap = await seedCategories();
        const unitMap = await seedUnits();
        const warehouseMap = await seedWarehouses(adminId);
        const productMap = await seedProducts(categoryMap, unitMap, adminId);

        await seedInventory(productMap, warehouseMap);
        await seedSuppliers();

        console.log('\n' + '='.repeat(50));
        console.log('✅ Seed completed successfully!\n');

        console.log('📋 Summary:');
        console.log(`   - Roles: ${ROLES.length}`);
        console.log(`   - Users: ${USERS.length}`);
        console.log(`   - Categories: ${CATEGORIES.length}`);
        console.log(`   - Units: ${UNITS.length}`);
        console.log(`   - Warehouses: ${WAREHOUSES.length}`);
        console.log(`   - Products: ${PRODUCTS.length}`);
        console.log(`   - Inventory entries: ${Object.keys(INVENTORY_DATA).length * WAREHOUSES.length}`);

        console.log('\n🔐 Login Credentials:');
        console.log('   ┌────────────┬─────────────┬──────────────────────┐');
        console.log('   │ Username   │ Password    │ Role                 │');
        console.log('   ├────────────┼─────────────┼──────────────────────┤');
        console.log('   │ admin      │ admin123    │ admin                │');
        console.log('   │ manager    │ manager123  │ warehouse_manager    │');
        console.log('   │ staff      │ staff123    │ staff                │');
        console.log('   │ user       │ user123     │ user                 │');
        console.log('   └────────────┴─────────────┴──────────────────────┘\n');

    } catch (error) {
        console.error('\n❌ Seed failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

// Run seed
seed();
