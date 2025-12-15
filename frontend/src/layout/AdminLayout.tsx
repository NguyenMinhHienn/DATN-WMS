import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export const AdminLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main content area - always pushed right by sidebar on lg screens */}
            <div className="lg:ml-64 min-h-screen">
                {/* Mobile header */}
                <header className="lg:hidden bg-white shadow-sm border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            W
                        </div>
                        <span className="font-bold text-slate-800">WMS</span>
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </header>

                {/* Main content */}
                <main className="p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

