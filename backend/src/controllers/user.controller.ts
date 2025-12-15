import { Response } from 'express';
import { userService } from '../services/user.service';
import { AuthRequest, ApiResponse, CreateUserDto, UpdateUserDto } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

export const getAllUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const users = await userService.getAllUsers();

    res.json({
        success: true,
        data: users,
    } as ApiResponse);
});

export const getUserById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const user = await userService.getUserById(id);

    res.json({
        success: true,
        data: user,
    } as ApiResponse);
});

export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const dto: CreateUserDto = req.body;
    const user = await userService.createUser(dto);

    res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
    } as ApiResponse);
});

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const dto: UpdateUserDto = req.body;
    const user = await userService.updateUser(id, dto);

    res.json({
        success: true,
        message: 'User updated successfully',
        data: user,
    } as ApiResponse);
});

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await userService.deleteUser(id);

    res.json({
        success: true,
        message: 'User deleted successfully',
    } as ApiResponse);
});

export const getAllRoles = asyncHandler(async (req: AuthRequest, res: Response) => {
    const roles = await userService.getAllRoles();

    res.json({
        success: true,
        data: roles,
    } as ApiResponse);
});
