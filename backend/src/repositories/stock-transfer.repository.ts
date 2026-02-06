import pool from '../config/database';
import {
    StockTransfer,
    StockTransferItem,
    CreateStockTransferDto,
    PaginatedResult
} from '../types';
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';

/**
 * Stock Transfer Repository
 * Xử lý các thao tác CSDL cho phiếu chuyển/nhập/xuất kho
 * 
 * QUY TẮC QUAN TRỌNG:
 * - Chỉ cập nhật tồn kho khi ADMIN duyệt phiếu (approve)
 * - STAFF chỉ tạo phiếu với trạng thái PENDING
 */
export class StockTransferRepository {

    /**
     * Lấy danh sách phiếu - dùng cho ADMIN (xem tất cả)
     */
    async findAll(
        page: number = 1,
        limit: number = 10,
        status?: string,
        transferType?: string,
        startDate?: string,
        endDate?: string
    ): Promise<PaginatedResult<StockTransfer>> {
        let countQuery = 'SELECT COUNT(*) as total FROM stock_transfers WHERE deleted_at IS NULL';
        let dataQuery = `
            SELECT st.*, 
                   sw.name as source_warehouse_name,
                   dw.name as destination_warehouse_name,
                   u.full_name as created_by_name,
                   au.full_name as approved_by_name
            FROM stock_transfers st
            LEFT JOIN warehouses sw ON st.source_warehouse_id = sw.id
            LEFT JOIN warehouses dw ON st.destination_warehouse_id = dw.id
            LEFT JOIN users u ON st.created_by = u.id
            LEFT JOIN users au ON st.approved_by = au.id
            WHERE st.deleted_at IS NULL
        `;
        const params: any[] = [];
        const countParams: any[] = [];

        if (status) {
            dataQuery += ' AND st.status = ?';
            countQuery += ' AND status = ?';
            params.push(status);
            countParams.push(status);
        }

        if (transferType) {
            dataQuery += ' AND st.transfer_type = ?';
            countQuery += ' AND transfer_type = ?';
            params.push(transferType);
            countParams.push(transferType);
        }

        if (startDate) {
            dataQuery += ' AND st.transfer_date >= ?';
            countQuery += ' AND transfer_date >= ?';
            params.push(startDate);
            countParams.push(startDate);
        }

        if (endDate) {
            dataQuery += ' AND st.transfer_date <= ?';
            countQuery += ' AND transfer_date <= ?';
            params.push(endDate);
            countParams.push(endDate);
        }

        dataQuery += ' ORDER BY st.created_at DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        params.push(limit, offset);

        const [countRows] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const total = countRows[0].total;

        const [rows] = await pool.query<RowDataPacket[]>(dataQuery, params);

        return {
            data: rows as StockTransfer[],
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Lấy danh sách phiếu theo người tạo - dùng cho STAFF (chỉ xem phiếu của mình)
     */
    async findByCreator(
        creatorId: number,
        page: number = 1,
        limit: number = 10,
        status?: string
    ): Promise<PaginatedResult<StockTransfer>> {
        let countQuery = 'SELECT COUNT(*) as total FROM stock_transfers WHERE deleted_at IS NULL AND created_by = ?';
        let dataQuery = `
            SELECT st.*, 
                   sw.name as source_warehouse_name,
                   dw.name as destination_warehouse_name,
                   u.full_name as created_by_name,
                   au.full_name as approved_by_name
            FROM stock_transfers st
            LEFT JOIN warehouses sw ON st.source_warehouse_id = sw.id
            LEFT JOIN warehouses dw ON st.destination_warehouse_id = dw.id
            LEFT JOIN users u ON st.created_by = u.id
            LEFT JOIN users au ON st.approved_by = au.id
            WHERE st.deleted_at IS NULL AND st.created_by = ?
        `;
        const params: any[] = [creatorId];
        const countParams: any[] = [creatorId];

        if (status) {
            dataQuery += ' AND st.status = ?';
            countQuery += ' AND status = ?';
            params.push(status);
            countParams.push(status);
        }

        dataQuery += ' ORDER BY st.created_at DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        params.push(limit, offset);

        const [countRows] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const total = countRows[0].total;

        const [rows] = await pool.query<RowDataPacket[]>(dataQuery, params);

        return {
            data: rows as StockTransfer[],
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Lấy chi tiết phiếu theo ID
     */
    async findById(id: number): Promise<StockTransfer | null> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT st.*, 
                   sw.name as source_warehouse_name,
                   dw.name as destination_warehouse_name,
                   u.full_name as created_by_name,
                   au.full_name as approved_by_name,
                   ru.full_name as rejected_by_name
            FROM stock_transfers st
            LEFT JOIN warehouses sw ON st.source_warehouse_id = sw.id
            LEFT JOIN warehouses dw ON st.destination_warehouse_id = dw.id
            LEFT JOIN users u ON st.created_by = u.id
            LEFT JOIN users au ON st.approved_by = au.id
            LEFT JOIN users ru ON st.rejected_by = ru.id
            WHERE st.id = ? AND st.deleted_at IS NULL
        `, [id]);

        return rows.length > 0 ? (rows[0] as StockTransfer) : null;
    }

    /**
     * Lấy danh sách items của phiếu
     */
    async getItems(transferId: number): Promise<StockTransferItem[]> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT sti.*, p.name as product_name, p.sku
            FROM stock_transfer_items sti
            INNER JOIN products p ON sti.product_id = p.id
            WHERE sti.stock_transfer_id = ?
        `, [transferId]);

        return rows as StockTransferItem[];
    }


    /**
     * Sinh mã phiếu tự động: TR-YYYY-XXXXXX
     * Nhận connection để đảm bảo trong cùng một transaction
     */
    async generateTransferNumber(connection?: PoolConnection): Promise<string> {
        const year = new Date().getFullYear();
        const queryExecutor = connection || pool;
        const [rows] = await queryExecutor.query<RowDataPacket[]>(`
            SELECT COUNT(*) as count FROM stock_transfers 
            WHERE YEAR(created_at) = ?
        `, [year]);

        const count = rows[0].count + 1;
        return `TR-${year}-${count.toString().padStart(6, '0')}`;
    }

    /**
     * Tạo phiếu mới - STAFF tạo với trạng thái PENDING
     * 
     * Đối với IMPORT với sản phẩm mới:
     * - Nếu có product_name và product_sku, tạo sản phẩm mới trong bảng products
     * - Sau đó dùng product_id đó cho transfer item
     */
    async create(dto: CreateStockTransferDto, userId: number): Promise<number> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            console.log('[Repository] Starting transaction for transfer creation...');

            const transferNumber = await this.generateTransferNumber(connection);

            // Tính tổng
            let totalItems = dto.items.length;
            let totalQuantity = 0;
            let totalValue = 0;

            for (const item of dto.items) {
                const qty = item.quantity_requested ?? 0;
                const cost = item.unit_cost ?? 0;
                totalQuantity += qty;
                totalValue += qty * cost;
            }

            // Xử lý warehouse IDs - schema yêu cầu cả 2
            // Với IMPORT: source và dest giống nhau (nhập vào cùng 1 kho)
            const sourceWarehouseId = dto.source_warehouse_id || dto.destination_warehouse_id;
            const destWarehouseId = dto.destination_warehouse_id || dto.source_warehouse_id;

            // Insert phiếu với trạng thái PENDING
            // Bao gồm transfer_type để xác định loại phiếu
            const [result] = await connection.query<ResultSetHeader>(`
                INSERT INTO stock_transfers (
                    transfer_number, transfer_type,
                    source_warehouse_id, destination_warehouse_id,
                    transfer_date, expected_arrival_date,
                    total_items, total_quantity, total_value,
                    status, reason, notes, requested_by, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
            `, [
                transferNumber,
                dto.transfer_type || 'IMPORT', // Mặc định là IMPORT
                sourceWarehouseId,
                destWarehouseId,
                dto.transfer_date || new Date().toISOString().split('T')[0],
                dto.expected_arrival_date || null,
                totalItems,
                totalQuantity,
                totalValue,
                dto.reason || null,
                dto.notes || null,
                userId,
                userId,
            ]);

            const transferId = result.insertId;

            // Insert items - tự động tạo product nếu cần
            for (const item of dto.items) {
                let productId = item.product_id;

                // Nếu không có product_id nhưng có thông tin sản phẩm mới, tạo sản phẩm
                if (!productId && item.product_name) {
                    productId = await this.findOrCreateProduct(
                        connection,
                        item.product_name,
                        item.product_sku,
                        item.product_image_url,
                        item.unit_cost ?? 0
                    );
                }

                const qty = item.quantity_requested ?? 0;
                const cost = item.unit_cost ?? 0;
                const lineTotal = qty * cost;

                await connection.query(`
                    INSERT INTO stock_transfer_items (
                        stock_transfer_id, product_id,
                        quantity_requested, unit_cost, line_total,
                        batch_number, expiry_date, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
                `, [
                    transferId,
                    productId,
                    qty,
                    cost,
                    lineTotal,
                    item.batch_number || null,
                    item.expiry_date || null,
                ]);
            }

            await connection.commit();
            return transferId;
        } catch (error) {
            await connection.rollback();
            console.error('[StockTransferRepository] Error creating transfer:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Tìm hoặc tạo sản phẩm trong bảng products
     * Dùng cho phiếu IMPORT khi staff nhập thông tin sản phẩm mới
     * Sản phẩm mới sẽ có status = 'draft' cho đến khi phiếu được duyệt
     */
    private async findOrCreateProduct(
        connection: PoolConnection,
        name: string,
        sku?: string,
        imageUrl?: string,
        costPrice?: number
    ): Promise<number> {
        // Tự động tạo SKU nếu không có
        const finalSku = sku || `SKU-${Date.now()}`;

        try {
            // Kiểm tra xem SKU đã tồn tại chưa
            const [existing] = await connection.query<RowDataPacket[]>(
                'SELECT id FROM products WHERE sku = ? LIMIT 1',
                [finalSku]
            );

            if (existing.length > 0) {
                return existing[0].id;
            }

            // Tạo sản phẩm mới với status = 'draft' (chờ duyệt)
            const [result] = await connection.query<ResultSetHeader>(`
                INSERT INTO products (
                    sku, name, description, category_id, unit_id,
                    cost_price, selling_price, image_url, status
                ) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, 'draft')
            `, [
                finalSku,
                name,
                `Sản phẩm nhập kho: ${name}`,
                costPrice || 0,
                costPrice ? Math.round(costPrice * 1.2) : 0,
                imageUrl || null
            ]);

            console.log(`[Repository] Created new DRAFT product: ${finalSku} - ${name} (ID: ${result.insertId})`);
            return result.insertId;
        } catch (error: any) {
            console.error('[Repository] Error creating product:', error.message);
            throw new Error(`Không thể tạo sản phẩm: ${error.message}`);
        }
    }

    /**
     * Kiểm tra tồn kho đủ để xuất
     */
    async checkSufficientStock(
        warehouseId: number,
        productId: number,
        quantity: number
    ): Promise<{ sufficient: boolean; available: number }> {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT COALESCE(SUM(quantity_on_hand - quantity_reserved), 0) as available
            FROM inventories
            WHERE warehouse_id = ? AND product_id = ? AND status = 'available'
        `, [warehouseId, productId]);

        const available = rows[0]?.available || 0;
        return {
            sufficient: available >= quantity,
            available
        };
    }

    /**
     * DUYỆT PHIẾU - Chỉ ADMIN mới được gọi hàm này
     * 
     * Logic cập nhật tồn kho:
     * - IMPORT: Cộng vào kho đích (destination_warehouse_id)
     * - EXPORT: Trừ từ kho nguồn (source_warehouse_id), kiểm tra đủ tồn
     * - TRANSFER: Trừ kho nguồn + Cộng kho đích
     * 
     * Sử dụng transaction để đảm bảo atomic operation
     */
    async approve(id: number, adminUserId: number): Promise<boolean> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Lấy thông tin phiếu
            const transfer = await this.findById(id);
            if (!transfer) {
                throw new Error('Transfer not found');
            }

            // Chỉ duyệt phiếu đang PENDING
            if (transfer.status !== 'pending') {
                throw new Error(`Cannot approve transfer with status: ${transfer.status}`);
            }

            const items = await this.getItems(id);

            // Xử lý theo loại phiếu
            for (const item of items) {
                switch (transfer.transfer_type) {
                    case 'IMPORT':
                        // Nhập kho: Cộng vào kho đích
                        await this.addToInventory(
                            connection,
                            transfer.destination_warehouse_id!,
                            item.product_id,
                            item.quantity_requested,
                            item.unit_cost,
                            id,
                            transfer.transfer_number,
                            adminUserId
                        );
                        // Kích hoạt sản phẩm draft (nếu là sản phẩm mới tạo từ phiếu nhập)
                        await connection.query(`
                            UPDATE products 
                            SET status = 'active' 
                            WHERE id = ? AND status = 'draft'
                        `, [item.product_id]);
                        break;

                    case 'EXPORT':
                        // Xuất kho: Trừ từ kho nguồn (kiểm tra đủ tồn)
                        const exportCheck = await this.checkSufficientStock(
                            transfer.source_warehouse_id!,
                            item.product_id,
                            item.quantity_requested
                        );
                        if (!exportCheck.sufficient) {
                            throw new Error(
                                `Insufficient stock for product ID ${item.product_id}. ` +
                                `Required: ${item.quantity_requested}, Available: ${exportCheck.available}`
                            );
                        }
                        await this.subtractFromInventory(
                            connection,
                            transfer.source_warehouse_id!,
                            item.product_id,
                            item.quantity_requested,
                            id,
                            transfer.transfer_number,
                            adminUserId
                        );
                        break;

                    case 'TRANSFER':
                        // Chuyển kho: Trừ nguồn + Cộng đích
                        const transferCheck = await this.checkSufficientStock(
                            transfer.source_warehouse_id!,
                            item.product_id,
                            item.quantity_requested
                        );
                        if (!transferCheck.sufficient) {
                            throw new Error(
                                `Insufficient stock for product ID ${item.product_id}. ` +
                                `Required: ${item.quantity_requested}, Available: ${transferCheck.available}`
                            );
                        }
                        // Trừ kho nguồn
                        await this.subtractFromInventory(
                            connection,
                            transfer.source_warehouse_id!,
                            item.product_id,
                            item.quantity_requested,
                            id,
                            transfer.transfer_number,
                            adminUserId
                        );
                        // Cộng kho đích
                        await this.addToInventory(
                            connection,
                            transfer.destination_warehouse_id!,
                            item.product_id,
                            item.quantity_requested,
                            item.unit_cost,
                            id,
                            transfer.transfer_number,
                            adminUserId
                        );
                        break;
                }

                // Cập nhật trạng thái item
                await connection.query(`
                    UPDATE stock_transfer_items 
                    SET status = 'received', quantity_received = quantity_requested
                    WHERE id = ?
                `, [item.id]);
            }

            // Cập nhật trạng thái phiếu
            await connection.query(`
                UPDATE stock_transfers 
                SET status = 'approved', 
                    approved_by = ?, 
                    approved_at = NOW()
                WHERE id = ?
            `, [adminUserId, id]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * TỪ CHỐI PHIẾU - Chỉ ADMIN
     * KHÔNG cập nhật tồn kho, chỉ đổi trạng thái
     * Xóa các sản phẩm draft được tạo từ phiếu này
     */
    async reject(id: number, adminUserId: number, reason?: string): Promise<boolean> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Lấy danh sách product_id từ phiếu
            const items = await this.getItems(id);

            // Xóa các sản phẩm draft được tạo từ phiếu này
            for (const item of items) {
                await connection.query(`
                    DELETE FROM products 
                    WHERE id = ? AND status = 'draft'
                `, [item.product_id]);
            }

            // Cập nhật trạng thái phiếu
            const [result] = await connection.query<ResultSetHeader>(`
                UPDATE stock_transfers 
                SET status = 'rejected', 
                    rejected_by = ?, 
                    rejected_at = NOW(),
                    rejection_reason = ?
                WHERE id = ? AND status = 'pending'
            `, [adminUserId, reason || null, id]);

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Helper: Cộng tồn kho (dùng cho IMPORT và TRANSFER vào)
     */
    private async addToInventory(
        connection: PoolConnection,
        warehouseId: number,
        productId: number,
        quantity: number,
        unitCost: number,
        transferId: number,
        transferNumber: string,
        userId: number
    ): Promise<void> {
        // Tìm inventory record hiện có
        const [existing] = await connection.query<RowDataPacket[]>(`
            SELECT * FROM inventories 
            WHERE product_id = ? AND warehouse_id = ? AND status = 'available'
            LIMIT 1
        `, [productId, warehouseId]);

        if (existing.length > 0) {
            const inv = existing[0];
            // Cập nhật số lượng
            await connection.query(`
                UPDATE inventories 
                SET quantity_on_hand = quantity_on_hand + ?, 
                    last_movement_date = NOW()
                WHERE id = ?
            `, [quantity, inv.id]);

            // Ghi log
            await connection.query(`
                INSERT INTO inventory_logs (
                    inventory_id, product_id, warehouse_id,
                    movement_type, reference_type, reference_id, reference_number,
                    quantity_before, quantity_change, quantity_after,
                    unit_cost, total_cost, performed_by
                ) VALUES (?, ?, ?, 'transfer_in', 'stock_transfer', ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                inv.id, productId, warehouseId,
                transferId, transferNumber,
                inv.quantity_on_hand, quantity, inv.quantity_on_hand + quantity,
                unitCost, quantity * unitCost, userId
            ]);
        } else {
            // Tạo inventory record mới
            const [newInv] = await connection.query<ResultSetHeader>(`
                INSERT INTO inventories (
                    product_id, warehouse_id, quantity_on_hand,
                    unit_cost, status, last_movement_date
                ) VALUES (?, ?, ?, ?, 'available', NOW())
            `, [productId, warehouseId, quantity, unitCost]);

            // Ghi log
            await connection.query(`
                INSERT INTO inventory_logs (
                    inventory_id, product_id, warehouse_id,
                    movement_type, reference_type, reference_id, reference_number,
                    quantity_before, quantity_change, quantity_after,
                    unit_cost, total_cost, performed_by
                ) VALUES (?, ?, ?, 'transfer_in', 'stock_transfer', ?, ?, 0, ?, ?, ?, ?, ?)
            `, [
                newInv.insertId, productId, warehouseId,
                transferId, transferNumber,
                quantity, quantity,
                unitCost, quantity * unitCost, userId
            ]);
        }
    }

    /**
     * Helper: Trừ tồn kho (dùng cho EXPORT và TRANSFER ra)
     */
    private async subtractFromInventory(
        connection: PoolConnection,
        warehouseId: number,
        productId: number,
        quantity: number,
        transferId: number,
        transferNumber: string,
        userId: number
    ): Promise<void> {
        // Tìm inventory record có đủ số lượng
        const [existing] = await connection.query<RowDataPacket[]>(`
            SELECT * FROM inventories 
            WHERE product_id = ? AND warehouse_id = ? 
            AND status = 'available' AND quantity_on_hand >= ?
            LIMIT 1
        `, [productId, warehouseId, quantity]);

        if (existing.length === 0) {
            throw new Error(`Insufficient inventory for product ${productId} in warehouse ${warehouseId}`);
        }

        const inv = existing[0];

        // Trừ số lượng
        await connection.query(`
            UPDATE inventories 
            SET quantity_on_hand = quantity_on_hand - ?, 
                last_movement_date = NOW()
            WHERE id = ?
        `, [quantity, inv.id]);

        // Ghi log
        await connection.query(`
            INSERT INTO inventory_logs (
                inventory_id, product_id, warehouse_id,
                movement_type, reference_type, reference_id, reference_number,
                quantity_before, quantity_change, quantity_after,
                unit_cost, total_cost, performed_by
            ) VALUES (?, ?, ?, 'transfer_out', 'stock_transfer', ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            inv.id, productId, warehouseId,
            transferId, transferNumber,
            inv.quantity_on_hand, -quantity, inv.quantity_on_hand - quantity,
            inv.unit_cost || 0, quantity * (inv.unit_cost || 0), userId
        ]);
    }

    /**
     * Xóa phiếu (chỉ cho phiếu draft hoặc pending)
     */
    async delete(id: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(`
            UPDATE stock_transfers 
            SET deleted_at = NOW() 
            WHERE id = ? AND status IN ('draft', 'pending')
        `, [id]);

        return result.affectedRows > 0;
    }
}

export const stockTransferRepository = new StockTransferRepository();
