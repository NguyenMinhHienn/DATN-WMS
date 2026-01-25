import { productVariantRepository } from '../repositories/product-variant.repository';
import { productRepository } from '../repositories/product.repository';
import { ProductVariant, CreateProductVariantDto, UpdateProductVariantDto, ProductWithVariants } from '../types';

class ProductVariantService {
    /**
     * Get all active variants for a product
     */
    async getVariantsByProductId(productId: number): Promise<ProductVariant[]> {
        // Verify product exists
        const product = await productRepository.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        return productVariantRepository.findByProductId(productId);
    }

    /**
     * Get all variants for a product (including inactive) - Admin only
     */
    async getAllVariantsByProductId(productId: number): Promise<ProductVariant[]> {
        return productVariantRepository.findAllByProductId(productId);
    }

    /**
     * Get variant by ID
     */
    async getVariantById(id: number): Promise<ProductVariant | null> {
        return productVariantRepository.findById(id);
    }

    /**
     * Find variant by attributes (product_id + color)
     */
    async findVariantByAttributes(productId: number, color: string): Promise<ProductVariant | null> {
        return productVariantRepository.findByAttributes(productId, color);
    }

    /**
     * Get product with all variants
     */
    async getProductWithVariants(productId: number): Promise<ProductWithVariants | null> {
        return productVariantRepository.getProductWithVariants(productId);
    }

    /**
     * Get available colors for a product
     */
    async getAvailableColors(productId: number): Promise<string[]> {
        return productVariantRepository.getAvailableColors(productId);
    }

    /**
     * Create a new variant
     */
    async createVariant(dto: CreateProductVariantDto): Promise<ProductVariant> {
        // Verify product exists
        const product = await productRepository.findById(dto.product_id);
        if (!product) {
            throw new Error('Product not found');
        }

        // Check if SKU is unique
        const existingSku = await productVariantRepository.findBySku(dto.sku);
        if (existingSku) {
            throw new Error('SKU already exists');
        }

        // Check if color already exists for this product
        const existingColor = await productVariantRepository.findByAttributes(dto.product_id, dto.color);
        if (existingColor) {
            throw new Error(`Variant with color '${dto.color}' already exists for this product`);
        }

        // Create variant
        const variantId = await productVariantRepository.create(dto);
        const variant = await productVariantRepository.findById(variantId);

        if (!variant) {
            throw new Error('Failed to create variant');
        }

        return variant;
    }

    /**
     * Create default variant when creating a new product
     */
    async createDefaultVariant(productId: number, productSku: string, price: number): Promise<number> {
        return productVariantRepository.createDefaultVariant(productId, productSku, price);
    }

    /**
     * Update a variant
     */
    async updateVariant(id: number, dto: UpdateProductVariantDto): Promise<ProductVariant> {
        // Verify variant exists
        const existing = await productVariantRepository.findById(id);
        if (!existing) {
            throw new Error('Variant not found');
        }

        // If updating SKU, check uniqueness
        if (dto.sku && dto.sku !== existing.sku) {
            const existingSku = await productVariantRepository.findBySku(dto.sku);
            if (existingSku) {
                throw new Error('SKU already exists');
            }
        }

        // If updating color, check uniqueness for this product
        if (dto.color && dto.color !== existing.color) {
            const existingColor = await productVariantRepository.findByAttributes(existing.product_id, dto.color);
            if (existingColor) {
                throw new Error(`Variant with color '${dto.color}' already exists for this product`);
            }
        }

        await productVariantRepository.update(id, dto);
        const updated = await productVariantRepository.findById(id);

        if (!updated) {
            throw new Error('Failed to update variant');
        }

        return updated;
    }

    /**
     * Update variant stock
     */
    async updateStock(id: number, quantityChange: number): Promise<boolean> {
        const variant = await productVariantRepository.findById(id);
        if (!variant) {
            throw new Error('Variant not found');
        }

        // Prevent negative stock
        if (variant.stock + quantityChange < 0) {
            throw new Error('Insufficient stock');
        }

        return productVariantRepository.updateStock(id, quantityChange);
    }

    /**
     * Delete variant (soft delete)
     */
    async deleteVariant(id: number): Promise<boolean> {
        const variant = await productVariantRepository.findById(id);
        if (!variant) {
            throw new Error('Variant not found');
        }

        return productVariantRepository.delete(id);
    }

    /**
     * Check if variant has sufficient stock
     */
    async hasStock(variantId: number, quantity: number = 1): Promise<boolean> {
        return productVariantRepository.hasStock(variantId, quantity);
    }
}

export const productVariantService = new ProductVariantService();
