import React, { useState, useEffect } from 'react';
import { productService } from '../../services/productService';
import { productVariantService } from '../../services/productVariantService';
import { Product, Category, ProductVariant, PaginationInfo } from '../../interface';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';


/**
 * Staff Products Page (READ-ONLY)
 * Staff chỉ có quyền xem sản phẩm, không thể thêm/sửa/xóa
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
        const statusConfig: Record<string, { label: string; color: string }> = {
            active: { label: 'Đang bán', color: 'bg-green-100 text-green-800' },
            inactive: { label: 'Ngừng bán', color: 'bg-gray-100 text-gray-800' },
            discontinued: { label: 'Ngừng sản xuất', color: 'bg-red-100 text-red-800' },
            draft: { label: 'Bản nháp', color: 'bg-yellow-100 text-yellow-800' },
        };
        const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                {config.label}
            </span>
        );
    };


    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Danh sách sản phẩm</h1>
                <p className="text-gray-600 text-sm mt-1">Xem thông tin sản phẩm (Chỉ xem - Không chỉnh sửa)</p>
            </div>


            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Tìm kiếm sản phẩm..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="w-48">
                    <select
                        value={selectedCategory || ''}
                        onChange={(e) => {
                            setSelectedCategory(e.target.value ? Number(e.target.value) : undefined);
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tất cả danh mục</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>


            {/* Products Table */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá bán</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        Không có sản phẩm nào
                                    </td>
                                </tr>
                            ) : (
                                products.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                {product.image_url && (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        className="h-10 w-10 rounded object-cover mr-3"
                                                    />
                                                )}
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                    {product.brand && (
                                                        <div className="text-xs text-gray-500">{product.brand}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{product.sku}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {categories.find(c => c.id === product.category_id)?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {formatCurrency(product.selling_price)}
                                        </td>
                                        <td className="px-6 py-4">{getStatusBadge(product.status)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleViewDetail(product)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                            >
                                                👁️ Xem chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>


                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="px-6 py-4 border-t">
                            <Pagination
                                pagination={pagination}
                                onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                            />
                        </div>
                    )}
                </div>
            )}


            {/* Detail Modal (Read-Only) */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Chi tiết sản phẩm"
                size="lg"
            >
                {selectedProduct && (
                    <div className="space-y-6">
                        {/* Product Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Tên sản phẩm</label>
                                <p className="text-gray-900 font-medium">{selectedProduct.name}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">SKU</label>
                                <p className="text-gray-900">{selectedProduct.sku}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Danh mục</label>
                                <p className="text-gray-900">
                                    {categories.find(c => c.id === selectedProduct.category_id)?.name || '-'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Thương hiệu</label>
                                <p className="text-gray-900">{selectedProduct.brand || '-'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Giá bán</label>
                                <p className="text-green-600 font-medium">{formatCurrency(selectedProduct.selling_price)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Giá nhập</label>
                                <p className="text-gray-900">{formatCurrency(selectedProduct.cost_price)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Trạng thái</label>
                                <div>{getStatusBadge(selectedProduct.status)}</div>
                            </div>
                        </div>


                        {/* Description */}
                        {selectedProduct.description && (
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Mô tả</label>
                                <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedProduct.description}</p>
                            </div>
                        )}


                        {/* Variants */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Biến thể sản phẩm</h3>
                            {variantLoading ? (
                                <div className="text-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
                            ) : variants.length === 0 ? (
                                <p className="text-gray-500 text-sm">Sản phẩm không có biến thể</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 border rounded">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Thuộc tính</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Giá</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Tồn kho</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {variants.map(variant => (
                                                <tr key={variant.id}>
                                                    <td className="px-4 py-2 text-sm text-gray-900">{variant.sku}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-600">
                                                        {variant.attribute_values?.map(av => av.value).join(' / ') ||
                                                            [variant.color, variant.size, variant.storage].filter(Boolean).join(' / ') ||
                                                            '-'}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-right font-medium">
                                                        {formatCurrency(variant.price)}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-right">
                                                        <span className={variant.stock > 0 ? 'text-green-600' : 'text-red-600'}>
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


                        {/* Close button */}
                        <div className="flex justify-end pt-4 border-t">
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};


export default StaffProducts;