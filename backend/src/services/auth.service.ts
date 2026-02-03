import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository';
import { env } from '../config/env';
import { LoginResponse, JwtPayload } from '../types';
import { AppError } from '../middlewares/error.middleware';

export class AuthService {
    async login(username: string, password: string, ip: string): Promise<LoginResponse> {
        const user = await userRepository.findByUsernameWithPassword(username);

        if (!user) {
            throw new AppError('Invalid username or password', 401);
        }

        if (user.status !== 'active') {
            throw new AppError('Account is not active', 401);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash || '');

        if (!isPasswordValid) {
            throw new AppError('Invalid username or password', 401);
        }

        // Get user roles
        const roles = await userRepository.getUserRoles(user.id);
        const roleNames = roles.map(r => r.name);

        // Update last login
        await userRepository.updateLastLogin(user.id, ip);

        // Generate JWT token
        const payload: JwtPayload = {
            userId: user.id,
            username: user.username,
            roles: roleNames,
        };

        const token = jwt.sign(payload as object, env.jwt.secret, {
            expiresIn: env.jwt.expiresIn,
        } as jwt.SignOptions);

        // Remove password from response
        const { password_hash, ...userWithoutPassword } = user;

        return {
            user: { ...userWithoutPassword, roles } as any,
            token,
        };
    }

    async getCurrentUser(userId: number) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        return user;
    }

    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Register a new user with default viewer role
     */
    async register(data: {
        username: string;
        email: string;
        password: string;
        full_name: string;
        phone?: string;
    }): Promise<LoginResponse> {
        // Check if username already exists
        const existingUser = await userRepository.findByUsername(data.username);
        if (existingUser) {
            throw new AppError('Username already exists', 400);
        }

        // Check if email already exists
        const existingEmail = await userRepository.findByEmail(data.email);
        if (existingEmail) {
            throw new AppError('Email already exists', 400);
        }

        // Hash password
        const passwordHash = await this.hashPassword(data.password);

        // Get default role (user)
        const roles = await userRepository.getAllRoles();
        const userRole = roles.find(r => r.name === 'user');
        const roleIds = userRole ? [userRole.id] : [];

        // Create user
        const userId = await userRepository.create({
            username: data.username,
            email: data.email,
            password: data.password, // Required by CreateUserDto
            full_name: data.full_name,
            phone: data.phone,
            role_ids: roleIds,
        }, passwordHash);

        // Get created user
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new AppError('Failed to create user', 500);
        }

        // Generate JWT token
        const userRoles = await userRepository.getUserRoles(userId);
        const payload: JwtPayload = {
            userId: user.id,
            username: user.username,
            roles: userRoles.map(r => r.name),
        };

        const token = jwt.sign(payload as object, env.jwt.secret, {
            expiresIn: env.jwt.expiresIn,
        } as jwt.SignOptions);

        return {
            user: { ...user, roles: userRoles } as any,
            token,
        };
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: number, data: {
        full_name?: string;
        email?: string;
        phone?: string;
    }) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Check if email is being changed and if new email exists
        if (data.email && data.email !== user.email) {
            const existingEmail = await userRepository.findByEmail(data.email);
            if (existingEmail) {
                throw new AppError('Email đã được sử dụng', 400);
            }
        }

        await userRepository.update(userId, {
            full_name: data.full_name,
            email: data.email,
            phone: data.phone,
        });

        return this.getCurrentUser(userId);
    }

    /**
     * Change user password
     */
    async changePassword(userId: number, currentPassword: string, newPassword: string) {
        const user = await userRepository.findByIdWithPassword(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Verify current password
        const isValid = await this.verifyPassword(currentPassword, user.password_hash || '');
        if (!isValid) {
            throw new AppError('Mật khẩu hiện tại không đúng', 400);
        }

        // Hash new password and update
        const newHash = await this.hashPassword(newPassword);
        await userRepository.updatePassword(userId, newHash);
    }
}

export const authService = new AuthService();
