import api from './api';
import { ApiResponse } from '../interface';

export interface ProductSpecification {
    id: number;
    product_id: number;
    spec_name: string;
    spec_value: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface CreateSpecificationDto {
    spec_name: string;
    spec_value: string;
    sort_order?: number;
}

export const specificationService = {
    /**
     * Get all specifications for a product
     */
    async getByProductId(productId: number): Promise<ProductSpecification[]> {
        const response = await api.get<ApiResponse<ProductSpecification[]>>(`/products/${productId}/specifications`);
        return response.data.data || [];
    },

    /**
     * Create a new specification
     */
    async create(productId: number, data: CreateSpecificationDto): Promise<ProductSpecification> {
        const response = await api.post<ApiResponse<ProductSpecification>>(`/products/${productId}/specifications`, data);
        return response.data.data!;
    },

    /**
     * Bulk create/replace specifications
     */
    async bulkCreate(productId: number, specifications: CreateSpecificationDto[]): Promise<ProductSpecification[]> {
        const response = await api.post<ApiResponse<ProductSpecification[]>>(`/products/${productId}/specifications/bulk`, {
            specifications
        });
        return response.data.data || [];
    },

    /**
     * Update a specification
     */
    async update(id: number, data: Partial<CreateSpecificationDto>): Promise<ProductSpecification> {
        const response = await api.put<ApiResponse<ProductSpecification>>(`/specifications/${id}`, data);
        return response.data.data!;
    },

    /**
     * Delete a specification
     */
    async delete(id: number): Promise<void> {
        await api.delete(`/specifications/${id}`);
    }
};
