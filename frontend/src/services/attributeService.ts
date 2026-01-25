import api from './api';
import { Attribute, AttributeValue, GenerateVariantsDto, ProductVariant } from '../interface';

export const attributeService = {
    /**
     * Get all attributes with their values
     */
    async getAll(includeValues = true): Promise<Attribute[]> {
        const response = await api.get(`/attributes?includeValues=${includeValues}`);
        return response.data.data;
    },

    /**
     * Get a single attribute by ID
     */
    async getById(id: number): Promise<Attribute> {
        const response = await api.get(`/attributes/${id}`);
        return response.data.data;
    },

    /**
     * Get values for an attribute
     */
    async getValues(attributeId: number): Promise<AttributeValue[]> {
        const response = await api.get(`/attributes/${attributeId}/values`);
        return response.data.data;
    },

    /**
     * Create a new attribute (Admin)
     */
    async create(data: { name: string; display_name: string; type?: string }): Promise<Attribute> {
        const response = await api.post('/attributes', data);
        return response.data.data;
    },

    /**
     * Create a new attribute value (Admin)
     */
    async createValue(attributeId: number, data: { value: string; display_value: string; color_code?: string }): Promise<AttributeValue> {
        const response = await api.post(`/attributes/${attributeId}/values`, data);
        return response.data.data;
    },

    /**
     * Get attributes used by a product
     */
    async getProductAttributes(productId: number): Promise<Attribute[]> {
        const response = await api.get(`/products/${productId}/attributes`);
        return response.data.data;
    },

    /**
     * Generate variant combinations for a product
     */
    async generateVariants(productId: number, dto: GenerateVariantsDto): Promise<ProductVariant[]> {
        const response = await api.post(`/products/${productId}/variants/generate`, dto);
        return response.data.data;
    },

    /**
     * Find variant by attribute values
     */
    async findVariantByAttributes(productId: number, attributeValueIds: number[]): Promise<ProductVariant> {
        const response = await api.post(`/products/${productId}/find-variant-by-attributes`, {
            attribute_value_ids: attributeValueIds
        });
        return response.data.data;
    },

    /**
     * Delete all variants for a product (for regenerating)
     */
    async deleteAllVariants(productId: number): Promise<void> {
        await api.delete(`/products/${productId}/variants/all`);
    },
};

export default attributeService;
