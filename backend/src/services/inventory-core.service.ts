import pool from '../config/database';
import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * Inventory Core Service
 * 
 * NGUỒN CHÂN LÝ DUY NHẤT cho mọi thay đổi tồn kho.
 * Mọi nghiệp vụ (nhập kho, xuất kho, đặt hàng, hủy đơn) phải gọi qua service này.
 * 
 * Bốn nghiệp vụ cốt lõi:
 * - importStock:   Nhập kho         → on_hand += qty
 * - reserveStock:  Giữ hàng         → reserved += qty (check available >= qty)
 * - exportStock:   Xuất kho         → on_hand -= qty, reserved -= qty
 * - releaseStock:  Hủy giữ hàng     → reserved -= qty
 * 
 * Tất cả đều:
 * - Nhận connection để chạy trong transaction của caller
 * - Dùng SELECT ... FOR UPDATE để lock row (tránh race condition)
 * - Ghi log vào inventory_logs
 * - Sync product_variants.stock = tổng on_hand từ tất cả kho
 */

export interface StockChangeParams {
    connection: PoolConnection;
    productId: number;
    variantId: number;
    warehouseId: number;
    quantity: number;
    referenceType: string;   // 'stock_transfer' | 'order' | 'adjustment'
    referenceId: number;
    referenceNumber?: string;
    reason?: string;
    userId?: number;
    unitCost?: number;
}

interface InventoryRow {
    id: number;
    product_id: number;
    product_variant_id: number;
    warehouse_id: number;
    quantity_on_hand: number;
    quantity_reserved: number;
    unit_cost: number;
}

interface LogData {
    inventoryId: number;
    productId: number;
    variantId: number;
    warehouseId: number;
    movementType: string;
    qtyBefore: number;
    qtyChange: number;
    qtyAfter: number;
    referenceType: string;
    referenceId: number;
    referenceNumber?: string;
    reason?: string;
    userId?: number;
    unitCost?: number;
}

class InventoryCoreService {

    /**
     * NHẬP KHO (IMPORT)
     * Tăng on_hand theo số lượng nhập.
     * Tự tạo inventory record nếu chưa tồn tại.
     */
    async importStock(params: StockChangeParams): Promise<void> {
        const { connection, productId, variantId, warehouseId, quantity, unitCost } = params;

        if (quantity <= 0) {
            throw new Error('Số lượng nhập phải > 0');
        }

        // Lock row or create new
        const inv = await this.getOrCreateInventory(connection, productId, variantId, warehouseId, unitCost);

        const qtyBefore = inv.quantity_on_hand;
        const qtyAfter = qtyBefore + quantity;

        // Update on_hand
        await connection.query(
            `UPDATE inventories 
             SET quantity_on_hand = ?, last_movement_date = NOW(), updated_at = NOW()
             WHERE id = ?`,
            [qtyAfter, inv.id]
        );

        // Log
        await this.logMovement(connection, {
            inventoryId: inv.id,
            productId, variantId, warehouseId,
            movementType: 'IMPORT',
            qtyBefore, qtyChange: quantity, qtyAfter,
            referenceType: params.referenceType,
            referenceId: params.referenceId,
            referenceNumber: params.referenceNumber,
            reason: params.reason,
            userId: params.userId,
            unitCost: params.unitCost,
        });

        // Sync variant stock
        await this.syncVariantStock(connection, variantId);

        console.log(`[InventoryCore] IMPORT: variant=${variantId}, warehouse=${warehouseId}, qty=${quantity}, on_hand: ${qtyBefore} → ${qtyAfter}`);
    }

    /**
     * GIỮ HÀNG (RESERVE)
     * Khi tạo đơn hàng hoặc tạo phiếu xuất draft.
     * Kiểm tra available >= quantity trước khi tăng reserved.
     */
    async reserveStock(params: StockChangeParams): Promise<void> {
        const { connection, productId, variantId, warehouseId, quantity } = params;

        if (quantity <= 0) {
            throw new Error('Số lượng giữ phải > 0');
        }

        // Lock row
        const inv = await this.lockInventory(connection, productId, variantId, warehouseId);
        if (!inv) {
            throw new Error(
                `Không tìm thấy tồn kho cho variant ${variantId} tại kho ${warehouseId}`
            );
        }

        const available = inv.quantity_on_hand - inv.quantity_reserved;
        if (available < quantity) {
            throw new Error(
                `Không đủ hàng. Có sẵn: ${available}, Yêu cầu: ${quantity} (variant ${variantId})`
            );
        }

        const reservedBefore = inv.quantity_reserved;
        const reservedAfter = reservedBefore + quantity;

        // Update reserved
        await connection.query(
            `UPDATE inventories 
             SET quantity_reserved = ?, updated_at = NOW()
             WHERE id = ?`,
            [reservedAfter, inv.id]
        );

        // Log
        await this.logMovement(connection, {
            inventoryId: inv.id,
            productId, variantId, warehouseId,
            movementType: 'RESERVE',
            qtyBefore: inv.quantity_on_hand,
            qtyChange: quantity,
            qtyAfter: inv.quantity_on_hand, // on_hand doesn't change
            referenceType: params.referenceType,
            referenceId: params.referenceId,
            referenceNumber: params.referenceNumber,
            reason: params.reason,
            userId: params.userId,
            unitCost: params.unitCost,
        });

        console.log(`[InventoryCore] RESERVE: variant=${variantId}, qty=${quantity}, reserved: ${reservedBefore} → ${reservedAfter}, available: ${available} → ${available - quantity}`);
    }

    /**
     * XUẤT KHO (EXPORT)
     * Khi admin duyệt phiếu xuất.
     * Giảm cả on_hand và reserved.
     */
    async exportStock(params: StockChangeParams): Promise<void> {
        const { connection, productId, variantId, warehouseId, quantity } = params;

        if (quantity <= 0) {
            throw new Error('Số lượng xuất phải > 0');
        }

        // Lock row
        const inv = await this.lockInventory(connection, productId, variantId, warehouseId);
        if (!inv) {
            throw new Error(
                `Không tìm thấy tồn kho cho variant ${variantId} tại kho ${warehouseId}`
            );
        }

        // Validate: on_hand must be >= quantity
        if (inv.quantity_on_hand < quantity) {
            throw new Error(
                `Không đủ tồn kho thực tế. Tồn: ${inv.quantity_on_hand}, Yêu cầu: ${quantity} (variant ${variantId})`
            );
        }

        const onHandBefore = inv.quantity_on_hand;
        const onHandAfter = onHandBefore - quantity;

        // Giảm reserved (nếu có reserved cho số lượng này, không cho < 0)
        const reservedDecrease = Math.min(inv.quantity_reserved, quantity);
        const reservedAfter = inv.quantity_reserved - reservedDecrease;

        // Validate: final values must be >= 0
        if (onHandAfter < 0 || reservedAfter < 0) {
            throw new Error(
                `Xuất kho sẽ dẫn đến tồn kho âm. on_hand: ${onHandAfter}, reserved: ${reservedAfter}`
            );
        }

        // Update
        await connection.query(
            `UPDATE inventories 
             SET quantity_on_hand = ?, quantity_reserved = ?, last_movement_date = NOW(), updated_at = NOW()
             WHERE id = ?`,
            [onHandAfter, reservedAfter, inv.id]
        );

        // Log
        await this.logMovement(connection, {
            inventoryId: inv.id,
            productId, variantId, warehouseId,
            movementType: 'EXPORT',
            qtyBefore: onHandBefore,
            qtyChange: -quantity,
            qtyAfter: onHandAfter,
            referenceType: params.referenceType,
            referenceId: params.referenceId,
            referenceNumber: params.referenceNumber,
            reason: params.reason,
            userId: params.userId,
            unitCost: params.unitCost,
        });

        // Sync variant stock
        await this.syncVariantStock(connection, variantId);

        console.log(`[InventoryCore] EXPORT: variant=${variantId}, qty=${quantity}, on_hand: ${onHandBefore} → ${onHandAfter}, reserved: ${inv.quantity_reserved} → ${reservedAfter}`);
    }

    /**
     * HỦY GIỮ HÀNG (RELEASE)
     * Khi hủy đơn hàng hoặc hủy phiếu xuất.
     * Giảm reserved, on_hand không đổi.
     */
    async releaseStock(params: StockChangeParams): Promise<void> {
        const { connection, productId, variantId, warehouseId, quantity } = params;

        if (quantity <= 0) {
            throw new Error('Số lượng hủy giữ phải > 0');
        }

        // Lock row
        const inv = await this.lockInventory(connection, productId, variantId, warehouseId);
        if (!inv) {
            throw new Error(
                `Không tìm thấy tồn kho cho variant ${variantId} tại kho ${warehouseId}`
            );
        }

        // Giảm reserved, đảm bảo không < 0
        const releaseQty = Math.min(inv.quantity_reserved, quantity);
        const reservedAfter = inv.quantity_reserved - releaseQty;

        await connection.query(
            `UPDATE inventories 
             SET quantity_reserved = ?, updated_at = NOW()
             WHERE id = ?`,
            [reservedAfter, inv.id]
        );

        // Log
        await this.logMovement(connection, {
            inventoryId: inv.id,
            productId, variantId, warehouseId,
            movementType: 'RELEASE',
            qtyBefore: inv.quantity_on_hand,
            qtyChange: releaseQty,
            qtyAfter: inv.quantity_on_hand, // on_hand doesn't change
            referenceType: params.referenceType,
            referenceId: params.referenceId,
            referenceNumber: params.referenceNumber,
            reason: params.reason,
            userId: params.userId,
            unitCost: params.unitCost,
        });

        console.log(`[InventoryCore] RELEASE: variant=${variantId}, qty=${releaseQty}, reserved: ${inv.quantity_reserved} → ${reservedAfter}`);
    }

    // ========================
    // HELPER: Kiểm tra available
    // ========================
    async getAvailableStock(variantId: number, warehouseId: number): Promise<number> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(quantity_on_hand - quantity_reserved), 0) AS available
             FROM inventories
             WHERE product_variant_id = ? AND warehouse_id = ? AND status = 'available'`,
            [variantId, warehouseId]
        );
        return Number(rows[0]?.available) || 0;
    }

    /**
     * Lấy tổng available stock cho variant ở TẤT CẢ kho
     */
    async getTotalAvailableStock(variantId: number): Promise<number> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(quantity_on_hand - quantity_reserved), 0) AS available
             FROM inventories
             WHERE product_variant_id = ? AND status = 'available'`,
            [variantId]
        );
        return Number(rows[0]?.available) || 0;
    }

    // ========================
    // PRIVATE HELPERS
    // ========================

    /**
     * Lock inventory row with SELECT ... FOR UPDATE
     */
    private async lockInventory(
        connection: PoolConnection,
        productId: number,
        variantId: number,
        warehouseId: number
    ): Promise<InventoryRow | null> {
        const [rows] = await connection.query<RowDataPacket[]>(
            `SELECT * FROM inventories
             WHERE product_variant_id = ? AND warehouse_id = ? AND status = 'available'
             FOR UPDATE`,
            [variantId, warehouseId]
        );

        if (rows.length === 0) {
            // Fallback: try with product_id (backward compatibility)
            const [rows2] = await connection.query<RowDataPacket[]>(
                `SELECT * FROM inventories
                 WHERE product_id = ? AND warehouse_id = ? AND product_variant_id IS NULL AND status = 'available'
                 FOR UPDATE`,
                [productId, warehouseId]
            );
            return rows2.length > 0 ? (rows2[0] as InventoryRow) : null;
        }

        return rows[0] as InventoryRow;
    }

    /**
     * Get or create inventory record (used for IMPORT)
     */
    private async getOrCreateInventory(
        connection: PoolConnection,
        productId: number,
        variantId: number,
        warehouseId: number,
        unitCost?: number
    ): Promise<InventoryRow> {
        // Try to lock existing
        const [existing] = await connection.query<RowDataPacket[]>(
            `SELECT * FROM inventories
             WHERE product_variant_id = ? AND warehouse_id = ? AND status = 'available'
             FOR UPDATE`,
            [variantId, warehouseId]
        );

        if (existing.length > 0) {
            return existing[0] as InventoryRow;
        }

        // Create new inventory record
        const [result] = await connection.query<ResultSetHeader>(
            `INSERT INTO inventories (
                product_id, product_variant_id, warehouse_id,
                quantity_on_hand, quantity_reserved, unit_cost,
                status, last_movement_date
             ) VALUES (?, ?, ?, 0, 0, ?, 'available', NOW())`,
            [productId, variantId, warehouseId, unitCost || 0]
        );

        return {
            id: result.insertId,
            product_id: productId,
            product_variant_id: variantId,
            warehouse_id: warehouseId,
            quantity_on_hand: 0,
            quantity_reserved: 0,
            unit_cost: unitCost || 0,
        };
    }

    /**
     * Ghi log biến động tồn kho
     */
    private async logMovement(connection: PoolConnection, data: LogData): Promise<void> {
        await connection.query(
            `INSERT INTO inventory_logs (
                inventory_id, product_id, product_variant_id, warehouse_id,
                movement_type, reference_type, reference_id, reference_number,
                quantity_before, quantity_change, quantity_after,
                unit_cost, total_cost, reason, performed_by
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.inventoryId,
                data.productId,
                data.variantId,
                data.warehouseId,
                data.movementType,
                data.referenceType,
                data.referenceId,
                data.referenceNumber || null,
                data.qtyBefore,
                data.qtyChange,
                data.qtyAfter,
                data.unitCost || 0,
                Math.abs(data.qtyChange) * (data.unitCost || 0),
                data.reason || null,
                data.userId || null,
            ]
        );
    }

    /**
     * Sync product_variants.stock = tổng on_hand từ inventories
     * Giữ backward compatibility cho các phần code cũ đọc variant.stock
     */
    private async syncVariantStock(connection: PoolConnection, variantId: number): Promise<void> {
        await connection.query(
            `UPDATE product_variants pv
             SET pv.stock = (
                 SELECT COALESCE(SUM(i.quantity_on_hand), 0)
                 FROM inventories i
                 WHERE i.product_variant_id = pv.id AND i.status = 'available'
             ),
             pv.updated_at = NOW()
             WHERE pv.id = ?`,
            [variantId]
        );
    }
}

export const inventoryCoreService = new InventoryCoreService();
