import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import {
    ProductVariant,
    CreateProductVariantDto,
    GenerateVariantsDto,
    AttributeValue
} from '../types';
import * as attributeRepo from '../repositories/attribute.repository';

// ==================== BASIC CRUD ====================

export const findById = async (id: number): Promise<ProductVariant | null> => {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT pv.*, p.name as product_name, p.sku as product_sku
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.id
        WHERE pv.id = ?
    `, [id]);

    if (rows.length === 0) return null;

    const variant = rows[0] as ProductVariant;
    // Get attribute values for this variant (includes attribute info)
    variant.attribute_values = await attributeRepo.getVariantAttributeValues(id) as any[];

    return variant;
};

export const findByProductId = async (productId: number, includeInactive = false): Promise<ProductVariant[]> => {
    const activeClause = includeInactive ? '' : 'AND pv.is_active = 1';
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT pv.*
        FROM product_variants pv
        WHERE pv.product_id = ? ${activeClause}
        ORDER BY pv.id ASC
    `, [productId]);

    const variants = rows as ProductVariant[];

    // Get attribute values for each variant
    for (const variant of variants) {
        variant.attribute_values = await attributeRepo.getVariantAttributeValues(variant.id) as any[];
    }

    return variants;
};

export const findBySku = async (sku: string): Promise<ProductVariant | null> => {
    const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM product_variants WHERE sku = ?',
        [sku]
    );
    return rows.length > 0 ? rows[0] as ProductVariant : null;
};

export const createVariant = async (dto: CreateProductVariantDto): Promise<ProductVariant> => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Insert variant
        const [result] = await conn.query<ResultSetHeader>(`
            INSERT INTO product_variants (product_id, sku, price, stock, image_url)
            VALUES (?, ?, ?, ?, ?)
        `, [
            dto.product_id,
            dto.sku,
            dto.price,
            dto.stock || 0,
            dto.image_url || null
        ]);

        const variantId = result.insertId;

        // Link to attribute values
        if (dto.attribute_value_ids && dto.attribute_value_ids.length > 0) {
            const values = dto.attribute_value_ids.map(avId => [variantId, avId]);
            await conn.query(
                'INSERT INTO variant_attribute_values (variant_id, attribute_value_id) VALUES ?',
                [values]
            );
        }

        await conn.commit();
        return (await findById(variantId))!;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

export const updateVariant = async (id: number, dto: Partial<CreateProductVariantDto>): Promise<ProductVariant | null> => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Update basic fields
        const fields: string[] = [];
        const values: any[] = [];

        if (dto.sku !== undefined) { fields.push('sku = ?'); values.push(dto.sku); }
        if (dto.price !== undefined) { fields.push('price = ?'); values.push(dto.price); }
        if (dto.stock !== undefined) { fields.push('stock = ?'); values.push(dto.stock); }
        if (dto.image_url !== undefined) { fields.push('image_url = ?'); values.push(dto.image_url); }

        if (fields.length > 0) {
            values.push(id);
            await conn.query(`UPDATE product_variants SET ${fields.join(', ')} WHERE id = ?`, values);
        }

        // Update attribute values if provided
        if (dto.attribute_value_ids) {
            await conn.query('DELETE FROM variant_attribute_values WHERE variant_id = ?', [id]);
            if (dto.attribute_value_ids.length > 0) {
                const attrValues = dto.attribute_value_ids.map(avId => [id, avId]);
                await conn.query(
                    'INSERT INTO variant_attribute_values (variant_id, attribute_value_id) VALUES ?',
                    [attrValues]
                );
            }
        }

        await conn.commit();
        return findById(id);
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

export const deleteVariant = async (id: number): Promise<boolean> => {
    const [result] = await pool.query<ResultSetHeader>(
        'UPDATE product_variants SET is_active = 0 WHERE id = ?',
        [id]
    );
    return result.affectedRows > 0;
};

export const deleteVariantsByProductId = async (productId: number): Promise<number> => {
    const [result] = await pool.query<ResultSetHeader>(
        'DELETE FROM product_variants WHERE product_id = ?',
        [productId]
    );
    return result.affectedRows;
};

// ==================== VARIANT GENERATION ====================


function cartesianProduct<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]];

    return arrays.reduce((acc, arr) => {
        const result: T[][] = [];
        acc.forEach(existing => {
            arr.forEach(value => {
                result.push([...existing, value]);
            });
        });
        return result;
    }, [[]] as T[][]);
}

/**
 * Generate SKU from product code and attribute values
 */
async function generateVariantSku(productSku: string, attributeValueIds: number[]): Promise<string> {
    const attributeValues = await attributeRepo.getAttributeValuesByIds(attributeValueIds);
    const parts = [productSku, ...attributeValues.map(av => av.value.toUpperCase().replace(/\s+/g, ''))];
    return parts.join('-');
}

/**
 * Generate all variant combinations for a product
 */
export const generateVariants = async (dto: GenerateVariantsDto): Promise<ProductVariant[]> => {
    const { product_id, attributes, base_price = 0, base_stock = 0 } = dto;

    // Get product SKU
    const [productRows] = await pool.query<RowDataPacket[]>(
        'SELECT sku FROM products WHERE id = ?',
        [product_id]
    );

    if (productRows.length === 0) {
        throw new Error('Product not found');
    }

    const productSku = productRows[0].sku;

    // Build arrays of value IDs for each attribute
    const valueIdArrays: number[][] = attributes.map(attr => attr.value_ids);

    // Generate all combinations
    const combinations = cartesianProduct(valueIdArrays);

    if (combinations.length === 0 || combinations[0].length === 0) {
        throw new Error('No attribute values selected');
    }

    const conn = await pool.getConnection();
    const createdVariants: ProductVariant[] = [];

    try {
        await conn.beginTransaction();

        // First, update product to has_variants = 1
        await conn.query('UPDATE products SET has_variants = 1 WHERE id = ?', [product_id]);

        for (const combo of combinations) {
            // Generate unique SKU
            const sku = await generateVariantSku(productSku, combo);

            // Check if variant with this SKU already exists
            const [existing] = await conn.query<RowDataPacket[]>(
                'SELECT id FROM product_variants WHERE sku = ?',
                [sku]
            );

            if (existing.length > 0) {
                // Skip if already exists
                continue;
            }

            // Create variant
            const [result] = await conn.query<ResultSetHeader>(`
                INSERT INTO product_variants (product_id, sku, price, stock)
                VALUES (?, ?, ?, ?)
            `, [product_id, sku, base_price, base_stock]);

            const variantId = result.insertId;

            // Link to attribute values
            if (combo.length > 0) {
                const values = combo.map(avId => [variantId, avId]);
                await conn.query(
                    'INSERT INTO variant_attribute_values (variant_id, attribute_value_id) VALUES ?',
                    [values]
                );
            }
        }

        await conn.commit();

        // Return all variants for this product
        return findByProductId(product_id);
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

/**
 * Create a default variant for a product without variations
 */
export const createDefaultVariant = async (productId: number, productSku: string, price: number): Promise<number> => {
    const [result] = await pool.query<ResultSetHeader>(`
        INSERT INTO product_variants (product_id, sku, price, stock, is_active)
        VALUES (?, ?, ?, 0, 1)
        ON DUPLICATE KEY UPDATE updated_at = NOW()
    `, [productId, `${productSku}-DEFAULT`, price]);

    return result.insertId;
};

/**
 * Update stock for a variant
 */
export const updateStock = async (id: number, quantityChange: number): Promise<boolean> => {
    const [result] = await pool.query<ResultSetHeader>(`
        UPDATE product_variants SET stock = stock + ? WHERE id = ? AND is_active = 1
    `, [quantityChange, id]);

    return result.affectedRows > 0;
};

/**
 * Check if variant has sufficient stock
 */
export const hasStock = async (variantId: number, quantity: number = 1): Promise<boolean> => {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT stock FROM product_variants WHERE id = ? AND is_active = 1
    `, [variantId]);

    if (rows.length === 0) return false;
    return rows[0].stock >= quantity;
};

/**
 * Find variant by attribute values
 */
export const findByAttributeValues = async (productId: number, attributeValueIds: number[]): Promise<ProductVariant | null> => {
    const variantId = await attributeRepo.findVariantByAttributeValues(productId, attributeValueIds);
    if (!variantId) return null;
    return findById(variantId);
};
