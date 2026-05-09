import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Route Guards
import { AdminRoute } from './components/AdminRoute';
import { StaffRoute } from './components/StaffRoute';

// Layouts
import { AdminLayout } from './layout/AdminLayout';
import { StaffLayout } from './layout/StaffLayout';
import { ClientLayout } from './layout/ClientLayout';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import Warehouses from './pages/admin/Warehouses';
import Inventory from './pages/admin/Inventory';
import StockManagement from './pages/admin/StockManagement';
import Users from './pages/admin/Users';
import Reports from './pages/admin/Reports';
import ProductConfig from './pages/admin/ProductConfig';
import AdminOrders from './pages/admin/AdminOrders';
import FinancialReport from './pages/admin/FinancialReport';
import ExportReceipt from './pages/admin/ExportReceipt';
import Receivables from './pages/admin/Receivables';
import CustomerLedger from './pages/admin/CustomerLedger';
import Payables from './pages/admin/Payables';

// Staff Pages
import StaffDashboard from './pages/staff/StaffDashboard';
import CreateTransfer from './pages/staff/CreateTransfer';
import MyTransfers from './pages/staff/MyTransfers';
import StaffProducts from './pages/staff/StaffProducts';
import StaffDonHang from './pages/staff/StaffDonHang';
import StaffInventoryView from './pages/staff/StaffInventoryView';
import StaffProductConfigView from './pages/staff/StaffProductConfigView';
import StaffReceivables from './pages/staff/StaffReceivables';
import StaffPayables from './pages/staff/StaffPayables';

// ... rest of imports

// Client/Public Pages
import Home from './pages/client/Home';
import Login from './pages/client/Login';
import Register from './pages/client/Register';
import ProductList from './pages/client/ProductList';
import ProductDetail from './pages/client/ProductDetail';
import Cart from './pages/client/Cart';
import AccessDenied from './pages/client/AccessDenied';
import ClientReceivables from './pages/client/ClientReceivables';
import CreditDashboard from './pages/client/CreditDashboard';

// Shared Pages
import Profile from './pages/Profile';
import OrdersPage from './pages/client/Orders';
import SupportPage from './pages/client/SupportTicketsPage';
import PaymentCancel from './pages/client/PaymentCancel';
import DebtPaymentSuccess from './pages/client/DebtPaymentSuccess';
import DebtPaymentCancel from './pages/client/DebtPaymentCancel';
// import PaymentSuccess from './pages/client/PaymentSuccess';

/**
 * App Routing Structure:
 * 
 * ADMIN (/admin/*):
 *   - Dashboard admin, duyệt phiếu, quản lý tồn kho, quản lý users
 *   - Chỉ role 'admin' được truy cập
 * 
 * STAFF (/staff/*):
 *   - Tạo phiếu, xem phiếu đã tạo
 *   - Chỉ role 'staff' được truy cập
 *   - KHÔNG có chức năng duyệt phiếu
 * 
 * CLIENT (/):
 *   - Xem sản phẩm, trang chủ, giỏ hàng
 *   - Mọi người đều truy cập được
 * 
 * PROFILE (/profile):
 *   - Trang thông tin cá nhân
 *   - Tất cả authenticated users đều truy cập được
 */
const App: React.FC = () => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        {/* ==================== PUBLIC ROUTES ==================== */}
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/403" element={<AccessDenied />} />

                        {/* ==================== CLIENT ROUTES (with ClientLayout) ==================== */}
                        <Route element={<ClientLayout />}>
                            <Route path="/products" element={<ProductList />} />
                            <Route path="/products/:id" element={<ProductDetail />} />
                            <Route path="/cart" element={<Cart />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/orders" element={<OrdersPage />} />
                            <Route path="/orders/:id" element={<OrdersPage />} />
                            <Route path="/support" element={<SupportPage />} />
                            <Route path="/payment-cancel" element={<PaymentCancel />} />
                            <Route path="/debt-payment-success" element={<DebtPaymentSuccess />} />
                            <Route path="/debt-payment-cancel" element={<DebtPaymentCancel />} />
                            <Route path="/my-receivables" element={<ClientReceivables />} />
                            <Route path="/my-credit" element={<CreditDashboard />} />
                        </Route>

                        {/* ==================== ADMIN ROUTES ==================== */}
                        {/* Chỉ role 'admin' - Quản lý, duyệt phiếu */}
                        <Route
                            path="/admin"
                            element={
                                <AdminRoute>
                                    <AdminLayout />
                                </AdminRoute>
                            }
                        >
                            <Route index element={<Navigate to="/admin/dashboard" replace />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="products" element={<Products />} />
                            <Route path="warehouses" element={<Warehouses />} />
                            <Route path="inventory" element={<Inventory />} />
                            <Route path="stock-management" element={<StockManagement />} />
                            <Route path="users" element={<Users />} />
                            <Route path="reports" element={<Reports />} />
                            <Route path="product-config" element={<ProductConfig />} />
                            <Route path="orders" element={<AdminOrders />} />
                            <Route path="export-receipts" element={<ExportReceipt />} />
                            <Route path="financial-report" element={<FinancialReport />} />
                            <Route path="receivables" element={<Receivables />} />
                            <Route path="customer-ledger" element={<CustomerLedger />} />
                            <Route path="payables" element={<Payables />} />
                        </Route>

                        {/* ==================== STAFF ROUTES ==================== */}
                        {/* Chỉ role 'staff' - Tạo phiếu, xem phiếu đã tạo */}
                        <Route
                            path="/staff"
                            element={
                                <StaffRoute>
                                    <StaffLayout />
                                </StaffRoute>
                            }
                        >
                            <Route index element={<Navigate to="/staff/dashboard" replace />} />
                            <Route path="dashboard" element={<StaffDashboard />} />
                            <Route path="products" element={<StaffProducts />} />
                            <Route path="product-config" element={<StaffProductConfigView />} />
                            <Route path="inventory" element={<StaffInventoryView />} />
                            <Route path="donhang" element={<StaffDonHang />} />
                            <Route path="create-transfer" element={<CreateTransfer />} />
                            <Route path="my-transfers" element={<MyTransfers />} />
                            <Route path="receivables" element={<StaffReceivables />} />
                            <Route path="payables" element={<StaffPayables />} />
                        </Route>

                        {/* ==================== FALLBACK ==================== */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;

{/* Last updated: Tue Mar 17 20:26:32 +07 2026 */}
