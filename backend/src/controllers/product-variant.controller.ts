import { Response } from 'express';
import { productVariantService } from '../services/product-variant.service';
import { AuthRequest, ApiResponse, CreateProductVariantDto, UpdateProductVariantDto } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

/**
 * Get all variants for a product
 * GET /products/:id/variants
 */
export const getVariantsByProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const productId = parseInt(req.params.id, 10);
    const variants = await productVariantService.getVariantsByProductId(productId);

    res.json({
        success: true,
        data: variants,
    } as ApiResponse);
});

/**
 * Get product with all variants (detailed view)
 * GET /products/:id/detail
 */
export const getProductWithVariants = asyncHandler(async (req: AuthRequest, res: Response) => {
    const productId = parseInt(req.params.id, 10);
    const product = await productVariantService.getProductWithVariants(productId);

    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found',
        } as ApiResponse);
    }

    res.json({
        success: true,
        data: product,
    } as ApiResponse);
});

/**
 * Get variant by ID
 * GET /variants/:id
 */
export const getVariantById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const variant = await productVariantService.getVariantById(id);

    if (!variant) {
        return res.status(404).json({
            success: false,
            message: 'Variant not found',
        } as ApiResponse);
    }

    res.json({
        success: true,
        data: variant,
    } as ApiResponse);
});

/**
 * Find variant by attributes (for user cart - find exact variant)
 * POST /products/:id/find-variant
 * Body: { color: "red" }
 */
export const findVariant = asyncHandler(async (req: AuthRequest, res: Response) => {
    const productId = parseInt(req.params.id, 10);
    const { color } = req.body;

    if (!color) {
        return res.status(400).json({
            success: false,
            message: 'Color is required',
        } as ApiResponse);
    }

    const variant = await productVariantService.findVariantByAttributes(productId, color);

    if (!variant) {
        return res.status(404).json({
            success: false,
            message: 'Variant not found with specified attributes',
        } as ApiResponse);
    }

    res.json({
        success: true,
        data: variant,
    } as ApiResponse);
});

/**
 * Get available colors for a product
 * GET /products/:id/colors
 */
export const getAvailableColors = asyncHandler(async (req: AuthRequest, res: Response) => {
    const productId = parseInt(req.params.id, 10);
    const colors = await productVariantService.getAvailableColors(productId);

    res.json({
        success: true,
        data: colors,
    } as ApiResponse);
});

/**
 * Create a new variant (Admin/Manager)
 * POST /products/:id/variants
 */
export const createVariant = asyncHandler(async (req: AuthRequest, res: Response) => {
    const productId = parseInt(req.params.id, 10);
    const dto: CreateProductVariantDto = {
        ...req.body,
        product_id: productId,
    };

    // Validate required fields - only SKU and price are truly required
    if (!dto.sku || dto.price === undefined) {
        return res.status(400).json({
            success: false,
            message: 'sku and price are required',
        } as ApiResponse);
    }

    try {
        const variant = await productVariantService.createVariant(dto);

        res.status(201).json({
            success: true,
            message: 'Variant created successfully',
            data: variant,
        } as ApiResponse);
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        } as ApiResponse);
    }
});

/**
 * Update a variant (Admin/Manager)
 * PUT /variants/:id
 */
export const updateVariant = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const dto: UpdateProductVariantDto = req.body;

    try {
        const variant = await productVariantService.updateVariant(id, dto);

        res.json({
            success: true,
            message: 'Variant updated successfully',
            data: variant,
        } as ApiResponse);
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        } as ApiResponse);
    }
});

/**
 * Delete a variant (Admin only)
 * DELETE /variants/:id
 */
export const deleteVariant = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);

    try {
        await productVariantService.deleteVariant(id);

        res.json({
            success: true,
            message: 'Variant deleted successfully',
        } as ApiResponse);
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        } as ApiResponse);
    }
});


export const checkStock = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const quantity = parseInt(req.query.quantity as string) || 1;

    const hasStock = await productVariantService.hasStock(id, quantity);

    res.json({
        success: true,
        data: {
            variant_id: id,
            requested_quantity: quantity,
            in_stock: hasStock,
        },
    } as ApiResponse);
});


import * as variantRepo from '../repositories/variant.repository';
import { GenerateVariantsDto } from '../types';

export const generateVariants = asyncHandler(async (req: AuthRequest, res: Response) => {
    const productId = parseInt(req.params.id, 10);
    const { attributes, base_price, base_stock } = req.body;

    if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng chọn ít nhất một loại thuộc tính',
        } as ApiResponse);
    }


    for (const attr of attributes) {
        if (!attr.attribute_id || !attr.value_ids || attr.value_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Mỗi thuộc tính phải có ít nhất một giá trị',
            } as ApiResponse);
        }
    }

    try {
        const dto: GenerateVariantsDto = {
            product_id: productId,
            attributes,
            base_price: base_price || 0,
            base_stock: base_stock || 0,
        };

        const variants = await variantRepo.generateVariants(dto);

        res.status(201).json({
            success: true,
            message: `Đã tạo ${variants.length} biến thể`,
            data: variants,
        } as ApiResponse);
    } catch (error: any) {
        console.error('Generate variants error:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Lỗi khi sinh biến thể',
        } as ApiResponse);
    }
});


export const findVariantByAttributeValues = asyncHandler(async (req: AuthRequest, res: Response) => {
    const productId = parseInt(req.params.id, 10);
    const { attribute_value_ids } = req.body;

    if (!attribute_value_ids || !Array.isArray(attribute_value_ids) || attribute_value_ids.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng chọn đầy đủ thuộc tính',
        } as ApiResponse);
    }

    const variant = await variantRepo.findByAttributeValues(productId, attribute_value_ids);

    if (!variant) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy biến thể với các thuộc tính đã chọn',
        } as ApiResponse);
    }

    res.json({
        success: true,
        data: variant,
    } as ApiResponse);
});


export const deleteAllVariants = asyncHandler(async (req: AuthRequest, res: Response) => {
    const productId = parseInt(req.params.id, 10);

    const count = await variantRepo.deleteVariantsByProductId(productId);

    res.json({
        success: true,
        message: `Đã xóa ${count} biến thể`,
    } as ApiResponse);
});

