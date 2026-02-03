import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthContextType } from '../interface';
import { authService } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing token on mount
        const storedToken = sessionStorage.getItem('token');
        const storedUser = sessionStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = useCallback(async (username: string, password: string) => {
        const response = await authService.login(username, password);
        setUser(response.user);
        setToken(response.token);
        sessionStorage.setItem('token', response.token);
        sessionStorage.setItem('user', JSON.stringify(response.user));
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        authService.logout();
    }, []);

    const hasRole = useCallback((role: string): boolean => {
        if (!user) return false;
        return user.roles.some(r => r.name === role);
    }, [user]);

    const hasAnyRole = useCallback((roles: string[]): boolean => {
        if (!user) return false;
        return user.roles.some(r => roles.includes(r.name));
    }, [user]);

    const refreshUser = useCallback(async () => {
        try {
            const response = await authService.getCurrentUser();
            setUser(response);
            sessionStorage.setItem('user', JSON.stringify(response));
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    }, []);

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        hasRole,
        hasAnyRole,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
