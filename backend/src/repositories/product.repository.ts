import pool from '../config/database';
import { Product, CreateProductDto, UpdateProductDto, PaginatedResult, Category, Unit } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class ProductRepository {
    async findAll(
        page: number = 1,
        limit: number = 10,
        search?: string,
        categoryId?: number,
        status?: string
    ): Promise<PaginatedResult<Product>> {
        let countQuery = 'SELECT COUNT(*) as total FROM products WHERE deleted_at IS NULL';
        let dataQuery = `
      SELECT p.*, c.name as category_name, u.name as unit_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE p.deleted_at IS NULL
    `;
        const params: any[] = [];
        const countParams: any[] = [];

        if (search) {
            const searchCondition = ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
            dataQuery += searchCondition;
            countQuery += searchCondition.replace(/p\./g, '');
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
            countParams.push(searchParam, searchParam, searchParam);
        }

        if (categoryId) {
            dataQuery += ' AND p.category_id = ?';
            countQuery += ' AND category_id = ?';
            params.push(categoryId);
            countParams.push(categoryId);
        }

        if (status) {
            dataQuery += ' AND p.status = ?';
            countQuery += ' AND status = ?';
            params.push(status);
            countParams.push(status);
        }

        dataQuery += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        params.push(limit, offset);

        const [countRows] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const total = countRows[0].total;

        const [rows] = await pool.query<RowDataPacket[]>(dataQuery, params);

        return {
            data: rows as Product[],
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: number): Promise<Product | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT p.*, c.name as category_name, u.name as unit_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE p.id = ? AND p.deleted_at IS NULL
    `, [id]);

        return rows.length > 0 ? (rows[0] as Product) : null;
    }

    async findBySku(sku: string): Promise<Product | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM products WHERE sku = ? AND deleted_at IS NULL
    `, [sku]);

        return rows.length > 0 ? (rows[0] as Product) : null;
    }

    async create(dto: CreateProductDto, userId?: number): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(`
      INSERT INTO products (
        sku, barcode, name, description, category_id, unit_id, brand, model,
        cost_price, selling_price, wholesale_price, min_stock_level, max_stock_level,
        reorder_point, reorder_quantity, is_serialized, is_batch_tracked, has_expiry,
        shelf_life_days, image_url, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            dto.sku,
            dto.barcode || null,
            dto.name,
            dto.description || null,
            dto.category_id || null,
            dto.unit_id || null,
            dto.brand || null,
            dto.model || null,
            dto.cost_price,
            dto.selling_price,
            dto.wholesale_price || null,
            dto.min_stock_level || 0,
            dto.max_stock_level || null,
            dto.reorder_point || 0,
            dto.reorder_quantity || null,
            dto.is_serialized ? 1 : 0,
            dto.is_batch_tracked ? 1 : 0,
            dto.has_expiry ? 1 : 0,
            dto.shelf_life_days || null,
            dto.image_url || null,
            dto.status || 'draft',
            userId || null,
        ]);

        return result.insertId;
    }

    async update(id: number, dto: UpdateProductDto): Promise<boolean> {
        const updateFields: string[] = [];
        const values: any[] = [];

        const fieldMap: Record<string, string> = {
            sku: 'sku',
            barcode: 'barcode',
            name: 'name',
            description: 'description',
            category_id: 'category_id',
            unit_id: 'unit_id',
            brand: 'brand',
            model: 'model',
            cost_price: 'cost_price',
            selling_price: 'selling_price',
            wholesale_price: 'wholesale_price',
            min_stock_level: 'min_stock_level',
            max_stock_level: 'max_stock_level',
            reorder_point: 'reorder_point',
            reorder_quantity: 'reorder_quantity',
            is_serialized: 'is_serialized',
            is_batch_tracked: 'is_batch_tracked',
            has_expiry: 'has_expiry',
            shelf_life_days: 'shelf_life_days',
            image_url: 'image_url',
            status: 'status',
        };

        for (const [key, column] of Object.entries(fieldMap)) {
            if ((dto as any)[key] !== undefined) {
                updateFields.push(`${column} = ?`);
                values.push((dto as any)[key]);
            }
        }

        if (updateFields.length === 0) return false;

        values.push(id);
        const [result] = await pool.query<ResultSetHeader>(`
      UPDATE products SET ${updateFields.join(', ')} WHERE id = ? AND deleted_at IS NULL
    `, values);

        return result.affectedRows > 0;
    }

    async delete(id: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
      UPDATE products SET deleted_at = NOW() WHERE id = ?
    `, [id]);

        return result.affectedRows > 0;
    }

    async getCategories(): Promise<Category[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM categories WHERE is_active = 1 AND deleted_at IS NULL
      ORDER BY sort_order, name
    `);
        return rows as Category[];
    }

    async getUnits(): Promise<Unit[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM units WHERE is_active = 1 ORDER BY name
    `);
        return rows as Unit[];
    }
}

export const productRepository = new ProductRepository();
