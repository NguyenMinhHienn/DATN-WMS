import pool from '../config/database';
import { Warehouse, CreateWarehouseDto, UpdateWarehouseDto, StorageLocation } from '../types';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class WarehouseRepository {
    async findAll(): Promise<Warehouse[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT w.*, u.full_name as manager_name
      FROM warehouses w
      LEFT JOIN users u ON w.manager_id = u.id
      WHERE w.deleted_at IS NULL
      ORDER BY w.name
    `);
        return rows as Warehouse[];
    }

    async findById(id: number): Promise<Warehouse | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT w.*, u.full_name as manager_name
      FROM warehouses w
      LEFT JOIN users u ON w.manager_id = u.id
      WHERE w.id = ? AND w.deleted_at IS NULL
    `, [id]);

        return rows.length > 0 ? (rows[0] as Warehouse) : null;
    }

    async findByCode(code: string): Promise<Warehouse | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM warehouses WHERE code = ? AND deleted_at IS NULL
    `, [code]);

        return rows.length > 0 ? (rows[0] as Warehouse) : null;
    }

    async create(dto: CreateWarehouseDto, userId?: number): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(`
      INSERT INTO warehouses (
        code, name, description, address, city, state_province, postal_code,
        country, phone, email, manager_id, capacity_volume, capacity_weight,
        status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            dto.code,
            dto.name,
            dto.description || null,
            dto.address || null,
            dto.city || null,
            dto.state_province || null,
            dto.postal_code || null,
            dto.country || 'Vietnam',
            dto.phone || null,
            dto.email || null,
            dto.manager_id || null,
            dto.capacity_volume || null,
            dto.capacity_weight || null,
            dto.status || 'active',
            userId || null,
        ]);

        return result.insertId;
    }

    async update(id: number, dto: UpdateWarehouseDto): Promise<boolean> {
        const updateFields: string[] = [];
        const values: any[] = [];

        const fields = [
            'code', 'name', 'description', 'address', 'city', 'state_province',
            'postal_code', 'country', 'phone', 'email', 'manager_id',
            'capacity_volume', 'capacity_weight', 'status'
        ];

        for (const field of fields) {
            if ((dto as any)[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                values.push((dto as any)[field]);
            }
        }

        if (updateFields.length === 0) return false;

        values.push(id);
        const [result] = await pool.query<ResultSetHeader>(`
      UPDATE warehouses SET ${updateFields.join(', ')} WHERE id = ? AND deleted_at IS NULL
    `, values);

        return result.affectedRows > 0;
    }

    async delete(id: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
      UPDATE warehouses SET deleted_at = NOW() WHERE id = ?
    `, [id]);

        return result.affectedRows > 0;
    }

    async getLocations(warehouseId: number): Promise<StorageLocation[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT * FROM storage_locations 
      WHERE warehouse_id = ? AND is_active = 1
      ORDER BY code
    `, [warehouseId]);
        return rows as StorageLocation[];
    }

    async createLocation(warehouseId: number, data: Partial<StorageLocation>): Promise<number> {
        const [result] = await pool.query<ResultSetHeader>(`
      INSERT INTO storage_locations (
        warehouse_id, zone_id, code, aisle, rack, level, bin,
        location_type, barcode, max_weight, max_volume
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            warehouseId,
            data.zone_id || null,
            data.code,
            data.aisle || null,
            data.rack || null,
            data.level || null,
            data.bin || null,
            data.location_type || 'rack',
            data.barcode || null,
            data.max_weight || null,
            data.max_volume || null,
        ]);

        return result.insertId;
    }
}

export const warehouseRepository = new WarehouseRepository();
