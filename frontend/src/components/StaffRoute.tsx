import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * StaffRoute - Route Guard cho STAFF
 * Chỉ cho phép user có role 'staff' truy cập
 * ADMIN và CLIENT sẽ bị redirect
 */
export const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isLoading, hasRole } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Chưa đăng nhập → redirect login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Không phải STAFF → 403
    if (!hasRole('staff')) {
        return <Navigate to="/403" replace />;
    }

    return <>{children}</>;
};
