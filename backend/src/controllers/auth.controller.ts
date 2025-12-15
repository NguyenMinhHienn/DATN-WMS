import { Response } from 'express';
import { authService } from '../services/auth.service';
import { AuthRequest, ApiResponse, LoginRequest } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { username, password } = req.body as LoginRequest;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required',
        } as ApiResponse);
    }

    const ip = req.ip || req.socket.remoteAddress || '';
    const result = await authService.login(username, password, ip);

    res.json({
        success: true,
        message: 'Login successful',
        data: result,
    } as ApiResponse);
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    // JWT is stateless, so logout is handled on client side
    res.json({
        success: true,
        message: 'Logout successful',
    } as ApiResponse);
});

export const getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated',
        } as ApiResponse);
    }

    const user = await authService.getCurrentUser(req.user.userId);

    res.json({
        success: true,
        data: user,
    } as ApiResponse);
});

/**
 * Register a new user
 * POST /auth/register
 */
export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { username, email, password, full_name, phone } = req.body;

    // Validate required fields
    if (!username || !email || !password || !full_name) {
        return res.status(400).json({
            success: false,
            message: 'Username, email, password, and full name are required',
        } as ApiResponse);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid email format',
        } as ApiResponse);
    }

    // Validate password length
    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters',
        } as ApiResponse);
    }

    const result = await authService.register({
        username,
        email,
        password,
        full_name,
        phone,
    });

    res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result,
    } as ApiResponse);
});
