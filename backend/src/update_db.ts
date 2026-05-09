import mysql from 'mysql2/promise';

async function run() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'wms_db',
    });

    // 1. Create export_receipts table without FK constraints
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS export_receipts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                receipt_number VARCHAR(50) UNIQUE NOT NULL,
                receipt_date DATE NOT NULL,
                receiver_name VARCHAR(100) DEFAULT NULL,
                receiver_department VARCHAR(100) DEFAULT NULL,
                receiver_address VARCHAR(255) DEFAULT NULL,
                receiver_phone VARCHAR(20) DEFAULT NULL,
                export_reason ENUM('sale','internal','disposal','transfer') DEFAULT 'sale',
                warehouse_id INT NOT NULL,
                notes TEXT,
                reference_document VARCHAR(200) DEFAULT NULL,
                delivery_person VARCHAR(100) DEFAULT NULL,
                storekeeper VARCHAR(100) DEFAULT NULL,
                total_items INT DEFAULT 0,
                total_quantity INT DEFAULT 0,
                total_amount DECIMAL(15,2) DEFAULT 0,
                created_by INT DEFAULT NULL,
                approved_by INT DEFAULT NULL,
                approved_at DATETIME DEFAULT NULL,
                status ENUM('PENDING','APPROVED','CANCELLED') DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ export_receipts table created");
    } catch (e: any) {
        console.error("❌ export_receipts:", e.message);
    }

    // 2. Create export_receipt_items table
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS export_receipt_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                export_receipt_id INT NOT NULL,
                product_id INT NOT NULL,
                product_variant_id INT DEFAULT NULL,
                quantity_requested INT DEFAULT 0,
                quantity_actual INT DEFAULT 0,
                unit_price DECIMAL(15,2) DEFAULT 0,
                line_total DECIMAL(15,2) DEFAULT 0,
                notes TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ export_receipt_items table created");
    } catch (e: any) {
        console.error("❌ export_receipt_items:", e.message);
    }

    console.log("\n🎉 Done!");
    await pool.end();
    process.exit(0);
}
run();
