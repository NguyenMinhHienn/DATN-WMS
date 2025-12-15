import { Response } from 'express';
import { productService } from '../services/product.service';
import { AuthRequest, ApiResponse, CreateProductDto, UpdateProductDto } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

export const getAllProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const categoryId = req.query.category_id ? parseInt(req.query.category_id as string) : undefined;
    const status = req.query.status as string;

    const result = await productService.getAllProducts(page, limit, search, categoryId, status);

    res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    } as ApiResponse);
});

export const getProductById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const product = await productService.getProductById(id);

    res.json({
        success: true,
        data: product,
    } as ApiResponse);
});

export const createProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const dto: CreateProductDto = req.body;
    const userId = req.user?.userId;
    const product = await productService.createProduct(dto, userId);

    res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
    } as ApiResponse);
});

export const updateProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const dto: UpdateProductDto = req.body;
    const product = await productService.updateProduct(id, dto);

    res.json({
        success: true,
        message: 'Product updated successfully',
        data: product,
    } as ApiResponse);
});

export const deleteProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await productService.deleteProduct(id);

    res.json({
        success: true,
        message: 'Product deleted successfully',
    } as ApiResponse);
});

export const getCategories = asyncHandler(async (req: AuthRequest, res: Response) => {
    const categories = await productService.getCategories();

    res.json({
        success: true,
        data: categories,
    } as ApiResponse);
});

export const getUnits = asyncHandler(async (req: AuthRequest, res: Response) => {
    const units = await productService.getUnits();

    res.json({
        success: true,
        data: units,
    } as ApiResponse);
});
