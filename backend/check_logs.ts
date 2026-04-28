import pool from './src/config/database';

async function check() {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM financial_audit_logs');
        console.log('Total audit logs:', (rows as any)[0].count);
        
        const [tables] = await pool.query("SHOW TABLES LIKE 'financial_audit_logs'");
        console.log('Table exists:', (tables as any).length > 0);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}

check();
