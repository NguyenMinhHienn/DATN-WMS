import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './layout/AdminLayout';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import Warehouses from './pages/admin/Warehouses';
import Inventory from './pages/admin/Inventory';
import StockIn from './pages/admin/StockIn';
import StockOut from './pages/admin/StockOut';
import Users from './pages/admin/Users';
import Reports from './pages/admin/Reports';

// Client Pages
import Home from './pages/client/Home';
import Login from './pages/client/Login';
import Register from './pages/client/Register';
import ProductList from './pages/client/ProductList';
import ProductDetail from './pages/client/ProductDetail';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/products" element={<ProductList />} />
                    <Route path="/products/:id" element={<ProductDetail />} />

                    {/* Admin Routes - Protected */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute allowedRoles={['admin', 'manager', 'warehouse_staff']}>
                                <AdminLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="products" element={<Products />} />
                        <Route path="warehouses" element={<Warehouses />} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="stock-in" element={<StockIn />} />
                        <Route path="stock-out" element={<StockOut />} />
                        <Route path="users" element={<Users />} />
                        <Route path="reports" element={<Reports />} />
                    </Route>

                    {/* Catch all - redirect to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
