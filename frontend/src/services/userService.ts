import api from './api';
import { ApiResponse, User, Role, UserFormData } from '../interface';

export const userService = {
    async getAll(): Promise<User[]> {
        const response = await api.get<ApiResponse<User[]>>('/users');
        return response.data.data || [];
    },

    async getById(id: number): Promise<User> {
        const response = await api.get<ApiResponse<User>>(`/users/${id}`);
        return response.data.data!;
    },

    async create(data: UserFormData): Promise<User> {
        const response = await api.post<ApiResponse<User>>('/users', data);
        return response.data.data!;
    },

    async update(id: number, data: Partial<UserFormData>): Promise<User> {
        const response = await api.put<ApiResponse<User>>(`/users/${id}`, data);
        return response.data.data!;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`/users/${id}`);
    },

    async getRoles(): Promise<Role[]> {
        const response = await api.get<ApiResponse<Role[]>>('/roles');
        return response.data.data || [];
    },
};
