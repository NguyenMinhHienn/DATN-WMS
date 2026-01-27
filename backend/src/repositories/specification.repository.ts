import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface ProductSpecification {
    id: number;
    product_id: number;
    spec_name: string;
    spec_value: string;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
}

export interface CreateSpecificationDto {
    spec_name: string;
    spec_value: string;
    sort_order?: number;
}

export class SpecificationRepository {
    /**
     * Get all specifications for a product
     */
    async getByProductId(productId: number): Promise<ProductSpecification[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT * FROM product_specifications 
            WHERE product_id = ?
            ORDER BY sort_order ASC, id ASC
        `, [productId]);

        return rows as ProductSpecification[];
    }

    /**
     * Get specification by ID
     */
    async getById(id: number): Promise<ProductSpecification | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT * FROM product_specifications WHERE id = ?
        `, [id]);

        return rows.length > 0 ? (rows[0] as ProductSpecification) : null;
    }

    /**
     * Create a new specification
     */
    async create(productId: number, dto: CreateSpecificationDto): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(`
            INSERT INTO product_specifications (product_id, spec_name, spec_value, sort_order)
            VALUES (?, ?, ?, ?)
        `, [productId, dto.spec_name, dto.spec_value, dto.sort_order || 0]);

        return result.insertId;
    }

    /**
     * Create multiple specifications at once
     */
    async createMany(productId: number, specs: CreateSpecificationDto[]): Promise<number[]> {
        if (specs.length === 0) return [];

        const insertIds: number[] = [];
        for (let i = 0; i < specs.length; i++) {
            const spec = specs[i];
            const id = await this.create(productId, {
                ...spec,
                sort_order: spec.sort_order ?? i
            });
            insertIds.push(id);
        }
        return insertIds;
    }

    /**
     * Update a specification
     */
    async update(id: number, dto: Partial<CreateSpecificationDto>): Promise<boolean> {
        const updateFields: string[] = [];
        const values: any[] = [];

        if (dto.spec_name !== undefined) {
            updateFields.push('spec_name = ?');
            values.push(dto.spec_name);
        }
        if (dto.spec_value !== undefined) {
            updateFields.push('spec_value = ?');
            values.push(dto.spec_value);
        }
        if (dto.sort_order !== undefined) {
            updateFields.push('sort_order = ?');
            values.push(dto.sort_order);
        }

        if (updateFields.length === 0) return false;

        values.push(id);
        const [result] = await pool.query<ResultSetHeader>(`
            UPDATE product_specifications SET ${updateFields.join(', ')} WHERE id = ?
        `, values);

        return result.affectedRows > 0;
    }

    /**
     * Delete a specification
     */
    async delete(id: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
            DELETE FROM product_specifications WHERE id = ?
        `, [id]);

        return result.affectedRows > 0;
    }

    /**
     * Delete all specifications for a product
     */
    async deleteByProductId(productId: number): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(`
            DELETE FROM product_specifications WHERE product_id = ?
        `, [productId]);

        return result.affectedRows;
    }

    /**
     * Replace all specifications for a product (delete existing + create new)
     */
    async replaceAll(productId: number, specs: CreateSpecificationDto[]): Promise<number[]> {
        await this.deleteByProductId(productId);
        return this.createMany(productId, specs);
    }
}

export const specificationRepository = new SpecificationRepository();
