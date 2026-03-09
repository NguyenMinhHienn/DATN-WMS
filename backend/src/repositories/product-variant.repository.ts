import pool from '../config/database';
import { ProductVariant, CreateProductVariantDto, UpdateProductVariantDto, ProductWithVariants } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class ProductVariantRepository {
    /**
     * Get all variants for a product
     */
    async findByProductId(productId: number): Promise<ProductVariant[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT pv.*
        FROM product_variants pv
        WHERE pv.product_id = ? AND pv.is_active = 1
        ORDER BY pv.color
    `, [productId]);

        return rows as ProductVariant[];
    }

    /**
     * Get all variants for a product (including inactive)
     */
    async findAllByProductId(productId: number): Promise<ProductVariant[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT * FROM product_variants 
            WHERE product_id = ?
            ORDER BY color
        `, [productId]);

        return rows as ProductVariant[];
    }

    /**
     * Find variant by ID
     */
    async findById(id: number): Promise<ProductVariant | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT pv.*, p.name as product_name, p.sku as product_sku
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.id
            WHERE pv.id = ?
        `, [id]);

        return rows.length > 0 ? (rows[0] as ProductVariant) : null;
    }

    /**
     * Find variant by product_id and color
     */
    async findByAttributes(productId: number, color: string): Promise<ProductVariant | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT * FROM product_variants 
            WHERE product_id = ? AND color = ? AND is_active = 1
        `, [productId, color]);

        return rows.length > 0 ? (rows[0] as ProductVariant) : null;
    }

    /**
     * Find variant by SKU
     */
    async findBySku(sku: string): Promise<ProductVariant | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT * FROM product_variants WHERE sku = ?
        `, [sku]);

        return rows.length > 0 ? (rows[0] as ProductVariant) : null;
    }

    /**
     * Create a new variant
     */
    async create(dto: CreateProductVariantDto): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(`
            INSERT INTO product_variants (product_id, color, size, storage, ram, material, capacity, sku, price, stock, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            dto.product_id,
            dto.color || null,
            dto.size || null,
            dto.storage || null,
            dto.ram || null,
            dto.material || null,
            dto.capacity || null,
            dto.sku,
            dto.price,
            dto.stock || 0,
            dto.image_url || null
        ]);

        return result.insertId;
    }

    /**
     * Create default variant for a product (no attributes)
     */
    async createDefaultVariant(productId: number, productSku: string, price: number): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(`
            INSERT INTO product_variants (product_id, sku, price, stock, is_active)
            VALUES (?, ?, ?, 0, 1)
            ON DUPLICATE KEY UPDATE updated_at = NOW()
        `, [productId, `${productSku}-DEFAULT`, price]);

        return result.insertId;
    }

    /**
     * Update a variant
     */
    async update(id: number, dto: UpdateProductVariantDto): Promise<boolean> {
        const updateFields: string[] = [];
        const values: any[] = [];

        const fieldMap: Record<string, string> = {
            color: 'color',
            size: 'size',
            storage: 'storage',
            ram: 'ram',
            material: 'material',
            capacity: 'capacity',
            sku: 'sku',
            price: 'price',
            stock: 'stock',
            image_url: 'image_url',
            is_active: 'is_active'
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
            UPDATE product_variants SET ${updateFields.join(', ')} WHERE id = ?
        `, values);

        return result.affectedRows > 0;
    }

    /**
     * Update variant stock
     */
    async updateStock(id: number, quantity: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
            UPDATE product_variants SET stock = stock + ? WHERE id = ?
        `, [quantity, id]);

        return result.affectedRows > 0;
    }

    /**
     * Soft delete (set is_active = 0)
     */
    async delete(id: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
            UPDATE product_variants SET is_active = 0 WHERE id = ?
        `, [id]);

        return result.affectedRows > 0;
    }

    /**
     * Hard delete (use with caution)
     */
    async hardDelete(id: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
            DELETE FROM product_variants WHERE id = ?
        `, [id]);

        return result.affectedRows > 0;
    }

    /**
     * Get product with all its variants
     */
    async getProductWithVariants(productId: number): Promise<ProductWithVariants | null> {
        // Get product info
        const [productRows] = await pool.query<RowDataPacket[]>(`
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
        `, [productId]);

        if (productRows.length === 0) return null;

        const productRow = productRows[0];
        const newCost = productRow.latest_import_price !== null && productRow.latest_import_price !== undefined
            ? Math.round(Number(productRow.latest_import_price))
            : productRow.cost_price;

        const product = {
            ...productRow,
            cost_price: newCost
        } as ProductWithVariants;

        // Get variants - đọc stock thực tế từ product_variants (đã được cập nhật chuẩn xác qua file approve)
        const [variantRows] = await pool.query<RowDataPacket[]>(`
        SELECT pv.*
        FROM product_variants pv
        WHERE pv.product_id = ? AND pv.is_active = 1
        ORDER BY pv.color
    `, [productId]);

        product.variants = variantRows as ProductVariant[];

        // Populate attribute_values for each variant
        for (const variant of product.variants) {
            const [attrValRows] = await pool.query<RowDataPacket[]>(`
                SELECT av.*, a.name as attribute_name, a.display_name as attribute_display_name
                FROM variant_attribute_values vav
                JOIN attribute_values av ON av.id = vav.attribute_value_id
                JOIN attributes a ON a.id = av.attribute_id
                WHERE vav.variant_id = ?
                ORDER BY a.sort_order ASC
            `, [variant.id]);
            variant.attribute_values = attrValRows as any[];
        }

        product.variant_count = product.variants.length;

        // Calculate price range and total stock
        if (product.variants.length > 0) {
            product.min_price = Math.min(...product.variants.map(v => v.price));
            product.max_price = Math.max(...product.variants.map(v => v.price));
            product.total_stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
            product.available_colors = product.variants
                .map(v => {
                    // First check for new attribute_values system
                    if (v.attribute_values && v.attribute_values.length > 0) {
                        const colorAttr = v.attribute_values.find((av: any) => av.attribute_name === 'color');
                        return colorAttr?.display_value || null;
                    }
                    // Fallback to legacy color column
                    return v.color || null;
                })
                .filter(c => c && c.trim() !== '')
                .join(', ');
        }

        return product;
    }

    /**
     * Get available colors for a product
     */
    async getAvailableColors(productId: number): Promise<string[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT DISTINCT color FROM product_variants 
            WHERE product_id = ? AND is_active = 1 AND stock > 0
            ORDER BY color
        `, [productId]);

        return rows.map(row => row.color);
    }

    /**
     * Check if variant has stock
     */
    async hasStock(variantId: number, quantity: number = 1): Promise<boolean> {
        const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT pv.stock
        FROM product_variants pv
        WHERE pv.id = ? AND pv.is_active = 1
    `, [variantId]);

        if (rows.length === 0) return false;
        return rows[0].stock >= quantity;
    }
}

export const productVariantRepository = new ProductVariantRepository();
