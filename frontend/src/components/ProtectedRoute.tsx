import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles
}) => {
    const { isAuthenticated, isLoading, hasAnyRole } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !hasAnyRole(allowedRoles)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="card text-center max-w-md">
                    <div className="text-6xl mb-4">🚫</div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
                    <p className="text-slate-600 mb-4">
                        You don't have permission to access this page.
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="btn btn-primary"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
