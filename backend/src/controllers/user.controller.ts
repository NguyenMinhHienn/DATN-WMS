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

    const isAdmin = req.user?.roles?.includes('admin');
    if (!isAdmin) {
        const roles = await userService.getAllRoles();
        const userRole = roles.find(r => r.name === 'user');
        if (userRole) {
            dto.role_ids = [userRole.id];
        }
    }

    // Validate required fields
    if (!dto.username || dto.username.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Tên đăng nhập là bắt buộc',
        } as ApiResponse);
    }

    if (!dto.email || dto.email.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Email là bắt buộc',
        } as ApiResponse);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
        return res.status(400).json({
            success: false,
            message: 'Định dạng email không hợp lệ',
        } as ApiResponse);
    }

    if (!dto.password || dto.password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Mật khẩu phải có ít nhất 6 ký tự',
        } as ApiResponse);
    }

    if (dto.password.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Mật khẩu không được chỉ chứa khoảng trắng',
        } as ApiResponse);
    }

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

    const isAdmin = req.user?.roles?.includes('admin');
    if (!isAdmin) {
        const targetUser = await userService.getUserById(id);
        const hasProtectedRole = targetUser.roles.some(r => r.name !== 'user');
        if (hasProtectedRole) {
            return res.status(403).json({
                success: false,
                message: 'Nhân viên chỉ có thể chỉnh sửa tài khoản khách hàng'
            } as ApiResponse);
        }
        const roles = await userService.getAllRoles();
        const userRole = roles.find(r => r.name === 'user');
        if (userRole) {
            dto.role_ids = [userRole.id];
        }
    }

    const user = await userService.updateUser(id, dto);

    res.json({
        success: true,
        message: 'User updated successfully',
        data: user,
    } as ApiResponse);
});

export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);

    const isAdmin = req.user?.roles?.includes('admin');
    if (!isAdmin) {
        const targetUser = await userService.getUserById(id);
        const hasProtectedRole = targetUser.roles.some(r => r.name !== 'user');
        if (hasProtectedRole) {
            return res.status(403).json({
                success: false,
                message: 'Nhân viên chỉ có thể xóa tài khoản khách hàng'
            } as ApiResponse);
        }
    }

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
