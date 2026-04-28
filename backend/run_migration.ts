import pool from './src/config/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, '../database/create_financial_audit_logs.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration completed successfully.');
        
        const [rows] = await pool.query('SHOW TABLES LIKE "financial_audit_logs"');
        console.log('Verification:', rows);
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit();
    }
}

runMigration();
