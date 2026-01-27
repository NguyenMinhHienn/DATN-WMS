import { Response } from 'express';
import { specificationRepository, CreateSpecificationDto } from '../repositories/specification.repository';
import { AuthRequest, ApiResponse } from '../types';
import { asyncHandler } from '../middlewares/error.middleware';

/**
 * Get all specifications for a product
 * GET /products/:id/specifications
 */
export const getSpecificationsByProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const productId = parseInt(req.params.id, 10);
    const specifications = await specificationRepository.getByProductId(productId);

    res.json({
        success: true,
        data: specifications,
    } as ApiResponse);
});

/**
 * Create a new specification
 * POST /products/:id/specifications
 */
export const createSpecification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const productId = parseInt(req.params.id, 10);
    const { spec_name, spec_value, sort_order } = req.body;

    if (!spec_name || !spec_value) {
        return res.status(400).json({
            success: false,
            message: 'spec_name và spec_value là bắt buộc',
        } as ApiResponse);
    }

    const dto: CreateSpecificationDto = { spec_name, spec_value, sort_order };
    const id = await specificationRepository.create(productId, dto);

    const specification = await specificationRepository.getById(id);

    res.status(201).json({
        success: true,
        message: 'Đã tạo thông số',
        data: specification,
    } as ApiResponse);
});

/**
 * Create multiple specifications at once
 * POST /products/:id/specifications/bulk
 */
export const createBulkSpecifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const productId = parseInt(req.params.id, 10);
    const { specifications } = req.body;

    if (!Array.isArray(specifications) || specifications.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng cung cấp mảng specifications',
        } as ApiResponse);
    }

    // Replace all existing specifications with new ones
    const ids = await specificationRepository.replaceAll(productId, specifications);
    const allSpecs = await specificationRepository.getByProductId(productId);

    res.status(201).json({
        success: true,
        message: `Đã cập nhật ${ids.length} thông số`,
        data: allSpecs,
    } as ApiResponse);
});

/**
 * Update a specification
 * PUT /specifications/:id
 */
export const updateSpecification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { spec_name, spec_value, sort_order } = req.body;

    const updated = await specificationRepository.update(id, { spec_name, spec_value, sort_order });

    if (!updated) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy thông số',
        } as ApiResponse);
    }

    const specification = await specificationRepository.getById(id);

    res.json({
        success: true,
        message: 'Đã cập nhật thông số',
        data: specification,
    } as ApiResponse);
});

/**
 * Delete a specification
 * DELETE /specifications/:id
 */
export const deleteSpecification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);

    const deleted = await specificationRepository.delete(id);

    if (!deleted) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy thông số',
        } as ApiResponse);
    }

    res.json({
        success: true,
        message: 'Đã xóa thông số',
    } as ApiResponse);
});
