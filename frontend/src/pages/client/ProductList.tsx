import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../../services/productService';
import { Product, Category, PaginationInfo } from '../../interface';
import { Pagination } from '../../components/Pagination';

const ProductList: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 12, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | undefined>();

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

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Products</h1>
                <p className="text-slate-600">Browse our product catalog</p>
            </div>

            {/* Filters */}
            <div className="card mb-8">
                <div className="flex flex-wrap gap-4">
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="input max-w-xs"
                    />
                    <select
                        value={selectedCategory || ''}
                        onChange={(e) => { setSelectedCategory(e.target.value ? parseInt(e.target.value) : undefined); setPagination(p => ({ ...p, page: 1 })); }}
                        className="input max-w-xs"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                        {products.map(product => (
                            <Link key={product.id} to={`/products/${product.id}`} className="card hover:shadow-lg transition-all hover:-translate-y-1">
                                <div className="w-full h-48 bg-slate-100 rounded-lg mb-4 flex items-center justify-center text-6xl">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                                    ) : '📦'}
                                </div>
                                <div className="mb-2">
                                    <span className="text-xs text-primary-600 font-mono">{product.sku}</span>
                                </div>
                                <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2">{product.name}</h3>
                                {product.brand && <p className="text-sm text-slate-500 mb-2">{product.brand}</p>}
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-bold text-primary-600">
                                        {new Intl.NumberFormat('vi-VN').format(product.selling_price)}₫
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {products.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            No products found
                        </div>
                    )}

                    <Pagination pagination={pagination} onPageChange={(page) => setPagination(p => ({ ...p, page }))} />
                </>
            )}
        </div>
    );
};

export default ProductList;
