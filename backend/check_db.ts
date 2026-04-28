import pool from './src/config/database';

async function checkData() {
    try {
        const [rows] = await pool.query('SELECT count(*) as count FROM payables');
        console.log('Payables count:', (rows as any)[0].count);
        
        const [summary] = await pool.query('SELECT * FROM payables LIMIT 5');
        console.log('Sample payables:', summary);
    } catch (error) {
        console.error('Error checking data:', error);
    } finally {
        process.exit();
    }
}

checkData();
