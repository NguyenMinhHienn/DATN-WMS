import api from './api';
import { ApiResponse, Product, Category, Unit, PaginationInfo, ProductFormData } from '../interface';

export const productService = {
    async getAll(
        page: number = 1,
        limit: number = 10,
        search?: string,
        categoryId?: number,
        status?: string
    ): Promise<{ data: Product[]; pagination: PaginationInfo }> {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (search) params.append('search', search);
        if (categoryId) params.append('category_id', categoryId.toString());
        if (status) params.append('status', status);

        const response = await api.get<ApiResponse<Product[]>>(`/products?${params}`);
        return {
            data: response.data.data || [],
            pagination: response.data.pagination!,
        };
    },

    async getById(id: number): Promise<Product> {
        const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
        return response.data.data!;
    },

    async create(data: ProductFormData): Promise<Product> {
        const response = await api.post<ApiResponse<Product>>('/products', data);
        return response.data.data!;
    },

    async update(id: number, data: Partial<ProductFormData>): Promise<Product> {
        const response = await api.put<ApiResponse<Product>>(`/products/${id}`, data);
        return response.data.data!;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`/products/${id}`);
    },

    async getCategories(): Promise<Category[]> {
        const response = await api.get<ApiResponse<Category[]>>('/categories');
        return response.data.data || [];
    },

    async getUnits(): Promise<Unit[]> {
        const response = await api.get<ApiResponse<Unit[]>>('/units');
        return response.data.data || [];
    },

    async getProductVariants(productId: number): Promise<any[]> {
        try {
            const response = await api.get<ApiResponse<any[]>>(`/products/${productId}/variants`);
            return response.data.data || [];
        } catch (error) {
            console.error(`Failed to load variants for product ${productId}:`, error);
            return [];
        }
    },
};
