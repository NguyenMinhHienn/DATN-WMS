import { Request, Response } from 'express';
import pool from '../config/database';

export const supplierController = {
  async getAll(req: Request, res: Response) {
    try {
      const [rows] = await pool.query('SELECT * FROM suppliers WHERE status = "active" ORDER BY name ASC');
      
      res.status(200).json({
        status: 'success',
        data: rows
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: error.message || 'Lỗi khi lấy danh sách nhà cung cấp'
      });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name, code, contact_person, phone, email, address } = req.body;
      if (!name) {
        return res.status(400).json({ status: 'error', message: 'Tên nhà cung cấp là bắt buộc' });
      }

      // Cấp mã nếu chưa có
      const supplierCode = code || `SUP-${Date.now().toString().slice(-6)}`;

      const [result] = await pool.query(
        'INSERT INTO suppliers (code, name, contact_person, phone, email, address, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, "active", NOW(), NOW())',
        [supplierCode, name, contact_person || null, phone || null, email || null, address || null]
      );

      res.status(201).json({
        status: 'success',
        data: {
          id: (result as any).insertId,
          code: supplierCode,
          name,
          contact_person,
          phone,
          email,
          address,
          status: 'active'
        }
      });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ status: 'error', message: 'Mã hoặc tên nhà cung cấp đã tồn tại' });
      }
      res.status(500).json({
        status: 'error',
        message: error.message || 'Lỗi khi tạo mới nhà cung cấp'
      });
    }
  }
};
