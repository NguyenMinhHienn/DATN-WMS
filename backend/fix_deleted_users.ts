import pool from './src/config/database';

async function fixDeletedUsers() {
    try {
        console.log('Starting to fix already deleted users...');
        const [result] = await pool.query(`
            UPDATE users 
            SET 
                email = CONCAT(email, '_deleted_', id), 
                username = CONCAT(username, '_deleted_', id) 
            WHERE 
                deleted_at IS NOT NULL 
                AND email NOT LIKE '%_deleted_%'
        `);
        console.log(`Updated ${(result as any).affectedRows} deleted users.`);
    } catch (error) {
        console.error('Error fixing deleted users:', error);
    } finally {
        process.exit();
    }
}

fixDeletedUsers();
