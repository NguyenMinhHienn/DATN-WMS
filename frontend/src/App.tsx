import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Route Guards
import { AdminRoute } from './components/AdminRoute';
import { StaffRoute } from './components/StaffRoute';

// Layouts
import { AdminLayout } from './layout/AdminLayout';
import { StaffLayout } from './layout/StaffLayout';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import Warehouses from './pages/admin/Warehouses';
import Inventory from './pages/admin/Inventory';
import StockIn from './pages/admin/StockIn';
import StockOut from './pages/admin/StockOut';
import StockTransfers from './pages/admin/StockTransfers';
import InterWarehouseTransfer from './pages/admin/InterWarehouseTransfer';
import Users from './pages/admin/Users';
import Reports from './pages/admin/Reports';
import ProductConfig from './pages/admin/ProductConfig';

// Staff Pages
import StaffDashboard from './pages/staff/StaffDashboard';
import CreateTransfer from './pages/staff/CreateTransfer';
import MyTransfers from './pages/staff/MyTransfers';
import StaffProducts from './pages/staff/StaffProducts';
import StaffOrders from './pages/staff/StaffOrders';

// Client/Public Pages
import Home from './pages/client/Home';
import Login from './pages/client/Login';
import Register from './pages/client/Register';
import ProductList from './pages/client/ProductList';
import ProductDetail from './pages/client/ProductDetail';
import Cart from './pages/client/Cart';
import AccessDenied from './pages/client/AccessDenied';

// Shared Pages
import Profile from './pages/Profile';

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
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* ==================== PUBLIC ROUTES ==================== */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/products" element={<ProductList />} />
                    <Route path="/products/:id" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/403" element={<AccessDenied />} />

                    {/* ==================== SHARED ROUTES (All authenticated users) ==================== */}
                    <Route path="/profile" element={<Profile />} />

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
                        <Route path="stock-in" element={<StockIn />} />
                        <Route path="stock-out" element={<StockOut />} />
                        <Route path="inter-warehouse-transfer" element={<InterWarehouseTransfer />} />
                        <Route path="stock-transfers" element={<StockTransfers />} />
                        <Route path="users" element={<Users />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="product-config" element={<ProductConfig />} />
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
                        <Route path="create-transfer" element={<CreateTransfer />} />
                        <Route path="my-transfers" element={<MyTransfers />} />
                        <Route path="products" element={<StaffProducts />} />
                        <Route path="orders" element={<StaffOrders />} />
                    </Route>

                    {/* ==================== FALLBACK ==================== */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
