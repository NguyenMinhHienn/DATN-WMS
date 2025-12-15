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
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            error: err.message,
        });
    }

    // Log unexpected errors
    console.error('Unexpected error:', err);

    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    return res.status(500).json({
        success: false,
        message: 'Internal server error',
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
