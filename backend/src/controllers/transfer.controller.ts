import { RowDataPacket } from "mysql2";
import pool from "../config/database";

export const getTransferByOrder = async (req: any, res: any) => {
    const { orderId } = req.params;

    const conn = await pool.getConnection();

    try {
        // 🔹 1. Lấy transfer (✅ THÊM JOIN USERS)
        const [transfers] = await conn.query<RowDataPacket[]>(
            `SELECT 
        st.*,
        u1.full_name AS created_by_name,
        u2.full_name AS approved_by_name
     FROM stock_transfers st
     LEFT JOIN users u1 ON st.created_by = u1.id
     LEFT JOIN users u2 ON st.approved_by = u2.id
     WHERE st.order_id = ?
     LIMIT 1`,
            [orderId]
        );

        if (transfers.length === 0) {
            return res.json(null);
        }

        const transfer = transfers[0];

        // 🔹 2. Lấy items (GIỮ NGUYÊN)
        const [items] = await conn.query<RowDataPacket[]>(
            `SELECT 
                sti.id,
                pv.sku,
                p.name AS product_name,
                sti.quantity_requested,
                sti.unit_cost
             FROM stock_transfer_items sti
             LEFT JOIN product_variants pv 
                ON sti.product_variant_id = pv.id
             LEFT JOIN products p 
                ON sti.product_id = p.id
             WHERE sti.stock_transfer_id = ?`,
            [transfer.id]
        );

        // 🔥 3. GỘP LẠI (GIỮ NGUYÊN)
        res.json({
            ...transfer,
            items
        });

    } catch (error: any) {
        console.error("🔥 ERROR:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    } finally {
        conn.release();
    }
};