import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, SidebarBadges } from '../components/Sidebar';
import { reportService } from '../services/reportService';

export const AdminLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [badges, setBadges] = useState<SidebarBadges>({});

    // Fetch badge data (low stock, pending slips) on mount
    useEffect(() => {
        const loadBadges = async () => {
            try {
                const stats = await reportService.getDashboard();
                setBadges({
                    lowStock: stats.lowStockItems || 0,
                    pendingReceipts: stats.pendingReceipts || 0,
                    pendingIssues: stats.pendingIssues || 0,
                    pendingOrders: stats.pendingOrders || 0,
                });
            } catch (err) {
                console.error('Failed to load sidebar badges:', err);
            }
        };
        loadBadges();

        // Refresh every 60 seconds
        const interval = setInterval(loadBadges, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} badges={badges} />

            {/* Main content area - always pushed right by sidebar on lg screens */}
            <div className="lg:ml-64 min-h-screen">
                {/* Mobile header */}
                <header className="lg:hidden bg-white/80 backdrop-blur-xl border-b border-blue-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-xl hover:bg-blue-50 text-blue-600 transition-all"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
                            <span className="text-sm">📦</span>
                        </div>
                        <span className="font-bold text-blue-900">StockFlow</span>
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </header>

                {/* Main content */}
                <main className="p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
