import { userRepository } from '../repositories/user.repository';
import { authService } from './auth.service';
import { CreateUserDto, UpdateUserDto, UserWithRoles, Role } from '../types';
import { AppError } from '../middlewares/error.middleware';

export class UserService {
    async getAllUsers(): Promise<UserWithRoles[]> {
        return userRepository.findAll();
    }

    async getUserById(id: number): Promise<UserWithRoles> {
        const user = await userRepository.findById(id);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        return user;
    }

    async createUser(dto: CreateUserDto): Promise<UserWithRoles> {
        // Check if username already exists
        const existingUsername = await userRepository.findByUsername(dto.username);
        if (existingUsername) {
            throw new AppError('Username already exists', 400);
        }

        // Check if email already exists
        const existingEmail = await userRepository.findByEmail(dto.email);
        if (existingEmail) {
            throw new AppError('Email already exists', 400);
        }

        // Hash password
        const passwordHash = await authService.hashPassword(dto.password);

        // Create user
        const userId = await userRepository.create(dto, passwordHash);

        // Return created user
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new AppError('Failed to create user', 500);
        }

        return user;
    }

    async updateUser(id: number, dto: UpdateUserDto): Promise<UserWithRoles> {
        // Check if user exists
        const existingUser = await userRepository.findById(id);
        if (!existingUser) {
            throw new AppError('User not found', 404);
        }

        // SECURITY: Prevent modifying admin account
        const isAdmin = existingUser.roles.some(role => role.name === 'admin');
        if (isAdmin) {
            throw new AppError('Cannot modify admin account', 403);
        }

        // Check if email is being changed and already in use
        if (dto.email && dto.email !== existingUser.email) {
            const existingEmail = await userRepository.findByEmail(dto.email);
            if (existingEmail) {
                throw new AppError('Email already exists', 400);
            }
        }

        // Update user
        await userRepository.update(id, dto);

        // Return updated user
        const user = await userRepository.findById(id);
        if (!user) {
            throw new AppError('Failed to update user', 500);
        }

        return user;
    }

    async deleteUser(id: number): Promise<void> {
        const existingUser = await userRepository.findById(id);
        if (!existingUser) {
            throw new AppError('User not found', 404);
        }

        // SECURITY: Prevent deleting admin account
        const isAdmin = existingUser.roles.some(role => role.name === 'admin');
        if (isAdmin) {
            throw new AppError('Cannot delete admin account', 403);
        }

        const deleted = await userRepository.delete(id);
        if (!deleted) {
            throw new AppError('Failed to delete user', 500);
        }
    }

    async getAllRoles(): Promise<Role[]> {
        return userRepository.getAllRoles();
    }
}

export const userService = new UserService();
