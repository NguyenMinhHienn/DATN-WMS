import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { testConnection } from './config/database';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app = express();

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', routes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await testConnection();

        app.listen(env.port, () => {
            console.log(`🚀 Server is running on http://localhost:${env.port}`);
            console.log(`📚 API available at http://localhost:${env.port}/api`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
