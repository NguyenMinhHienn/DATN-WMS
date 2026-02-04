import React, { useState, useEffect } from 'react';
import { productService } from '../../services/productService';
import { productVariantService } from '../../services/productVariantService';
import { Product, Category, ProductVariant, PaginationInfo } from '../../interface';


/**
 * Staff Products Page (READ-ONLY)
 * Light theme modern với màu sắc tươi sáng
 */
const StaffProducts: React.FC = () => {
    // State
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1, limit: 10, total: 0, totalPages: 0
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | undefined>();


    // Detail Modal
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [variantLoading, setVariantLoading] = useState(false);


    // Load data
    useEffect(() => {
        loadProducts();
        loadCategories();
    }, [pagination.page, search, selectedCategory]);


    const loadProducts = async () => {
        try {
            setLoading(true);
            const response = await productService.getAll(
                pagination.page,
                pagination.limit,
                search || undefined,
                selectedCategory,
            );
            setProducts(response.data);
            setPagination(response.pagination);
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


    const loadVariants = async (productId: number) => {
        try {
            setVariantLoading(true);
            const data = await productVariantService.getByProduct(productId);
            setVariants(data);
        } catch (error) {
            console.error('Failed to load variants:', error);
            setVariants([]);
        } finally {
            setVariantLoading(false);
        }
    };


    // View product detail
    const handleViewDetail = async (product: Product) => {
        setSelectedProduct(product);
        setIsDetailModalOpen(true);
        await loadVariants(product.id);
    };


    const handleSearch = (value: string) => {
        setSearch(value);
        setPagination(prev => ({ ...prev, page: 1 }));
    };


    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(value);
    };


    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; className: string }> = {
            active: { label: 'Đang bán', className: 'bg-green-100 text-green-700 border border-green-200' },
            inactive: { label: 'Ngừng bán', className: 'bg-slate-100 text-slate-600 border border-slate-200' },
            discontinued: { label: 'Ngừng sản xuất', className: 'bg-red-100 text-red-700 border border-red-200' },
            draft: { label: 'Bản nháp', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
        };
        const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
                {config.label}
            </span>
        );
    };


    if (loading && products.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                        <span className="text-2xl">📦</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Danh sách sản phẩm</h1>
                        <p className="text-slate-500">Xem thông tin sản phẩm (Chỉ xem - Không chỉnh sửa)</p>
                    </div>
                </div>
            </div>


            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-lg p-5 mb-6 border border-slate-100">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="🔍 Tìm kiếm sản phẩm..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="w-56">
                        <select
                            value={selectedCategory || ''}
                            onChange={(e) => {
                                setSelectedCategory(e.target.value ? Number(e.target.value) : undefined);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        >
                            <option value="">Tất cả danh mục</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>


            {/* Products Table */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Sản phẩm</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Danh mục</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Giá bán</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Trạng thái</th>
                                <th className="text-center py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="text-5xl opacity-50">📦</span>
                                            <p className="text-slate-500 font-medium">Không có sản phẩm nào</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                products.map(product => (
                                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        className="h-12 w-12 rounded-xl object-cover border border-slate-200 shadow-sm"
                                                    />
                                                ) : (
                                                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border border-slate-200">
                                                        <span className="text-xl">📦</span>
                                                    </div>
                                                )}
                                                <span className="font-medium text-slate-800">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">{product.sku}</span>
                                        </td>
                                        <td className="py-4 px-6 text-slate-600">{product.category_name || '-'}</td>
                                        <td className="py-4 px-6">
                                            <span className="font-semibold text-green-600">{formatCurrency(product.selling_price)}</span>
                                        </td>
                                        <td className="py-4 px-6">{getStatusBadge(product.status)}</td>
                                        <td className="py-4 px-6 text-center">
                                            <button
                                                onClick={() => handleViewDetail(product)}
                                                className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-lg transition-all"
                                            >
                                                Xem chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                        <span className="text-sm text-slate-500">
                            Hiển thị {products.length} / {pagination.total} sản phẩm
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                disabled={pagination.page === 1}
                                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                ← Trước
                            </button>
                            <span className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg">
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                disabled={pagination.page === pagination.totalPages}
                                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Sau →
                            </button>
                        </div>
                    </div>
                )}
            </div>


            {/* Detail Modal */}
            {isDetailModalOpen && selectedProduct && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto m-4 shadow-2xl">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                {selectedProduct.image_url ? (
                                    <img
                                        src={selectedProduct.image_url}
                                        alt={selectedProduct.name}
                                        className="h-16 w-16 rounded-xl object-cover border border-slate-200 shadow-md"
                                    />
                                ) : (
                                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border border-slate-200">
                                        <span className="text-2xl">📦</span>
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">{selectedProduct.name}</h2>
                                    <p className="text-slate-500 font-mono text-sm">{selectedProduct.sku}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {/* Info Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                    <span className="text-xs font-medium text-green-600 uppercase tracking-wider">Giá bán</span>
                                    <p className="font-bold text-green-700 text-lg mt-1">{formatCurrency(selectedProduct.selling_price)}</p>
                                </div>
                                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                    <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">Giá gốc</span>
                                    <p className="font-bold text-blue-700 text-lg mt-1">{formatCurrency(selectedProduct.cost_price)}</p>
                                </div>
                                <div className="p-4 bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl border border-purple-200">
                                    <span className="text-xs font-medium text-purple-600 uppercase tracking-wider">Danh mục</span>
                                    <p className="font-semibold text-purple-700 mt-1">{selectedProduct.category_name || '-'}</p>
                                </div>
                                <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                                    <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Trạng thái</span>
                                    <div className="mt-2">{getStatusBadge(selectedProduct.status)}</div>
                                </div>
                            </div>

                            {/* Description */}
                            {selectedProduct.description && (
                                <div className="mb-6">
                                    <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                        <span className="w-6 h-6 bg-indigo-100 rounded flex items-center justify-center text-sm">📝</span>
                                        Mô tả
                                    </h3>
                                    <p className="text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        {selectedProduct.description}
                                    </p>
                                </div>
                            )}

                            {/* Variants */}
                            <div>
                                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center text-sm">🎨</span>
                                    Biến thể sản phẩm
                                </h3>
                                {variantLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : variants.length === 0 ? (
                                    <p className="text-slate-500 text-center py-6 bg-slate-50 rounded-xl border border-slate-200">Sản phẩm này không có biến thể</p>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">SKU</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Thuộc tính</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Giá</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Tồn kho</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {variants.map(variant => (
                                                    <tr key={variant.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-mono text-slate-600">{variant.sku}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-wrap gap-1">
                                                                {variant.color && <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs">{variant.color}</span>}
                                                                {variant.size && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{variant.size}</span>}
                                                                {variant.storage && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{variant.storage}</span>}
                                                                {variant.ram && <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs">{variant.ram}</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(variant.price)}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={`font-semibold ${variant.stock > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                                                {variant.stock}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffProducts;