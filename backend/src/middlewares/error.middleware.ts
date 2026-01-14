import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Log all errors
    console.error('===== ERROR =====');
    console.error('Path:', req.method, req.path);
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    console.error('=================');

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            error: err.message,
        });
    }

    // Show detailed error in development
    const isProd = process.env.NODE_ENV === 'production';
    const message = isProd ? 'Internal server error' : err.message;

    return res.status(500).json({
        success: false,
        message: message,
        error: message,
    });
};

export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
    });
};

export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
