import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
    return (
        <div>
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fadeIn">
                            Warehouse Management
                            <span className="block text-primary-200">Made Simple</span>
                        </h1>
                        <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
                            Streamline your inventory operations with our powerful, intuitive warehouse management system.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Link to="/login" className="bg-white text-primary-700 px-8 py-3 rounded-xl font-semibold hover:bg-primary-50 transition-colors">
                                Get Started
                            </Link>
                            <Link to="/products" className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors">
                                Browse Products
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">Key Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: '📦', title: 'Inventory Tracking', desc: 'Real-time visibility into stock levels across all warehouses' },
                            { icon: '📊', title: 'Smart Reports', desc: 'Generate comprehensive reports for better decision making' },
                            { icon: '🔄', title: 'Stock Operations', desc: 'Efficient goods receipt and issue management' },
                            { icon: '🏭', title: 'Multi-Warehouse', desc: 'Manage multiple warehouse locations from one platform' },
                            { icon: '⚠️', title: 'Low Stock Alerts', desc: 'Automatic notifications when stock reaches reorder point' },
                            { icon: '👥', title: 'Role-Based Access', desc: 'Secure access control with customizable user roles' },
                        ].map((feature, i) => (
                            <div key={i} className="stat-card text-center">
                                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">{feature.title}</h3>
                                <p className="text-slate-600">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 bg-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            { value: '99.9%', label: 'Uptime' },
                            { value: '24/7', label: 'Support' },
                            { value: '500+', label: 'Happy Clients' },
                            { value: '1M+', label: 'Items Tracked' },
                        ].map((stat, i) => (
                            <div key={i}>
                                <div className="text-4xl font-bold text-primary-600 mb-2">{stat.value}</div>
                                <div className="text-slate-600">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-primary-600 to-accent-600 text-white">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
                    <p className="text-xl text-white/80 mb-8">
                        Join thousands of businesses that trust our warehouse management system.
                    </p>
                    <Link to="/login" className="bg-white text-primary-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-50 transition-colors inline-block">
                        Start Now →
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Home;
