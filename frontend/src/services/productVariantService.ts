import api from './api';
import { ProductVariant, ProductWithVariants, ProductVariantFormData, ApiResponse } from '../interface';

export const productVariantService = {
    // Get all variants for a product
    async getByProduct(productId: number): Promise<ProductVariant[]> {
        const response = await api.get<ApiResponse<ProductVariant[]>>(`/products/${productId}/variants`);
        return response.data.data || [];
    },

    // Get product with all variants (detailed view)
    async getProductWithVariants(productId: number): Promise<ProductWithVariants | null> {
        const response = await api.get<ApiResponse<ProductWithVariants>>(`/products/${productId}/detail`);
        return response.data.data || null;
    },

    // Get available colors for a product
    async getAvailableColors(productId: number): Promise<string[]> {
        const response = await api.get<ApiResponse<string[]>>(`/products/${productId}/colors`);
        return response.data.data || [];
    },

    // Find variant by attributes (for cart)
    async findVariant(productId: number, color: string): Promise<ProductVariant | null> {
        const response = await api.post<ApiResponse<ProductVariant>>(`/products/${productId}/find-variant`, {
            color
        });
        return response.data.data || null;
    },

    // Get variant by ID
    async getById(id: number): Promise<ProductVariant | null> {
        const response = await api.get<ApiResponse<ProductVariant>>(`/variants/${id}`);
        return response.data.data || null;
    },

    // Create new variant (Admin)
    async create(productId: number, data: ProductVariantFormData): Promise<ProductVariant> {
        const response = await api.post<ApiResponse<ProductVariant>>(`/products/${productId}/variants`, data);
        return response.data.data!;
    },

    // Update variant (Admin)
    async update(id: number, data: Partial<ProductVariantFormData>): Promise<ProductVariant> {
        const response = await api.put<ApiResponse<ProductVariant>>(`/variants/${id}`, data);
        return response.data.data!;
    },

    // Delete variant (Admin)
    async delete(id: number): Promise<void> {
        await api.delete(`/variants/${id}`);
    },

    // Check stock
    async checkStock(id: number, quantity: number = 1): Promise<boolean> {
        const response = await api.get<ApiResponse<{ in_stock: boolean }>>(`/variants/${id}/stock?quantity=${quantity}`);
        return response.data.data?.in_stock || false;
    },

    // Generate variants from attribute combinations (Admin)
    async generateVariants(productId: number, data: {
        attributes: { attribute_id: number; value_ids: number[] }[];
        base_price?: number;
        base_stock?: number;
    }): Promise<ProductVariant[]> {
        const response = await api.post<ApiResponse<ProductVariant[]>>(`/products/${productId}/variants/generate`, {
            product_id: productId,
            ...data
        });
        return response.data.data || [];
    }
};
