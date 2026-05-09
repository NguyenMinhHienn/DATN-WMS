import pool from '../config/database';
import { Product, CreateProductDto, UpdateProductDto, PaginatedResult, Category, Unit, CreateCategoryDto, UpdateCategoryDto } from '../types';
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
      SELECT p.*, c.name as category_name, u.name as unit_name,
             COALESCE(SUM(i.quantity_on_hand), 0) as total_quantity,
             (SELECT sti.unit_cost 
              FROM stock_transfer_items sti 
              JOIN stock_transfers st ON sti.stock_transfer_id = st.id 
              WHERE sti.product_id = p.id AND st.transfer_type = 'IMPORT' AND st.status = 'approved' 
              ORDER BY st.approved_at DESC LIMIT 1) as latest_import_price
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN inventories i ON p.id = i.product_id
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

        dataQuery += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        params.push(limit, offset);

        const [countRows] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const total = countRows[0].total;

        const [rows] = await pool.query<RowDataPacket[]>(dataQuery, params);

        const mappedRows = rows.map(r => {
            const newCost = r.latest_import_price !== null && r.latest_import_price !== undefined
                ? Math.round(Number(r.latest_import_price))
                : r.cost_price;
            return {
                ...r,
                cost_price: newCost
            };
        });

        return {
            data: mappedRows as Product[],
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
      SELECT p.*, c.name as category_name, u.name as unit_name,
             (SELECT sti.unit_cost 
              FROM stock_transfer_items sti 
              JOIN stock_transfers st ON sti.stock_transfer_id = st.id 
              WHERE sti.product_id = p.id AND st.transfer_type = 'IMPORT' AND st.status = 'approved' 
              ORDER BY st.approved_at DESC LIMIT 1) as latest_import_price
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE p.id = ? AND p.deleted_at IS NULL
    `, [id]);

        if (rows.length === 0) return null;

        const row = rows[0];
        const newCost = row.latest_import_price !== null && row.latest_import_price !== undefined
            ? Math.round(Number(row.latest_import_price))
            : row.cost_price;

        return {
            ...row,
            cost_price: newCost
        } as Product;
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
        sku, barcode, name, description, category_id, unit_id, brand,
        cost_price, selling_price, min_stock_level, max_stock_level,
        reorder_point, reorder_quantity, is_serialized, is_batch_tracked, has_expiry,
        image_url, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            dto.sku,
            dto.barcode || null,
            dto.name,
            dto.description || null,
            dto.category_id || null,
            dto.unit_id || null,
            dto.brand || null,
            dto.cost_price,
            dto.selling_price,
            dto.min_stock_level || 0,
            dto.max_stock_level || null,
            dto.reorder_point || 0,
            dto.reorder_quantity || null,
            dto.is_serialized ? 1 : 0,
            dto.is_batch_tracked ? 1 : 0,
            dto.has_expiry ? 1 : 0,
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
            cost_price: 'cost_price',
            selling_price: 'selling_price',
            min_stock_level: 'min_stock_level',
            max_stock_level: 'max_stock_level',
            reorder_point: 'reorder_point',
            reorder_quantity: 'reorder_quantity',
            is_serialized: 'is_serialized',
            is_batch_tracked: 'is_batch_tracked',
            has_expiry: 'has_expiry',
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

    async createCategory(dto: CreateCategoryDto): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(`
      INSERT INTO categories (name, code, description, parent_id, image_url, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
            dto.name,
            dto.code,
            dto.description || null,
            dto.parent_id || null,
            dto.image_url || null,
            dto.sort_order || 0,
            dto.is_active !== undefined ? (dto.is_active ? 1 : 0) : 1
        ]);
        return result.insertId;
    }

    async updateCategory(id: number, dto: UpdateCategoryDto): Promise<boolean> {
        const updateFields: string[] = [];
        const values: any[] = [];
        const fieldMap: Record<string, string> = {
            name: 'name', code: 'code', description: 'description',
            parent_id: 'parent_id', image_url: 'image_url',
            sort_order: 'sort_order', is_active: 'is_active'
        };

        for (const [key, column] of Object.entries(fieldMap)) {
            if ((dto as any)[key] !== undefined) {
                updateFields.push(`${column} = ?`);
                values.push(key === 'is_active' ? ((dto as any)[key] ? 1 : 0) : (dto as any)[key]);
            }
        }

        if (updateFields.length === 0) return false;

        values.push(id);
        const [result] = await pool.query<ResultSetHeader>(`
            UPDATE categories SET ${updateFields.join(', ')} WHERE id = ? AND deleted_at IS NULL
        `, values);

        return result.affectedRows > 0;
    }

    async deleteCategory(id: number): Promise<boolean> {
        // Validation check constraint: count products
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT COUNT(*) as prod_count FROM products WHERE category_id = ? AND deleted_at IS NULL
        `, [id]);

        if (rows[0].prod_count > 0) {
            throw new Error('CATEGORY_HAS_PRODUCTS');
        }

        const [result] = await pool.query<ResultSetHeader>(`
      UPDATE categories SET deleted_at = NOW() WHERE id = ?
    `, [id]);
        return result.affectedRows > 0;
    }

    async getUnits(): Promise<Unit[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM units WHERE is_active = 1 ORDER BY name
    `);
        return rows as Unit[];
    }
}

export const productRepository = new ProductRepository();
