import { Request, Response } from 'express';
import * as attributeRepo from '../repositories/attribute.repository';
import { AuthRequest, CreateAttributeDto, CreateAttributeValueDto } from '../types';

// ==================== ATTRIBUTES ====================

export const getAllAttributes = async (req: Request, res: Response) => {
    try {
        const includeValues = req.query.includeValues === 'true';
        const attributes = await attributeRepo.getAllAttributes(includeValues);

        res.json({
            success: true,
            data: attributes
        });
    } catch (error: any) {
        console.error('Get attributes error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách thuộc tính'
        });
    }
};

export const getAttributeById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const attribute = await attributeRepo.getAttributeById(parseInt(id));

        if (!attribute) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thuộc tính'
            });
        }

        res.json({
            success: true,
            data: attribute
        });
    } catch (error: any) {
        console.error('Get attribute error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thuộc tính'
        });
    }
};

export const createAttribute = async (req: AuthRequest, res: Response) => {
    try {
        const data: CreateAttributeDto = req.body;

        if (!data.name || !data.display_name) {
            return res.status(400).json({
                success: false,
                message: 'Tên thuộc tính là bắt buộc'
            });
        }

        // Check if name exists
        const existing = await attributeRepo.getAttributeByName(data.name);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Tên thuộc tính đã tồn tại'
            });
        }

        const attribute = await attributeRepo.createAttribute(data);

        res.status(201).json({
            success: true,
            message: 'Tạo thuộc tính thành công',
            data: attribute
        });
    } catch (error: any) {
        console.error('Create attribute error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi tạo thuộc tính'
        });
    }
};

export const updateAttribute = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data: Partial<CreateAttributeDto> = req.body;

        const attribute = await attributeRepo.updateAttribute(parseInt(id), data);

        if (!attribute) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thuộc tính'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật thuộc tính thành công',
            data: attribute
        });
    } catch (error: any) {
        console.error('Update attribute error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi cập nhật thuộc tính'
        });
    }
};

export const deleteAttribute = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await attributeRepo.deleteAttribute(parseInt(id));

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thuộc tính'
            });
        }

        res.json({
            success: true,
            message: 'Xóa thuộc tính thành công'
        });
    } catch (error: any) {
        console.error('Delete attribute error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi xóa thuộc tính'
        });
    }
};

// ==================== ATTRIBUTE VALUES ====================

export const getAttributeValues = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const values = await attributeRepo.getValuesByAttributeId(parseInt(id));

        res.json({
            success: true,
            data: values
        });
    } catch (error: any) {
        console.error('Get attribute values error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy giá trị thuộc tính'
        });
    }
};

export const createAttributeValue = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data: CreateAttributeValueDto = {
            ...req.body,
            attribute_id: parseInt(id)
        };

        if (!data.value || !data.display_value) {
            return res.status(400).json({
                success: false,
                message: 'Giá trị thuộc tính là bắt buộc'
            });
        }

        const value = await attributeRepo.createAttributeValue(data);

        res.status(201).json({
            success: true,
            message: 'Thêm giá trị thành công',
            data: value
        });
    } catch (error: any) {
        console.error('Create attribute value error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Giá trị này đã tồn tại'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi thêm giá trị thuộc tính'
        });
    }
};

export const updateAttributeValue = async (req: AuthRequest, res: Response) => {
    try {
        const { valueId } = req.params;
        const data: Partial<CreateAttributeValueDto> = req.body;

        const value = await attributeRepo.updateAttributeValue(parseInt(valueId), data);

        if (!value) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giá trị thuộc tính'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật giá trị thành công',
            data: value
        });
    } catch (error: any) {
        console.error('Update attribute value error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi cập nhật giá trị thuộc tính'
        });
    }
};

export const deleteAttributeValue = async (req: AuthRequest, res: Response) => {
    try {
        const { valueId } = req.params;
        const deleted = await attributeRepo.deleteAttributeValue(parseInt(valueId));

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giá trị thuộc tính'
            });
        }

        res.json({
            success: true,
            message: 'Xóa giá trị thành công'
        });
    } catch (error: any) {
        console.error('Delete attribute value error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi xóa giá trị thuộc tính'
        });
    }
};

// ==================== PRODUCT ATTRIBUTES ====================

export const getProductAttributes = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const attributes = await attributeRepo.getProductAttributes(parseInt(productId));

        res.json({
            success: true,
            data: attributes
        });
    } catch (error: any) {
        console.error('Get product attributes error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thuộc tính sản phẩm'
        });
    }
};
