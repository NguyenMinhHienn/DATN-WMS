import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊', roles: ['admin', 'warehouse_manager', 'staff', 'user'] },
    { path: '/admin/users', label: 'Users', icon: '👥', roles: ['admin'] },
    { path: '/admin/products', label: 'Products', icon: '📦', roles: ['admin', 'warehouse_manager', 'staff', 'user'] },
    { path: '/admin/warehouses', label: 'Warehouses', icon: '🏭', roles: ['admin', 'warehouse_manager', 'staff', 'user'] },
    { path: '/admin/inventory', label: 'Inventory', icon: '📋', roles: ['admin', 'warehouse_manager', 'staff', 'user'] },
    { path: '/admin/stock-in', label: 'Stock In', icon: '📥', roles: ['admin', 'warehouse_manager', 'staff'] },
    { path: '/admin/stock-out', label: 'Stock Out', icon: '📤', roles: ['admin', 'warehouse_manager', 'staff'] },
    { path: '/admin/reports', label: 'Reports', icon: '📈', roles: ['admin', 'warehouse_manager', 'staff', 'user'] },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { user, logout, hasAnyRole } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredMenuItems = menuItems.filter(item => hasAnyRole(item.roles));

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                            W
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-800">WMS</h1>
                            <p className="text-xs text-slate-500">Warehouse System</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 px-3">
                        <ul className="space-y-1">
                            {filteredMenuItems.map((item) => (
                                <li key={item.path}>
                                    <NavLink
                                        to={item.path}
                                        end={item.path === '/admin'}
                                        className={({ isActive }) =>
                                            `sidebar-link ${isActive ? 'active' : ''}`
                                        }
                                        onClick={onClose}
                                    >
                                        <span className="text-xl">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* User section */}
                    <div className="border-t border-slate-200 p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                                {user?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 truncate">{user?.full_name}</p>
                                <p className="text-xs text-slate-500 truncate">
                                    {user?.roles?.map(r => r.name).join(', ')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full btn btn-secondary text-sm"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};
