import { Request, Response } from 'express';
import { goodsReceiptRepository } from '../repositories/goods-receipt.repository';
import { exportSlipRepository } from '../repositories/export-slip.repository';
// Note: We need to check if exportSlipRepository uses 'export_receipts' or 'goods_issues' or 'stock_transfers'.
// The frontend calls exportReceiptService, which hits /api/export-receipts
// Let's import the proper repository for export receipts:
import { exportReceiptRepository } from '../repositories/export-receipt.repository';
import { stockTransferRepository } from '../repositories/stock-transfer.repository';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export const printController = {
    async printImport(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            if (!id) return res.status(400).send('Invalid ID');

            const receipt = await goodsReceiptRepository.findById(id);
            if (!receipt) return res.status(404).send('Import slip not found');

            const items = await goodsReceiptRepository.getItems(id);

            // Fetch company detail (could be static or from DB)
            const companyInfo = {
                name: 'Hệ thống Quản lý Kho StockFlow',
                address: 'Số 1, Phố Trịnh Văn Bô, Phương Canh, Hà Nội',
                phone: '1900 1234',
                email: 'contact@stockflow.vn',
            };

            res.render('print/import', {
                company: companyInfo,
                receipt,
                items,
                formatDate: (d: Date) => new Date(d).toLocaleDateString('vi-VN'),
                formatCurrency: (amount: number) => Number(amount || 0).toLocaleString('vi-VN') + ' đ'
            });
        } catch (error) {
            console.error('Print Import Error:', error);
            res.status(500).send('Lỗi khi tải dữ liệu phiếu nhập');
        }
    },

    async printExport(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            if (!id) return res.status(400).send('Invalid ID');

            // Find Export Receipt
            const [rows] = await pool.query<RowDataPacket[]>(`
                SELECT er.*, w.name as warehouse_name, u.full_name as created_by_name, ua.full_name as approved_by_name
                FROM export_receipts er
                INNER JOIN warehouses w ON er.warehouse_id = w.id
                LEFT JOIN users u ON er.created_by = u.id
                LEFT JOIN users ua ON er.approved_by = ua.id
                WHERE er.id = ? AND er.deleted_at IS NULL
            `, [id]);

            if (rows.length === 0) return res.status(404).send('Export slip not found');
            const receipt = rows[0];

            // In export_receipts, the items might be in export_receipt_items
            const [items] = await pool.query<RowDataPacket[]>(`
                SELECT eri.*, p.name as product_name, p.sku, 
                       pv.sku as variant_sku, un.name as unit_name
                FROM export_receipt_items eri
                INNER JOIN products p ON eri.product_id = p.id
                LEFT JOIN product_variants pv ON eri.product_variant_id = pv.id
                LEFT JOIN units un ON p.unit_id = un.id
                WHERE eri.export_receipt_id = ?
            `, [id]);

            const companyInfo = {
                name: 'Hệ thống Quản lý Kho StockFlow',
                address: 'Số 1, Phố Trịnh Văn Bô, Phương Canh, Hà Nội',
                phone: '1900 1234',
                email: 'contact@stockflow.vn',
            };

            res.render('print/export', {
                company: companyInfo,
                receipt,
                items,
                formatDate: (d: Date) => new Date(d).toLocaleDateString('vi-VN'),
                formatCurrency: (amount: number) => Number(amount || 0).toLocaleString('vi-VN') + ' đ'
            });
        } catch (error) {
            console.error('Print Export Error:', error);
            res.status(500).send('Lỗi khi tải dữ liệu phiếu xuất');
        }
    },

    async printTransfer(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            if (!id) return res.status(400).send('Invalid ID');

            const rawReceipt = await stockTransferRepository.findById(id);
            if (!rawReceipt) return res.status(404).send('Transfer slip not found');
            const receipt: any = rawReceipt;

            const items = await stockTransferRepository.getItems(id);
            
            // Format to match the previous export/import ejs expectations
            const companyInfo = {
                name: 'Hệ thống Quản lý Kho StockFlow',
                address: 'Số 1, Phố Trịnh Văn Bô, Phương Canh, Hà Nội',
                phone: '1900 1234',
                email: 'contact@stockflow.vn',
            };

            const ejsData: any = {
                company: companyInfo,
                items,
                formatDate: (d: Date) => new Date(d).toLocaleDateString('vi-VN'),
                formatCurrency: (amount: number) => Number(amount || 0).toLocaleString('vi-VN') + ' đ'
            };

            if (receipt.transfer_type === 'IMPORT') {
                ejsData.receipt = {
                    receipt_number: receipt.transfer_number,
                    receipt_date: receipt.transfer_date,
                    warehouse_name: receipt.destination_warehouse_name,
                    supplier_name: receipt.supplier_name,
                    delivery_person: receipt.delivery_person,
                    reference_document: receipt.order_id ? `#${receipt.order_id}` : '',
                    notes: receipt.notes || receipt.reason,
                    total_items: receipt.total_items,
                    total_quantity: receipt.total_quantity,
                    total_amount: receipt.total_value,
                    created_by_name: receipt.created_by_name,
                    storekeeper: receipt.storekeeper,
                    approved_by_name: receipt.approved_by_name
                };
                
                // transform items for import.ejs
                ejsData.items = items.map((i: any) => ({
                    product_name: i.product_name,
                    variant_sku: i.variant_sku,
                    sku: i.sku,
                    unit_name: 'Cái', // You may need to fetch this if missing
                    quantity_actual: i.quantity_requested,
                    quantity_document: i.quantity_requested,
                    unit_cost: i.unit_cost,
                    line_total: i.line_total
                }));
                
                return res.render('print/import', ejsData);
            } else {
                ejsData.receipt = {
                    receipt_number: receipt.transfer_number,
                    receipt_date: receipt.transfer_date,
                    warehouse_name: receipt.source_warehouse_name || receipt.destination_warehouse_name,
                    export_reason: receipt.transfer_type === 'EXPORT' && receipt.order_id ? 'sale' : 'internal',
                    receiver_name: receipt.receiver_name || receipt.delivery_person,
                    receiver_department: receipt.receiver_department,
                    receiver_address: receipt.receiver_address,
                    receiver_phone: receipt.receiver_phone,
                    notes: receipt.notes || receipt.reason,
                    reference_document: receipt.order_id ? `#${receipt.order_id}` : '',
                    total_items: receipt.total_items,
                    total_amount: receipt.total_value,
                    created_by_name: receipt.created_by_name,
                    storekeeper: receipt.storekeeper,
                    approved_by_name: receipt.approved_by_name
                };

                // transform items for export.ejs
                ejsData.items = items.map((i: any) => ({
                    product_name: i.product_name,
                    variant_sku: i.variant_sku,
                    sku: i.sku,
                    unit_name: 'Cái',
                    quantity_actual: i.quantity_requested,
                    quantity_requested: i.quantity_requested,
                    unit_price: i.unit_cost,
                    line_total: i.line_total
                }));

                return res.render('print/export', ejsData);
            }
        } catch (error) {
            console.error('Print Transfer Error:', error);
            res.status(500).send('Lỗi khi tải dữ liệu phiếu chuyển');
        }
    }
};
