import dotenv from 'dotenv';

dotenv.config();

export const env = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'wms_db',
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
};
