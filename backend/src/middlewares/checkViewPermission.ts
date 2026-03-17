import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AppError } from './error.middleware';

/**
 * Middleware to check for view-only permissions.
 * If the user has the required permission, they are only allowed to perform GET requests.
 * Admins and Managers with full access are not restricted by this.
 */
export const checkViewPermission = (permission: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('Authentication required', 401));
        }

        const userRoles = req.user.roles || [];
        const isAdmin = userRoles.includes('admin');
        const isManager = userRoles.includes('warehouse_manager');

        // Admins and Managers have full access bypass
        if (isAdmin || isManager) {
            return next();
        }

        // For other roles (like staff), check if they have the specific permission
        // Note: In this project, permissions are stored in the roles table and 
        // would ideally be included in the JWT payload. 
        // For now, we'll check based on role and the specific permission needed.
        
        const isStaff = userRoles.includes('staff');
        
        // We'll assume if it's staff and the permission is one of the "view" ones, 
        // they can only do GET requests.
        if (isStaff && (permission === 'view_inventory' || permission === 'view_product_config')) {
            if (req.method !== 'GET') {
                return next(new AppError('Staff only have view-only access to this resource', 403));
            }
            return next();
        }

        // If not admin/manager/staff with permission, deny access
        return next(new AppError('Insufficient permissions', 403));
    };
};

// Last updated: Tue Mar 17 20:26:32 +07 2026
