import { productRepository } from '../repositories/product.repository';
import { CreateProductDto, UpdateProductDto, Product, PaginatedResult, Category, Unit, CreateCategoryDto, UpdateCategoryDto } from '../types';
import { AppError } from '../middlewares/error.middleware';

export class ProductService {
    async getAllProducts(
        page: number = 1,
        limit: number = 10,
        search?: string,
        categoryId?: number,
        status?: string
    ): Promise<PaginatedResult<Product>> {
        return productRepository.findAll(page, limit, search, categoryId, status);
    }

    async getProductById(id: number): Promise<Product> {
        const product = await productRepository.findById(id);
        if (!product) {
            throw new AppError('Product not found', 404);
        }
        return product;
    }

    async createProduct(dto: CreateProductDto, userId?: number): Promise<Product> {
        // Check if SKU already exists
        const existingSku = await productRepository.findBySku(dto.sku);
        if (existingSku) {
            throw new AppError('SKU already exists', 400);
        }

        const productId = await productRepository.create(dto, userId);

        const product = await productRepository.findById(productId);
        if (!product) {
            throw new AppError('Failed to create product', 500);
        }

        return product;
    }

    async updateProduct(id: number, dto: UpdateProductDto): Promise<Product> {
        const existingProduct = await productRepository.findById(id);
        if (!existingProduct) {
            throw new AppError('Product not found', 404);
        }

        // Check if SKU is being changed and already in use
        if (dto.sku && dto.sku !== existingProduct.sku) {
            const existingSku = await productRepository.findBySku(dto.sku);
            if (existingSku) {
                throw new AppError('SKU already exists', 400);
            }
        }

        await productRepository.update(id, dto);

        const product = await productRepository.findById(id);
        if (!product) {
            throw new AppError('Failed to update product', 500);
        }

        return product;
    }

    async deleteProduct(id: number): Promise<void> {
        const existingProduct = await productRepository.findById(id);
        if (!existingProduct) {
            throw new AppError('Product not found', 404);
        }

        const deleted = await productRepository.delete(id);
        if (!deleted) {
            throw new AppError('Failed to delete product', 500);
        }
    }

    async getCategories(): Promise<Category[]> {
        return productRepository.getCategories();
    }

    async createCategory(dto: CreateCategoryDto): Promise<number> {
        return productRepository.createCategory(dto);
    }

    async updateCategory(id: number, dto: UpdateCategoryDto): Promise<void> {
        const updated = await productRepository.updateCategory(id, dto);
        if (!updated) {
            throw new AppError('Category not found or could not be updated', 404);
        }
    }

    async deleteCategory(id: number): Promise<void> {
        try {
            const deleted = await productRepository.deleteCategory(id);
            if (!deleted) {
                throw new AppError('Category not found', 404);
            }
        } catch (error: any) {
            if (error.message === 'CATEGORY_HAS_PRODUCTS') {
                throw new AppError('Không thể xóa danh mục đang có sản phẩm', 400);
            }
            throw error;
        }
    }

    async getUnits(): Promise<Unit[]> {
        return productRepository.getUnits();
    }
}

export const productService = new ProductService();
