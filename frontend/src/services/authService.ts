import api from './api';
import { ApiResponse, LoginResponse, User } from '../interface';

export const authService = {
    async login(username: string, password: string): Promise<LoginResponse> {
        const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
            username,
            password,
        });
        return response.data.data!;
    },

    async logout(): Promise<void> {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            // Ignore logout errors
        }
    },

    async getCurrentUser(): Promise<User> {
        const response = await api.get<ApiResponse<User>>('/auth/me');
        return response.data.data!;
    },

    async register(data: {
        username: string;
        email: string;
        password: string;
        full_name: string;
        phone?: string;
    }): Promise<LoginResponse> {
        const response = await api.post<ApiResponse<LoginResponse>>('/auth/register', data);
        return response.data.data!;
    },
};
