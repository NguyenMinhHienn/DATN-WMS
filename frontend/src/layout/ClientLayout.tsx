import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';

export const ClientLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50">
            <Header />
            <main>
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-slate-800 text-white py-12 mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center font-bold text-lg">
                                    W
                                </div>
                                <span className="font-bold text-xl">WMS</span>
                            </div>
                            <p className="text-slate-400 text-sm">
                                Professional Warehouse Management System for efficient inventory control.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-3">Quick Links</h3>
                            <ul className="space-y-2 text-slate-400 text-sm">
                                <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
                                <li><a href="/products" className="hover:text-white transition-colors">Products</a></li>
                                <li><a href="/login" className="hover:text-white transition-colors">Login</a></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-3">Features</h3>
                            <ul className="space-y-2 text-slate-400 text-sm">
                                <li>Inventory Tracking</li>
                                <li>Stock Management</li>
                                <li>Real-time Reports</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-3">Contact</h3>
                            <ul className="space-y-2 text-slate-400 text-sm">
                                <li>Email: support@wms.com</li>
                                <li>Phone: +84 123 456 789</li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-700 mt-8 pt-8 text-center text-slate-400 text-sm">
                        © 2024 WMS - Warehouse Management System. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};
