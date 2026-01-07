import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AppError } from './error.middleware';

export const authorize = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('Authentication required', 401));
        }

        const userRoles = req.user.roles || [];
        const hasRole = allowedRoles.some(role => userRoles.includes(role));

        if (!hasRole) {
            return next(new AppError('Insufficient permissions', 403));
        }

        next();
    };
};

// Predefined role checks
export const isAdmin = authorize('admin');
export const isWarehouseManager = authorize('admin', 'warehouse_manager');
export const isStaff = authorize('admin', 'warehouse_manager', 'staff');
export const isUser = authorize('admin', 'warehouse_manager', 'staff', 'user');
// Alias for backward compatibility
export const isViewer = isUser;

