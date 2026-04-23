
import pool from '../backend/src/config/database';

async function check() {
    try {
        const [rows] = await pool.query('DESC export_receipt_items');
        console.log('export_receipt_items schema:', rows);
        
        const [rows2] = await pool.query('DESC stock_transfer_items');
        console.log('stock_transfer_items schema:', rows2);

        const [rows3] = await pool.query('DESC order_items');
        console.log('order_items schema:', rows3);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
