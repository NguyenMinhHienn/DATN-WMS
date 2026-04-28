import pool from './src/config/database';

async function main() {
    try {
        const [rows] = await pool.query('DESCRIBE suppliers');
        console.log(rows);
    } catch (error) {
        console.error(error);
    } finally {
        pool.end();
    }
}

main();
