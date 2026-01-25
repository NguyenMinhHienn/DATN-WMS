import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import {
    Attribute,
    AttributeValue,
    CreateAttributeDto,
    CreateAttributeValueDto
} from '../types';

// ==================== ATTRIBUTES ====================

export const getAllAttributes = async (includeValues = false): Promise<Attribute[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT id, name, display_name, type, sort_order, is_active, created_at, updated_at
        FROM attributes
        WHERE is_active = 1
        ORDER BY sort_order ASC, name ASC
    `);

    const attributes = rows as Attribute[];

    if (includeValues) {
        for (const attr of attributes) {
            attr.values = await getValuesByAttributeId(attr.id);
        }
    }

    return attributes;
};

export const getAttributeById = async (id: number): Promise<Attribute | null> => {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT id, name, display_name, type, sort_order, is_active, created_at, updated_at
        FROM attributes
        WHERE id = ?
    `, [id]);

    if (rows.length === 0) return null;

    const attribute = rows[0] as Attribute;
    attribute.values = await getValuesByAttributeId(id);

    return attribute;
};

export const getAttributeByName = async (name: string): Promise<Attribute | null> => {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT id, name, display_name, type, sort_order, is_active, created_at, updated_at
        FROM attributes
        WHERE name = ?
    `, [name]);

    return rows.length > 0 ? rows[0] as Attribute : null;
};

export const createAttribute = async (data: CreateAttributeDto): Promise<Attribute> => {
    const [result] = await pool.query<ResultSetHeader>(`
        INSERT INTO attributes (name, display_name, type, sort_order)
        VALUES (?, ?, ?, ?)
    `, [
        data.name,
        data.display_name,
        data.type || 'select',
        data.sort_order || 0
    ]);

    return (await getAttributeById(result.insertId))!;
};

export const updateAttribute = async (id: number, data: Partial<CreateAttributeDto>): Promise<Attribute | null> => {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.display_name !== undefined) { fields.push('display_name = ?'); values.push(data.display_name); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }

    if (fields.length === 0) return getAttributeById(id);

    values.push(id);
    await pool.query(`UPDATE attributes SET ${fields.join(', ')} WHERE id = ?`, values);

    return getAttributeById(id);
};

export const deleteAttribute = async (id: number): Promise<boolean> => {
    const [result] = await pool.query<ResultSetHeader>(
        'DELETE FROM attributes WHERE id = ?',
        [id]
    );
    return result.affectedRows > 0;
};

// ==================== ATTRIBUTE VALUES ====================

export const getValuesByAttributeId = async (attributeId: number): Promise<AttributeValue[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT av.*, a.name as attribute_name, a.display_name as attribute_display_name
        FROM attribute_values av
        JOIN attributes a ON a.id = av.attribute_id
        WHERE av.attribute_id = ? AND av.is_active = 1
        ORDER BY av.sort_order ASC, av.display_value ASC
    `, [attributeId]);

    return rows as AttributeValue[];
};

export const getAttributeValueById = async (id: number): Promise<AttributeValue | null> => {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT av.*, a.name as attribute_name, a.display_name as attribute_display_name
        FROM attribute_values av
        JOIN attributes a ON a.id = av.attribute_id
        WHERE av.id = ?
    `, [id]);

    return rows.length > 0 ? rows[0] as AttributeValue : null;
};

export const getAttributeValuesByIds = async (ids: number[]): Promise<AttributeValue[]> => {
    if (ids.length === 0) return [];

    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT av.*, a.name as attribute_name, a.display_name as attribute_display_name
        FROM attribute_values av
        JOIN attributes a ON a.id = av.attribute_id
        WHERE av.id IN (?)
        ORDER BY a.sort_order ASC, av.sort_order ASC
    `, [ids]);

    return rows as AttributeValue[];
};

export const createAttributeValue = async (data: CreateAttributeValueDto): Promise<AttributeValue> => {
    const [result] = await pool.query<ResultSetHeader>(`
        INSERT INTO attribute_values (attribute_id, value, display_value, color_code, image_url, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [
        data.attribute_id,
        data.value,
        data.display_value,
        data.color_code || null,
        data.image_url || null,
        data.sort_order || 0
    ]);

    return (await getAttributeValueById(result.insertId))!;
};

export const updateAttributeValue = async (id: number, data: Partial<CreateAttributeValueDto>): Promise<AttributeValue | null> => {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.value !== undefined) { fields.push('value = ?'); values.push(data.value); }
    if (data.display_value !== undefined) { fields.push('display_value = ?'); values.push(data.display_value); }
    if (data.color_code !== undefined) { fields.push('color_code = ?'); values.push(data.color_code); }
    if (data.image_url !== undefined) { fields.push('image_url = ?'); values.push(data.image_url); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }

    if (fields.length === 0) return getAttributeValueById(id);

    values.push(id);
    await pool.query(`UPDATE attribute_values SET ${fields.join(', ')} WHERE id = ?`, values);

    return getAttributeValueById(id);
};

export const deleteAttributeValue = async (id: number): Promise<boolean> => {
    const [result] = await pool.query<ResultSetHeader>(
        'DELETE FROM attribute_values WHERE id = ?',
        [id]
    );
    return result.affectedRows > 0;
};

// ==================== VARIANT ATTRIBUTE VALUES ====================

export const getVariantAttributeValues = async (variantId: number): Promise<AttributeValue[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT av.*, a.name as attribute_name, a.display_name as attribute_display_name
        FROM variant_attribute_values vav
        JOIN attribute_values av ON av.id = vav.attribute_value_id
        JOIN attributes a ON a.id = av.attribute_id
        WHERE vav.variant_id = ?
        ORDER BY a.sort_order ASC
    `, [variantId]);

    return rows as AttributeValue[];
};

export const linkVariantToAttributeValues = async (variantId: number, attributeValueIds: number[]): Promise<void> => {
    // Clear existing links
    await pool.query('DELETE FROM variant_attribute_values WHERE variant_id = ?', [variantId]);

    // Insert new links
    if (attributeValueIds.length > 0) {
        const values = attributeValueIds.map(avId => [variantId, avId]);
        await pool.query(
            'INSERT INTO variant_attribute_values (variant_id, attribute_value_id) VALUES ?',
            [values]
        );
    }
};

export const findVariantByAttributeValues = async (productId: number, attributeValueIds: number[]): Promise<number | null> => {
    if (attributeValueIds.length === 0) return null;

    // Find variant that has exactly these attribute values
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT pv.id
        FROM product_variants pv
        WHERE pv.product_id = ?
          AND pv.is_active = 1
          AND (
              SELECT COUNT(*) 
              FROM variant_attribute_values vav 
              WHERE vav.variant_id = pv.id
          ) = ?
          AND (
              SELECT COUNT(*) 
              FROM variant_attribute_values vav 
              WHERE vav.variant_id = pv.id 
                AND vav.attribute_value_id IN (?)
          ) = ?
    `, [productId, attributeValueIds.length, attributeValueIds, attributeValueIds.length]);

    return rows.length > 0 ? rows[0].id : null;
};

// ==================== PRODUCT ATTRIBUTES (which attributes a product uses) ====================

export const getProductAttributes = async (productId: number): Promise<Attribute[]> => {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT DISTINCT a.*
        FROM attributes a
        JOIN attribute_values av ON av.attribute_id = a.id
        JOIN variant_attribute_values vav ON vav.attribute_value_id = av.id
        JOIN product_variants pv ON pv.id = vav.variant_id
        WHERE pv.product_id = ?
        ORDER BY a.sort_order ASC
    `, [productId]);

    const attributes = rows as Attribute[];

    // Get values used by this product for each attribute
    for (const attr of attributes) {
        const [valueRows] = await pool.query<RowDataPacket[]>(`
            SELECT DISTINCT av.*
            FROM attribute_values av
            JOIN variant_attribute_values vav ON vav.attribute_value_id = av.id
            JOIN product_variants pv ON pv.id = vav.variant_id
            WHERE pv.product_id = ? AND av.attribute_id = ?
            ORDER BY av.sort_order ASC
        `, [productId, attr.id]);

        attr.values = valueRows as AttributeValue[];
    }

    return attributes;
};
