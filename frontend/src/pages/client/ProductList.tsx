import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../../services/productService';
import { uploadService } from '../../services/uploadService';
import { Product, Category, PaginationInfo } from '../../interface';
import { Pagination } from '../../components/Pagination';

/**
 * Product List Page - Client
 * Trang danh sách sản phẩm với UI premium
 */
const ProductList: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 12, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<string>('newest');

    useEffect(() => { loadCategories(); }, []);
    useEffect(() => { loadProducts(); }, [pagination.page, search, selectedCategory]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const result = await productService.getAll(pagination.page, 12, search || undefined, selectedCategory, 'active');
            setProducts(result.data);
            setPagination(result.pagination);
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const data = await productService.getCategories();
            setCategories(data);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    // Sort products (UI only, client-side)
    const sortedProducts = [...products].sort((a, b) => {
        switch (sortBy) {
            case 'price-low': return a.selling_price - b.selling_price;
            case 'price-high': return b.selling_price - a.selling_price;
            case 'name': return a.name.localeCompare(b.name);
            default: return 0; // newest - keep original order
        }
    });

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ========== HERO HEADER ========== */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Breadcrumb */}
                    <nav className="mb-4">
                        <ol className="flex items-center gap-2 text-sm text-blue-200">
                            <li className="flex items-center gap-1">
                                <span>🏠</span>
                                <Link to="/" className="hover:text-white transition-colors">Trang chủ</Link>
                            </li>
                            <li className="text-blue-300">›</li>
                            <li className="text-white font-medium">Sản phẩm</li>
                        </ol>
                    </nav>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">Khám phá sản phẩm</h1>
                            <p className="text-blue-100">
                                {pagination.total > 0 ? (
                                    <>Hiển thị <strong>{products.length}</strong> / <strong>{pagination.total}</strong> sản phẩm</>
                                ) : (
                                    'Duyệt qua các danh mục sản phẩm của chúng tôi'
                                )}
                            </p>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-center">
                                <div className="text-2xl font-bold">{pagination.total}</div>
                                <div className="text-xs text-blue-200">Sản phẩm</div>
                            </div>
                            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-center">
                                <div className="text-2xl font-bold">{categories.length}</div>
                                <div className="text-xs text-blue-200">Danh mục</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== MAIN CONTENT ========== */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* ========== FILTERS & TOOLBAR ========== */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-8 -mt-8 relative z-10">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                            <input
                                type="text"
                                placeholder="Tìm kiếm sản phẩm theo tên, SKU..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-sm whitespace-nowrap">📁 Danh mục:</span>
                            <select
                                value={selectedCategory || ''}
                                onChange={(e) => { setSelectedCategory(e.target.value ? parseInt(e.target.value) : undefined); setPagination(p => ({ ...p, page: 1 })); }}
                                className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[160px]"
                            >
                                <option value="">Tất cả</option>
                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>

                        {/* Sort */}
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-sm whitespace-nowrap">📊 Sắp xếp:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[140px]"
                            >
                                <option value="newest">Mới nhất</option>
                                <option value="price-low">Giá thấp → cao</option>
                                <option value="price-high">Giá cao → thấp</option>
                                <option value="name">Tên A-Z</option>
                            </select>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Hiển thị dạng lưới"
                            >
                                ▦
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Hiển thị dạng danh sách"
                            >
                                ☰
                            </button>
                        </div>
                    </div>

                    {/* Active Filters */}
                    {(search || selectedCategory) && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                            <span className="text-sm text-slate-500">Đang lọc:</span>
                            {search && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                    🔍 "{search}"
                                    <button onClick={() => setSearch('')} className="ml-1 hover:text-blue-900">×</button>
                                </span>
                            )}
                            {selectedCategory && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm">
                                    📁 {categories.find(c => c.id === selectedCategory)?.name}
                                    <button onClick={() => setSelectedCategory(undefined)} className="ml-1 hover:text-violet-900">×</button>
                                </span>
                            )}
                            <button
                                onClick={() => { setSearch(''); setSelectedCategory(undefined); }}
                                className="text-sm text-red-600 hover:text-red-700 ml-2"
                            >
                                Xóa tất cả
                            </button>
                        </div>
                    )}
                </div>

                {/* ========== CATEGORY PILLS ========== */}
                <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                    <button
                        onClick={() => { setSelectedCategory(undefined); setPagination(p => ({ ...p, page: 1 })); }}
                        className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${!selectedCategory
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                    >
                        🏷️ Tất cả
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => { setSelectedCategory(cat.id); setPagination(p => ({ ...p, page: 1 })); }}
                            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${selectedCategory === cat.id
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* ========== PRODUCTS DISPLAY ========== */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500">Đang tải sản phẩm...</p>
                    </div>
                ) : (
                    <>
                        {/* GRID VIEW */}
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                                {sortedProducts.map(product => (
                                    <Link
                                        key={product.id}
                                        to={`/products/${product.id}`}
                                        className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                                    >
                                        {/* Image */}
                                        <div className="relative w-full h-52 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center text-6xl overflow-hidden">
                                            {product.image_url ? (
                                                <img
                                                    src={uploadService.getImageUrl(product.image_url)}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <span className="group-hover:scale-110 transition-transform">📦</span>
                                            )}
                                            {/* Quick Actions Overlay */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <span className="px-4 py-2 bg-white rounded-lg text-sm font-medium text-slate-800 shadow-lg">
                                                    👁️ Xem chi tiết
                                                </span>
                                            </div>
                                            {/* Category Badge */}
                                            {product.category_name && (
                                                <span className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-medium text-slate-600">
                                                    {product.category_name}
                                                </span>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">{product.sku}</span>
                                                {product.brand && (
                                                    <span className="text-xs text-slate-500">• {product.brand}</span>
                                                )}
                                            </div>
                                            <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                                {product.name}
                                            </h3>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xl font-bold text-blue-600">
                                                    {new Intl.NumberFormat('vi-VN').format(product.selling_price)}₫
                                                </span>
                                                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                                    ✓ Còn hàng
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* LIST VIEW */}
                        {viewMode === 'list' && (
                            <div className="space-y-4 mb-8">
                                {sortedProducts.map(product => (
                                    <Link
                                        key={product.id}
                                        to={`/products/${product.id}`}
                                        className="group flex gap-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 hover:shadow-lg transition-all"
                                    >
                                        {/* Image */}
                                        <div className="w-32 h-32 flex-shrink-0 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center text-4xl overflow-hidden">
                                            {product.image_url ? (
                                                <img
                                                    src={uploadService.getImageUrl(product.image_url)}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                            ) : '📦'}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">{product.sku}</span>
                                                    {product.category_name && (
                                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{product.category_name}</span>
                                                    )}
                                                </div>
                                                <h3 className="font-semibold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">
                                                    {product.name}
                                                </h3>
                                                {product.brand && <p className="text-sm text-slate-500">Thương hiệu: {product.brand}</p>}
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-2xl font-bold text-blue-600">
                                                    {new Intl.NumberFormat('vi-VN').format(product.selling_price)}₫
                                                </span>
                                                <span className="text-sm text-emerald-600">✓ Còn hàng</span>
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <div className="flex items-center text-slate-300 group-hover:text-blue-500 transition-colors">
                                            <span className="text-2xl">→</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {products.length === 0 && (
                            <div className="text-center py-16">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-2">Không tìm thấy sản phẩm</h3>
                                <p className="text-slate-500 mb-6">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                                <button
                                    onClick={() => { setSearch(''); setSelectedCategory(undefined); }}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        )}

                        {/* Pagination */}
                        {products.length > 0 && (
                            <div className="flex justify-center">
                                <Pagination pagination={pagination} onPageChange={(page) => setPagination(p => ({ ...p, page }))} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ========== BACK TO TOP BUTTON ========== */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center justify-center text-xl z-50"
                title="Lên đầu trang"
            >
                ↑
            </button>
        </div>
    );
};

export default ProductList;
