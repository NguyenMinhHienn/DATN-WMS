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

/**
 * Helper: Tìm thông tin công nợ phải trả (Payable) liên kết với phiếu nhập
 * Tra cứu theo source_type + source_id trong bảng payables
 */
async function findLinkedPayable(sourceType: string, sourceId: number): Promise<any | null> {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT p.*, s.bank_name, s.bank_account, s.address as supplier_address
            FROM payables p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.source_type = ? AND p.source_id = ?
            LIMIT 1
        `, [sourceType, sourceId]);
        return rows.length > 0 ? rows[0] : null;
    } catch {
        return null;
    }
}

/**
 * Helper: Tìm thông tin công nợ phải thu (Receivable) liên kết với phiếu xuất
 * Tra cứu theo source_type + source_id trong bảng receivables
 */
async function findLinkedReceivable(sourceType: string, sourceId: number): Promise<any | null> {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT r.*, u.full_name as user_full_name
            FROM receivables r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.source_type = ? AND r.source_id = ?
            LIMIT 1
        `, [sourceType, sourceId]);
        return rows.length > 0 ? rows[0] : null;
    } catch {
        return null;
    }
}

/**
 * Linked Document item for cross-reference display on printed receipts.
 * Each item references a REAL record in the system.
 */
interface LinkedDocument {
    /** Loại chứng từ (ví dụ: "Đơn đặt hàng", "Phiếu công nợ") */
    type: string;
    /** Mã chứng từ thực (ví dụ: "#ĐH-32", "NCC-2026-000002") */
    code: string;
    /** Ghi chú bổ sung (ví dụ: "Khách: Mai Ngọc Huyền") */
    note?: string;
    /** Icon cho loại chứng từ */
    icon: string;
}

/**
 * Helper: Tổng hợp tất cả chứng từ liên quan thực tế từ DB cho phiếu NHẬP
 * Trả về danh sách các chứng từ có thể truy xuất ngược
 */
async function buildImportLinkedDocuments(receipt: any, payable: any | null): Promise<LinkedDocument[]> {
    const docs: LinkedDocument[] = [];

    // 1. Chứng từ do người dùng nhập tay (hóa đơn VAT, số hợp đồng, v.v.)
    if (receipt.reference_document) {
        docs.push({
            type: 'Chứng từ gốc (nhập tay)',
            code: receipt.reference_document,
            icon: '📄',
            note: 'Mã do kế toán/thủ kho nhập khi tạo phiếu'
        });
    }

    // 2. Nhà cung cấp (luôn có cho phiếu nhập)
    if (receipt.supplier_name) {
        docs.push({
            type: 'Nhà cung cấp',
            code: receipt.supplier_name,
            icon: '🏢',
            note: receipt.supplier_id ? `Mã NCC: #${receipt.supplier_id}` : undefined
        });
    }

    // 3. Công nợ phải trả (nếu có)
    if (payable) {
        docs.push({
            type: 'Phiếu công nợ phải trả',
            code: payable.payable_number || `PAY-${payable.id}`,
            icon: '💳',
            note: `Hạn: ${payable.payment_terms} ngày | Trạng thái: ${payable.status}`
        });
    }

    return docs;
}

/**
 * Helper: Tổng hợp tất cả chứng từ liên quan thực tế từ DB cho phiếu XUẤT
 */
async function buildExportLinkedDocuments(receipt: any, receivable: any | null): Promise<LinkedDocument[]> {
    const docs: LinkedDocument[] = [];

    // 1. Chứng từ do người dùng nhập tay
    if (receipt.reference_document) {
        docs.push({
            type: 'Chứng từ gốc (nhập tay)',
            code: receipt.reference_document,
            icon: '📄',
            note: 'Mã do kế toán/thủ kho nhập khi tạo phiếu'
        });
    }

    // 2. Đơn đặt hàng (nếu xuất theo đơn)
    if (receipt.order_id) {
        // Truy vấn thêm thông tin đơn hàng
        try {
            const [orderRows] = await pool.query<RowDataPacket[]>(`
                SELECT o.id, o.order_number, o.customer_name, o.payment_method, o.status
                FROM orders o WHERE o.id = ?
            `, [receipt.order_id]);
            if (orderRows.length > 0) {
                const order = orderRows[0];
                docs.push({
                    type: 'Đơn đặt hàng',
                    code: order.order_number || `#ĐH-${order.id}`,
                    icon: '🛒',
                    note: `Khách: ${order.customer_name || 'N/A'} | TT: ${order.payment_method || 'N/A'}`
                });
            }
        } catch {
            // Nếu không query được, vẫn hiển thị mã đơn
            docs.push({
                type: 'Đơn đặt hàng',
                code: `#ĐH-${receipt.order_id}`,
                icon: '🛒'
            });
        }
    }

    // 3. Công nợ phải thu (nếu có)
    if (receivable) {
        docs.push({
            type: 'Phiếu công nợ phải thu',
            code: receivable.receivable_number || `RCV-${receivable.id}`,
            icon: '💳',
            note: `Người nợ: ${receivable.debtor_name || 'N/A'} | Trạng thái: ${receivable.status}`
        });
    }

    return docs;
}

/**
 * Helper: Tổng hợp chứng từ liên quan cho phiếu chuyển kho (IMPORT type)
 */
async function buildTransferImportLinkedDocuments(receipt: any, payable: any | null): Promise<LinkedDocument[]> {
    const docs: LinkedDocument[] = [];

    // 1. Mã phiếu chuyển kho gốc (chính là transfer_number)
    if (receipt.transfer_number) {
        docs.push({
            type: 'Phiếu chuyển kho (Nguồn)',
            code: receipt.transfer_number,
            icon: '🔄',
            note: `Loại: ${receipt.transfer_type} | Trạng thái: ${receipt.status}`
        });
    }

    // 2. Nhà cung cấp
    if (receipt.supplier_name) {
        docs.push({
            type: 'Nhà cung cấp',
            code: receipt.supplier_name,
            icon: '🏢',
            note: receipt.supplier_id ? `Mã NCC: #${receipt.supplier_id}` : undefined
        });
    }

    // 3. Đơn hàng liên kết
    if (receipt.order_id) {
        try {
            const [orderRows] = await pool.query<RowDataPacket[]>(
                `SELECT id, order_number, customer_name FROM orders WHERE id = ?`,
                [receipt.order_id]
            );
            if (orderRows.length > 0) {
                docs.push({
                    type: 'Đơn đặt hàng liên kết',
                    code: orderRows[0].order_number || `#ĐH-${orderRows[0].id}`,
                    icon: '🛒',
                    note: `Khách: ${orderRows[0].customer_name || 'N/A'}`
                });
            }
        } catch {
            docs.push({ type: 'Đơn đặt hàng', code: `#ĐH-${receipt.order_id}`, icon: '🛒' });
        }
    }

    // 4. Công nợ phải trả
    if (payable) {
        docs.push({
            type: 'Phiếu công nợ phải trả',
            code: payable.payable_number || `PAY-${payable.id}`,
            icon: '💳',
            note: `Hạn: ${payable.payment_terms} ngày | Trạng thái: ${payable.status}`
        });
    }

    return docs;
}

/**
 * Helper: Tổng hợp chứng từ liên quan cho phiếu chuyển kho (EXPORT type)
 */
async function buildTransferExportLinkedDocuments(receipt: any, receivable: any | null): Promise<LinkedDocument[]> {
    const docs: LinkedDocument[] = [];

    // 1. Mã phiếu chuyển kho gốc
    if (receipt.transfer_number) {
        docs.push({
            type: 'Phiếu chuyển kho (Nguồn)',
            code: receipt.transfer_number,
            icon: '🔄',
            note: `Loại: ${receipt.transfer_type} | Trạng thái: ${receipt.status}`
        });
    }

    // 2. Đơn hàng liên kết
    if (receipt.order_id) {
        try {
            const [orderRows] = await pool.query<RowDataPacket[]>(
                `SELECT id, order_number, customer_name, payment_method FROM orders WHERE id = ?`,
                [receipt.order_id]
            );
            if (orderRows.length > 0) {
                docs.push({
                    type: 'Đơn đặt hàng',
                    code: orderRows[0].order_number || `#ĐH-${orderRows[0].id}`,
                    icon: '🛒',
                    note: `Khách: ${orderRows[0].customer_name || 'N/A'} | TT: ${orderRows[0].payment_method || 'N/A'}`
                });
            }
        } catch {
            docs.push({ type: 'Đơn đặt hàng', code: `#ĐH-${receipt.order_id}`, icon: '🛒' });
        }
    }

    // 3. Công nợ phải thu
    if (receivable) {
        docs.push({
            type: 'Phiếu công nợ phải thu',
            code: receivable.receivable_number || `RCV-${receivable.id}`,
            icon: '💳',
            note: `Người nợ: ${receivable.debtor_name || 'N/A'} | Trạng thái: ${receivable.status}`
        });
    }

    return docs;
}

export const printController = {
    async printImport(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            if (!id) return res.status(400).send('Invalid ID');

            const receipt = await goodsReceiptRepository.findById(id);
            if (!receipt) return res.status(404).send('Import slip not found');

            const items = await goodsReceiptRepository.getItems(id);

            // Tìm công nợ phải trả (NCC) liên kết với phiếu nhập này
            const payable = await findLinkedPayable('goods_receipt', id);

            // Tổng hợp chứng từ liên quan thực tế
            const linkedDocuments = await buildImportLinkedDocuments(receipt, payable);

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
                payable,
                linkedDocuments,
                formatDate: (d: Date) => d ? new Date(d).toLocaleDateString('vi-VN') : 'N/A',
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

            // Tìm công nợ phải thu liên kết với phiếu xuất này
            const receivable = await findLinkedReceivable('export_receipt', id);

            // Tổng hợp chứng từ liên quan thực tế
            const linkedDocuments = await buildExportLinkedDocuments(receipt, receivable);

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
                receivable,
                linkedDocuments,
                formatDate: (d: Date) => d ? new Date(d).toLocaleDateString('vi-VN') : 'N/A',
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
                formatDate: (d: Date) => d ? new Date(d).toLocaleDateString('vi-VN') : 'N/A',
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
                    subtotal: receipt.subtotal,
                    vat_percent: receipt.vat_percent,
                    tax_amount: receipt.vat_amount,
                    shipping_cost: receipt.shipping_fee,
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

                // Tìm công nợ phải trả (NCC) liên kết với phiếu nhập (stock_transfer)
                ejsData.payable = await findLinkedPayable('import_transfer', id);

                // Tổng hợp chứng từ liên quan thực tế
                ejsData.linkedDocuments = await buildTransferImportLinkedDocuments(receipt, ejsData.payable);
                
                return res.render('print/import', ejsData);
            } else {
                let extractedNotes = receipt.notes || receipt.reason || '';
                let paymentMethodText = '';
                
                if (extractedNotes.includes('[Thanh toán COD]')) {
                    paymentMethodText = 'Tiền mặt (COD)';
                    extractedNotes = extractedNotes.replace('[Thanh toán COD]', '').trim();
                } else if (extractedNotes.includes('[Thanh toán Online]')) {
                    paymentMethodText = 'Chuyển khoản (Online)';
                    extractedNotes = extractedNotes.replace('[Thanh toán Online]', '').trim();
                }
                
                if (extractedNotes.endsWith('-')) extractedNotes = extractedNotes.slice(0, -1).trim();

                ejsData.receipt = {
                    receipt_number: receipt.transfer_number,
                    receipt_date: receipt.transfer_date,
                    warehouse_name: receipt.source_warehouse_name || receipt.destination_warehouse_name,
                    export_reason: receipt.transfer_type === 'EXPORT' && receipt.order_id ? 'sale' : 'internal',
                    receiver_name: receipt.receiver_name || receipt.delivery_person,
                    receiver_department: receipt.receiver_department,
                    receiver_address: receipt.receiver_address,
                    receiver_phone: receipt.receiver_phone,
                    notes: extractedNotes,
                    payment_method: paymentMethodText,
                    reference_document: receipt.order_id ? `#${receipt.order_id}` : '',
                    total_items: receipt.total_items,
                    subtotal: receipt.subtotal,
                    vat_percent: receipt.vat_percent,
                    vat_amount: receipt.vat_amount,
                    shipping_fee: receipt.shipping_fee,
                    total_amount: receipt.total_value,
                    created_by_name: receipt.created_by_name,
                    storekeeper: receipt.storekeeper,
                    approved_by_name: receipt.approved_by_name,
                    payment_terms: receipt.payment_terms || 0
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

                // Tìm công nợ phải thu liên kết với phiếu xuất (stock_transfer)
                ejsData.receivable = await findLinkedReceivable('export_transfer', id);

                // Tổng hợp chứng từ liên quan thực tế
                ejsData.linkedDocuments = await buildTransferExportLinkedDocuments(receipt, ejsData.receivable);

                return res.render('print/export', ejsData);
            }
        } catch (error) {
            console.error('Print Transfer Error:', error);
            res.status(500).send('Lỗi khi tải dữ liệu phiếu chuyển');
        }
    }
};
