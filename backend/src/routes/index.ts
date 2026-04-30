import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isAdmin, isWarehouseManager, isStaff, isViewer } from '../middlewares/role.middleware';
import { checkViewPermission } from '../middlewares/checkViewPermission';
import { registerLimiter, orderLimiter } from '../middlewares/rateLimit.middleware';

// Import controllers
import * as authController from '../controllers/auth.controller';
import * as userController from '../controllers/user.controller';
import * as productController from '../controllers/product.controller';
import * as warehouseController from '../controllers/warehouse.controller';
import * as inventoryController from '../controllers/inventory.controller';
import * as goodsReceiptController from '../controllers/goods-receipt.controller';
import * as goodsIssueController from '../controllers/goods-issue.controller';
import * as reportController from '../controllers/report.controller';
import * as stockTransferController from '../controllers/stock-transfer.controller';
import * as productVariantController from '../controllers/product-variant.controller';
import * as uploadController from '../controllers/upload.controller';
import * as attributeController from '../controllers/attribute.controller';
import * as specificationController from '../controllers/specification.controller';
import * as orderController from '../controllers/order.controller';
import * as exportSlipController from '../controllers/export-slip.controller';
import * as exportReceiptController from '../controllers/export-receipt.controller';
import * as cartController from '../controllers/cart.controller';
import * as dashboardController from '../controllers/dashboard.controller';
import supplierRoutes from './supplier.routes';
import printRoutes from './print.routes';
import { cancelPaymentOrder, createPaymentLink, payosWebhook } from '../controllers/payment.controller';
import { confirmWebhook } from '../controllers/payosSetup.Controller';
import { getTransferByOrder } from '../controllers/transfer.controller';
import * as receivableController from '../controllers/receivable.controller';
import { payableController } from '../controllers/payable.controller';
import * as creditController from '../controllers/credit.controller';
import * as notificationController from '../controllers/notification.controller';
import { auditController } from '../controllers/audit.controller';


const router = Router();

// ==================== AUTH ROUTES ====================
router.post('/auth/register', registerLimiter, authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authenticate, authController.logout);
router.get('/auth/me', authenticate, authController.getCurrentUser);
router.put('/auth/profile', authenticate, authController.updateProfile);
router.put('/auth/password', authenticate, authController.changePassword);
router.post('/auth/avatar', authenticate, uploadController.upload.single('avatar'), uploadController.uploadAvatar);

// ==================== USER ROUTES ====================
router.get('/users', authenticate, isAdmin, userController.getAllUsers);
router.get('/users/:id', authenticate, isAdmin, userController.getUserById);
router.post('/users', authenticate, isAdmin, userController.createUser);
router.put('/users/:id', authenticate, isAdmin, userController.updateUser);
router.delete('/users/:id', authenticate, isAdmin, userController.deleteUser);
router.get('/roles', authenticate, isAdmin, userController.getAllRoles);

// ==================== PRODUCT ROUTES ====================
router.get('/products', authenticate, isViewer, productController.getAllProducts);
router.get('/products/:id', authenticate, isViewer, productController.getProductById);
router.post('/products', authenticate, isWarehouseManager, productController.createProduct);
router.put('/products/:id', authenticate, isWarehouseManager, productController.updateProduct);
router.delete('/products/:id', authenticate, isAdmin, productController.deleteProduct);
router.get('/categories', authenticate, isViewer, productController.getCategories);
router.post('/categories', authenticate, isAdmin, productController.createCategory);
router.put('/categories/:id', authenticate, isAdmin, productController.updateCategory);
router.delete('/categories/:id', authenticate, isAdmin, productController.deleteCategory);
router.get('/units', authenticate, isViewer, productController.getUnits);

// ==================== PRODUCT VARIANT ROUTES ====================
// User: View variants, find variant by attributes
router.get('/products/:id/variants', authenticate, isViewer, productVariantController.getVariantsByProduct);
router.get('/products/:id/detail', authenticate, isViewer, productVariantController.getProductWithVariants);
router.get('/products/:id/colors', authenticate, isViewer, productVariantController.getAvailableColors);
router.post('/products/:id/find-variant', authenticate, isViewer, productVariantController.findVariant);

// Admin/Manager: Manage variants
router.post('/products/:id/variants', authenticate, isWarehouseManager, productVariantController.createVariant);
router.post('/products/:id/variants/generate', authenticate, isWarehouseManager, productVariantController.generateVariants);
router.post('/products/:id/find-variant-by-attributes', authenticate, isViewer, productVariantController.findVariantByAttributeValues);
router.delete('/products/:id/variants/all', authenticate, isAdmin, productVariantController.deleteAllVariants);
router.get('/variants/:id', authenticate, isViewer, productVariantController.getVariantById);
router.put('/variants/:id', authenticate, isWarehouseManager, productVariantController.updateVariant);
router.delete('/variants/:id', authenticate, isAdmin, productVariantController.deleteVariant);
router.get('/variants/:id/stock', authenticate, isViewer, productVariantController.checkStock);

// ==================== WAREHOUSE ROUTES ====================
router.get('/warehouses', authenticate, isViewer, warehouseController.getAllWarehouses);
router.get('/warehouses/:id', authenticate, isViewer, warehouseController.getWarehouseById);
router.post('/warehouses', authenticate, isAdmin, warehouseController.createWarehouse);
router.put('/warehouses/:id', authenticate, isAdmin, warehouseController.updateWarehouse);
router.delete('/warehouses/:id', authenticate, isAdmin, warehouseController.deleteWarehouse);
router.get('/warehouses/:id/locations', authenticate, isViewer, warehouseController.getWarehouseLocations);
router.post('/warehouses/:id/locations', authenticate, isWarehouseManager, warehouseController.createWarehouseLocation);

// ==================== INVENTORY ROUTES ====================
router.get('/inventory', authenticate, checkViewPermission('view_inventory'), inventoryController.getAllInventory);
router.get('/inventory/low-stock', authenticate, checkViewPermission('view_inventory'), inventoryController.getLowStockItems);
router.get('/inventory/under-ten-stock', authenticate, checkViewPermission('view_inventory'), inventoryController.getUnderTenStockItems);
router.get('/inventory/movements', authenticate, checkViewPermission('view_inventory'), inventoryController.getMovementLogs);
router.get('/inventory/:id/metrics', authenticate, checkViewPermission('view_inventory'), inventoryController.getPerformanceMetrics);
router.get('/inventory/:id/report', authenticate, checkViewPermission('view_inventory'), inventoryController.getInventoryReport);
router.get('/inventory/:id', authenticate, checkViewPermission('view_inventory'), inventoryController.getInventoryById);
router.post('/inventory/adjust', authenticate, isStaff, inventoryController.adjustInventory);

// ==================== GOODS RECEIPT (STOCK IN) ROUTES ====================
router.get('/goods-receipts', authenticate, isViewer, goodsReceiptController.getAllReceipts);
router.get('/goods-receipts/:id', authenticate, isViewer, goodsReceiptController.getReceiptById);
router.post('/goods-receipts', authenticate, isStaff, goodsReceiptController.createReceipt);
router.put('/goods-receipts/:id/status', authenticate, isStaff, goodsReceiptController.updateReceiptStatus);
router.post('/goods-receipts/:id/approve', authenticate, isWarehouseManager, goodsReceiptController.approveReceipt);
router.delete('/goods-receipts/:id', authenticate, isWarehouseManager, goodsReceiptController.deleteReceipt);

// ==================== GOODS ISSUE (STOCK OUT) ROUTES ====================
router.get('/goods-issues', authenticate, isViewer, goodsIssueController.getAllIssues);
router.get('/goods-issues/:id', authenticate, isViewer, goodsIssueController.getIssueById);
router.post('/goods-issues', authenticate, isStaff, goodsIssueController.createIssue);
router.put('/goods-issues/:id/status', authenticate, isStaff, goodsIssueController.updateIssueStatus);
router.post('/goods-issues/:id/ship', authenticate, isWarehouseManager, goodsIssueController.shipIssue);
router.delete('/goods-issues/:id', authenticate, isWarehouseManager, goodsIssueController.deleteIssue);

// ==================== STOCK TRANSFER ROUTES ====================
// QUY TẮC NGHIỆP VỤ:
// - STAFF: Tạo phiếu (PENDING), xem phiếu của mình
// - ADMIN: Xem tất cả, duyệt/từ chối phiếu
// - CLIENT: KHÔNG được truy cập (isStaff chặn user thường)
router.post('/stock-transfers', authenticate, isStaff, stockTransferController.createTransfer);
router.get('/stock-transfers', authenticate, isStaff, stockTransferController.getAllTransfers);
router.get('/stock-transfers/:id', authenticate, isStaff, stockTransferController.getTransferById);
router.put('/stock-transfers/:id/approve', authenticate, isAdmin, stockTransferController.approveTransfer);
router.put('/stock-transfers/:id/reject', authenticate, isAdmin, stockTransferController.rejectTransfer);
router.delete('/stock-transfers/:id', authenticate, isStaff, stockTransferController.deleteTransfer);

// ==================== REPORT ROUTES ====================
router.get('/reports/dashboard', authenticate, isViewer, reportController.getDashboardStats);
router.get('/reports/inventory', authenticate, isViewer, reportController.getInventoryReport);
router.get('/reports/movements', authenticate, isViewer, reportController.getMovementReport);
router.get('/reports/stock-value', authenticate, isViewer, reportController.getStockValueReport);
router.get('/reports/products/:productId/stock', authenticate, isViewer, reportController.getProductStockSummary);
// New analytics endpoints
router.get('/reports/kpi', authenticate, isViewer, reportController.getKpiOverview);
router.get('/reports/top-selling', authenticate, isViewer, reportController.getTopSellingProducts);
router.get('/reports/movement-summary', authenticate, isViewer, reportController.getMovementSummary);
router.get('/reports/stock-value-by-product', authenticate, isViewer, reportController.getStockValueByProduct);
router.get('/reports/stock-value-by-category', authenticate, isViewer, reportController.getStockValueByCategory);
router.get('/reports/alerts', authenticate, isViewer, reportController.getSmartAlerts);
router.get('/reports/products/:productId/drill-down', authenticate, isViewer, reportController.getProductDrillDown);

// ==================== PRINT ROUTES ====================
// These endpoints render EJS templates for printing
router.use('/print', printRoutes);

// ==================== DASHBOARD (Doanh thu & Lợi nhuận) ====================
router.get('/dashboard/summary', authenticate, isAdmin, dashboardController.getSummary);
router.get('/dashboard/monthly-report', authenticate, isAdmin, dashboardController.getMonthlyReport);
router.get('/dashboard/monthly-detail/:year/:month', authenticate, isAdmin, dashboardController.getMonthlyDetail);
router.get('/dashboard/order-items/:orderId', authenticate, isAdmin, dashboardController.getOrderItems);
router.get('/dashboard/category-distribution', authenticate, isAdmin, dashboardController.getCategoryDistribution);
router.get('/dashboard/top-products', authenticate, isAdmin, dashboardController.getTopProducts);

// ==================== ATTRIBUTE ROUTES (Flexible Variant System) ====================
// Public: Get all attributes (for product forms)
router.get('/attributes', authenticate, checkViewPermission('view_product_config'), attributeController.getAllAttributes);
router.get('/attributes/:id', authenticate, checkViewPermission('view_product_config'), attributeController.getAttributeById);
router.get('/attributes/:id/values', authenticate, checkViewPermission('view_product_config'), attributeController.getAttributeValues);

// Admin: Manage attributes
router.post('/attributes', authenticate, isAdmin, attributeController.createAttribute);
router.put('/attributes/:id', authenticate, isAdmin, attributeController.updateAttribute);
router.delete('/attributes/:id', authenticate, isAdmin, attributeController.deleteAttribute);

// Admin: Manage attribute values
router.post('/attributes/:id/values', authenticate, isAdmin, attributeController.createAttributeValue);
router.put('/attributes/:id/values/:valueId', authenticate, isAdmin, attributeController.updateAttributeValue);
router.delete('/attributes/:id/values/:valueId', authenticate, isAdmin, attributeController.deleteAttributeValue);

// Get attributes used by a product
router.get('/products/:productId/attributes', authenticate, checkViewPermission('view_product_config'), attributeController.getProductAttributes);

// ==================== PRODUCT SPECIFICATION ROUTES ====================
// View specifications (any authenticated user)
router.get('/products/:id/specifications', authenticate, isViewer, specificationController.getSpecificationsByProduct);

// Manage specifications (admin/manager only)
router.post('/products/:id/specifications', authenticate, isWarehouseManager, specificationController.createSpecification);
router.post('/products/:id/specifications/bulk', authenticate, isWarehouseManager, specificationController.createBulkSpecifications);
router.put('/specifications/:id', authenticate, isWarehouseManager, specificationController.updateSpecification);
router.delete('/specifications/:id', authenticate, isWarehouseManager, specificationController.deleteSpecification);

// ==================== UPLOAD ROUTES ====================
router.post('/upload/image', authenticate, isStaff, uploadController.upload.single('image'), uploadController.uploadImage);
router.delete('/upload/:filename', authenticate, isWarehouseManager, uploadController.deleteImage);

// ==================== ORDER ROUTES ====================
// Client: Tạo và xem đơn hàng
router.post('/orders', authenticate, orderLimiter, orderController.createOrder);
router.get('/client/orders', authenticate, orderController.getClientOrders);
router.get('/client/orders/:id', authenticate, orderController.getClientOrderById);
router.put('/orders/:id/cancel', authenticate, orderController.cancelOrder);

// Admin: Quản lý đơn hàng
router.get('/orders', authenticate, isAdmin, orderController.getAllOrders);
router.get('/orders/confirmed', authenticate, isStaff, orderController.getConfirmedOrders);
router.get('/orders/:id', authenticate, isStaff, orderController.getOrderById);
router.put('/orders/:id/confirm', authenticate, isStaff, orderController.confirmOrder);
router.put('/orders/:id/shipping', authenticate, isStaff, orderController.markShipping);
router.put('/orders/:id/delivered', authenticate, isStaff, orderController.markDelivered);
router.put('/orders/:id/failed', authenticate, isStaff, orderController.markFailed);

// Staff: chỉ xem đơn hàng
router.get('/staff/orders', authenticate, isStaff, orderController.getAllOrders);

// ==================== EXPORT SLIP ROUTES (Phiếu xuất kho) ====================
// Staff: Tạo phiếu và xem phiếu của mình
router.post('/export-slips', authenticate, isStaff, exportSlipController.createExportSlip);
router.get('/export-slips/my', authenticate, isStaff, exportSlipController.getMyExportSlips);

// Admin: Quản lý phiếu xuất kho
router.get('/export-slips', authenticate, isStaff, exportSlipController.getAllExportSlips);
router.get('/export-slips/:id', authenticate, isStaff, exportSlipController.getExportSlipById);
router.put('/export-slips/:id/approve', authenticate, isAdmin, exportSlipController.approveExportSlip);
router.put('/export-slips/:id/complete', authenticate, isAdmin, exportSlipController.completeDelivery);
router.put('/export-slips/:id/fail', authenticate, isAdmin, exportSlipController.failDelivery);

// ==================== EXPORT RECEIPT ROUTES (Phiếu xuất kho độc lập) ====================
router.get('/export-receipts', authenticate, isStaff, exportReceiptController.getAllReceipts);
router.get('/export-receipts/:id', authenticate, isStaff, exportReceiptController.getReceiptById);
router.post('/export-receipts', authenticate, isStaff, exportReceiptController.createReceipt);
router.post('/export-receipts/:id/approve', authenticate, isWarehouseManager, exportReceiptController.approveReceipt);
router.delete('/export-receipts/:id', authenticate, isWarehouseManager, exportReceiptController.deleteReceipt);

// ==================== CART ROUTES (User) ====================
// Giỏ hàng cho user đã đăng nhập
router.post('/cart/add', authenticate, cartController.addToCart);
router.get('/cart', authenticate, cartController.getCart);
router.get('/cart/count', authenticate, cartController.getCartItemCount);
router.put('/cart/items/:itemId', authenticate, cartController.updateCartItem);
router.delete('/cart/items/:itemId', authenticate, cartController.removeCartItem);
router.delete('/cart', authenticate, cartController.clearCart);
router.get("/transfers/by-order/:orderId", getTransferByOrder);

// ==================== SUPPLIERS ROUTES ====================
router.use('/suppliers', supplierRoutes);


//payment online
router.post("/create-payment", createPaymentLink);
router.post("/webhook", payosWebhook);
router.post("/confirm-webhook", confirmWebhook);
router.delete("/orders/:id/cancel-payment", cancelPaymentOrder);

// ==================== RECEIVABLE (CÔNG NỢ) ROUTES ====================
// Admin routes
router.get('/receivables/summary', authenticate, isAdmin, receivableController.getReceivableSummary);
router.get('/receivables/overdue', authenticate, isAdmin, receivableController.getOverdueReceivables);
router.get('/receivables/monthly-stats', authenticate, isAdmin, receivableController.getMonthlyStats);
router.post('/receivables/check-overdue', authenticate, isAdmin, receivableController.checkOverdue);
router.get('/receivables/ledger', authenticate, isAdmin, receivableController.getConsolidatedLedger);
router.get('/receivables', authenticate, isStaff, receivableController.getAllReceivables);
router.get('/receivables/:id', authenticate, isStaff, receivableController.getReceivableById);
router.put('/receivables/:id/cancel', authenticate, isAdmin, receivableController.cancelReceivable);
router.post('/receivables/:id/remind', authenticate, isAdmin, receivableController.sendReminder);
router.put('/receivables/:id/bad-debt', authenticate, isAdmin, receivableController.markBadDebt);

// Client routes - user xem công nợ của mình
router.get('/client/receivables', authenticate, receivableController.getClientReceivables);

// ==================== CREDIT (CÔNG NỢ MUA HÀNG) ROUTES ====================
// Client routes
router.get('/client/credit-info', authenticate, creditController.getClientCreditInfo);
router.post('/client/credit/register', authenticate, creditController.registerCredit);

// Admin routes
router.get('/admin/users/:id/credit', authenticate, isAdmin, creditController.getAdminUserCredit);
router.put('/admin/users/:id/credit/enable', authenticate, isAdmin, creditController.enableUserCredit);
router.put('/admin/users/:id/credit/disable', authenticate, isAdmin, creditController.disableUserCredit);
router.put('/admin/users/:id/credit/limit', authenticate, isAdmin, creditController.updateUserCreditLimit);
router.put('/admin/users/:id/credit/payment-terms', authenticate, isAdmin, creditController.updateUserPaymentTerms);
router.get('/admin/credit/settings', authenticate, isAdmin, creditController.getCreditSettings);
router.put('/admin/credit/settings', authenticate, isAdmin, creditController.updateCreditSettings);

// ==================== PAYMENT RECEIPT (PHIẾU THU) ROUTES ====================
router.get('/payment-receipts/pending-count', authenticate, isAdmin, receivableController.getPendingReceiptsCount);
router.post('/payment-receipts', authenticate, isStaff, receivableController.createPaymentReceipt);
router.get('/payment-receipts', authenticate, isStaff, receivableController.getAllPaymentReceipts);
router.get('/payment-receipts/:id', authenticate, isStaff, receivableController.getPaymentReceiptById);
router.post('/payment-receipts/consolidated', authenticate, isAdmin, receivableController.createConsolidatedPayment);
router.put('/payment-receipts/:id/approve', authenticate, isAdmin, receivableController.approvePaymentReceipt);
router.put('/payment-receipts/:id/reject', authenticate, isAdmin, receivableController.rejectPaymentReceipt);

// ==================== PAYABLE (CÔNG NỢ NCC) ROUTES ====================
router.get('/payables/summary', authenticate, isAdmin, payableController.getSummary);
router.get('/payables/monthly-stats', authenticate, isAdmin, payableController.getMonthlyStats);
router.get('/payables/ledger', authenticate, isAdmin, payableController.getConsolidatedLedger);
router.get('/payables/upcoming-due', authenticate, isAdmin, payableController.getUpcomingDue);
router.get('/payables', authenticate, isStaff, payableController.getAll);
router.get('/payables/supplier/:supplierId/unpaid', authenticate, isAdmin, payableController.getUnpaidBySupplier);
router.get('/payables/:id', authenticate, isStaff, payableController.getById);
router.put('/payables/:id/cancel', authenticate, isAdmin, payableController.cancel);
router.post('/payables/consolidated-voucher', authenticate, isAdmin, payableController.createConsolidatedVoucher);

// ==================== PAYMENT VOUCHER (PHIẾU CHI) ROUTES ====================
router.get('/payment-vouchers', authenticate, isAdmin, payableController.getAllPaymentVouchers);
router.get('/payment-vouchers/pending-count', authenticate, isAdmin, payableController.getPendingVouchersCount);
router.get('/payables/:id/vouchers', authenticate, isStaff, payableController.getVouchers);
router.post('/payables/:id/vouchers', authenticate, isStaff, payableController.createVoucher);
router.put('/payment-vouchers/:voucherId/approve', authenticate, isAdmin, payableController.approveVoucher);
router.put('/payment-vouchers/:voucherId/reject', authenticate, isAdmin, payableController.rejectVoucher);

// ==================== NOTIFICATION ROUTES ====================
router.get('/notifications', authenticate, notificationController.getNotifications);
router.get('/notifications/unread-count', authenticate, notificationController.getUnreadCount);
router.put('/notifications/:id/read', authenticate, notificationController.markAsRead);
router.put('/notifications/read-all', authenticate, notificationController.markAllAsRead);
// ==================== AUDIT LOGS ====================
router.get('/audit/history/:type/:id', authenticate, isStaff, auditController.getHistory);
router.get('/audit/logs', authenticate, isAdmin, auditController.getAllLogs);

export default router;