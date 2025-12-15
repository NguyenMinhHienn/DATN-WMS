import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthRequest, JwtPayload } from '../types';
import { AppError } from './error.middleware';

export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No token provided', 401);
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            throw new AppError('No token provided', 401);
        }

        const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return next(new AppError('Invalid token', 401));
        }
        if (error instanceof jwt.TokenExpiredError) {
            return next(new AppError('Token expired', 401));
        }
        next(error);
    }
};

export const optionalAuth = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token) {
                const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
                req.user = decoded;
            }
        }
        next();
    } catch (error) {
        // Silently fail for optional auth
        next();
    }
};
