import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { isAdmin, isWarehouseManager, isStaff, isViewer } from '../middlewares/role.middleware';

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
import * as cartController from '../controllers/cart.controller';
import * as dashboardController from '../controllers/dashboard.controller';
import { cancelPaymentOrder, createPaymentLink, payosWebhook } from '../controllers/payment.controller';
import { confirmWebhook } from '../controllers/payosSetup.Controller';


const router = Router();

// ==================== AUTH ROUTES ====================
router.post('/auth/register', authController.register);
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
router.get('/inventory', authenticate, isViewer, inventoryController.getAllInventory);
router.get('/inventory/low-stock', authenticate, isViewer, inventoryController.getLowStockItems);
router.get('/inventory/movements', authenticate, isViewer, inventoryController.getMovementLogs);
router.get('/inventory/:id', authenticate, isViewer, inventoryController.getInventoryById);
router.post('/inventory/adjust', authenticate, isStaff, inventoryController.adjustInventory);

// ==================== GOODS RECEIPT (STOCK IN) ROUTES ====================
router.get('/goods-receipts', authenticate, isViewer, goodsReceiptController.getAllReceipts);
router.get('/goods-receipts/:id', authenticate, isViewer, goodsReceiptController.getReceiptById);
router.post('/goods-receipts', authenticate, isStaff, goodsReceiptController.createReceipt);
router.put('/goods-receipts/:id/status', authenticate, isStaff, goodsReceiptController.updateReceiptStatus);
router.post('/goods-receipts/:id/complete', authenticate, isWarehouseManager, goodsReceiptController.completeReceipt);
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

// ==================== DASHBOARD (Doanh thu & Lợi nhuận) ====================
router.get('/dashboard/summary', authenticate, isAdmin, dashboardController.getSummary);
router.get('/dashboard/monthly-report', authenticate, isAdmin, dashboardController.getMonthlyReport);

// ==================== ATTRIBUTE ROUTES (Flexible Variant System) ====================
// Public: Get all attributes (for product forms)
router.get('/attributes', authenticate, isViewer, attributeController.getAllAttributes);
router.get('/attributes/:id', authenticate, isViewer, attributeController.getAttributeById);
router.get('/attributes/:id/values', authenticate, isViewer, attributeController.getAttributeValues);

// Admin: Manage attributes
router.post('/attributes', authenticate, isAdmin, attributeController.createAttribute);
router.put('/attributes/:id', authenticate, isAdmin, attributeController.updateAttribute);
router.delete('/attributes/:id', authenticate, isAdmin, attributeController.deleteAttribute);

// Admin: Manage attribute values
router.post('/attributes/:id/values', authenticate, isAdmin, attributeController.createAttributeValue);
router.put('/attributes/:id/values/:valueId', authenticate, isAdmin, attributeController.updateAttributeValue);
router.delete('/attributes/:id/values/:valueId', authenticate, isAdmin, attributeController.deleteAttributeValue);

// Get attributes used by a product
router.get('/products/:productId/attributes', authenticate, isViewer, attributeController.getProductAttributes);

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
router.post('/orders', authenticate, orderController.createOrder);
router.get('/client/orders', authenticate, orderController.getClientOrders);
router.get('/client/orders/:id', authenticate, orderController.getClientOrderById);
router.put('/orders/:id/cancel', authenticate, orderController.cancelOrder);

// Admin: Quản lý đơn hàng
router.get('/orders', authenticate, isAdmin, orderController.getAllOrders);
router.get('/orders/confirmed', authenticate, isStaff, orderController.getConfirmedOrders);
router.get('/orders/:id', authenticate, isStaff, orderController.getOrderById);
router.put('/orders/:id/confirm', authenticate, isAdmin, orderController.confirmOrder);
router.put('/orders/:id/shipping', authenticate, isAdmin, orderController.markShipping);
router.put('/orders/:id/delivered', authenticate, isAdmin, orderController.markDelivered);
router.put('/orders/:id/failed', authenticate, isAdmin, orderController.markFailed);

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

// ==================== CART ROUTES (User) ====================
// Giỏ hàng cho user đã đăng nhập
router.post('/cart/add', authenticate, cartController.addToCart);
router.get('/cart', authenticate, cartController.getCart);
router.get('/cart/count', authenticate, cartController.getCartItemCount);
router.put('/cart/items/:itemId', authenticate, cartController.updateCartItem);
router.delete('/cart/items/:itemId', authenticate, cartController.removeCartItem);
router.delete('/cart', authenticate, cartController.clearCart);


//payment online
router.post("/create-payment", createPaymentLink);
router.post("/webhook", payosWebhook);
router.post("/confirm-webhook", confirmWebhook);
router.delete("/orders/:id/cancel-payment", cancelPaymentOrder);




export default router;
