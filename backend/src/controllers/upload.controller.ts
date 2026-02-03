import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/database';
import { AuthRequest } from '../types';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure avatars directory exists
const avatarsDir = path.join(uploadsDir, 'avatars');
if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Check if it's an avatar upload
        if (file.fieldname === 'avatar') {
            cb(null, avatarsDir);
        } else {
            cb(null, uploadsDir);
        }
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const prefix = file.fieldname === 'avatar' ? 'avatar' : 'product';
        cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
});

// File filter - only allow images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload file ảnh (jpg, jpeg, png, webp)'));
    }
};

// Create multer upload instance
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Upload image handler
export const uploadImage = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Không tìm thấy file ảnh'
            });
        }

        // Construct the URL for the uploaded image
        const imageUrl = `/uploads/${req.file.filename}`;

        res.json({
            success: true,
            message: 'Upload ảnh thành công',
            data: {
                url: imageUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size
            }
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi upload ảnh'
        });
    }
};

// Upload avatar handler - updates user avatar in database
export const uploadAvatar = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Chưa đăng nhập'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Không tìm thấy file ảnh'
            });
        }

        // Construct the URL for the uploaded avatar
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        // Update user avatar_url in database
        await pool.execute(
            'UPDATE users SET avatar_url = ? WHERE id = ?',
            [avatarUrl, req.user.userId]
        );

        res.json({
            success: true,
            message: 'Cập nhật ảnh đại diện thành công',
            data: {
                avatar_url: avatarUrl,
                filename: req.file.filename
            }
        });
    } catch (error: any) {
        console.error('Upload avatar error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi upload ảnh đại diện'
        });
    }
};

// Delete image handler (optional - for cleanup)
export const deleteImage = async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;

        if (!filename) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu tên file'
            });
        }

        const filePath = path.join(uploadsDir, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({
                success: true,
                message: 'Xóa ảnh thành công'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy file'
            });
        }
    } catch (error: any) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Lỗi khi xóa ảnh'
        });
    }
};
