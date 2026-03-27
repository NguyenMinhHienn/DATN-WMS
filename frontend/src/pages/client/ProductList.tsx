import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../../services/productService';
import { uploadService } from '../../services/uploadService';
import { cartService } from '../../services/cartService';
import { useAuth } from '../../context/AuthContext';
import { Product, Category, PaginationInfo, ProductVariant } from '../../interface';
import { Pagination } from '../../components/Pagination';
import MiniCart from './Minicarts';


/**
 * Product List Page - Client
 * Trang danh sách sản phẩm với UI premium và Quick Add to Cart
 */

// Interface cho toast notification
interface Toast {
    id: number;
    type: 'success' | 'error';
    message: string;
}

const ProductList: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 12, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [sortBy, setSortBy] = useState<string>('newest');

    // Quick Add states - cho từng sản phẩm
    const [productVariants, setProductVariants] = useState<{ [key: number]: ProductVariant[] }>({});
    const [selectedVariants, setSelectedVariants] = useState<{ [key: number]: number | null }>({});
    const [quantities, setQuantities] = useState<{ [key: number]: number }>({});
    const [loadingAdd, setLoadingAdd] = useState<{ [key: number]: boolean }>({});
    const [loadingVariants, setLoadingVariants] = useState<{ [key: number]: boolean }>({});

    //gio hang cua user


    // Toast notifications
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => { loadCategories(); }, []);

    // Debounce search: chờ 400ms sau lần gõ cuối mới gọi API
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => { loadProducts(); }, [pagination.page, debouncedSearch, selectedCategory]);

    // Load variants cho tất cả products khi ở list view
    useEffect(() => {
        if (viewMode === 'list' && products.length > 0) {
            products.forEach(product => {
                if (!productVariants[product.id] && !loadingVariants[product.id]) {
                    loadVariantsForProduct(product.id);
                }
            });
        }
    }, [viewMode, products]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const result = await productService.getAll(pagination.page, 12, debouncedSearch || undefined, selectedCategory, 'active');
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

    // Load variants cho một sản phẩm
    const loadVariantsForProduct = async (productId: number) => {
        if (productVariants[productId]) return; // Đã load rồi

        setLoadingVariants(prev => ({ ...prev, [productId]: true }));
        try {
            const variants = await productService.getProductVariants(productId);
            setProductVariants(prev => ({ ...prev, [productId]: variants }));

            // Tự động chọn variant đầu tiên
            if (variants.length > 0) {
                setSelectedVariants(prev => ({ ...prev, [productId]: variants[0].id }));
            }
        } catch (error) {
            console.error('Failed to load variants:', error);
            setProductVariants(prev => ({ ...prev, [productId]: [] }));
        } finally {
            setLoadingVariants(prev => ({ ...prev, [productId]: false }));
        }
    };

    // Show toast
    const showToast = (type: 'success' | 'error', message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    // Handle variant selection change
    const handleVariantChange = (productId: number, variantId: number) => {
        setSelectedVariants(prev => ({ ...prev, [productId]: variantId }));
    };

    // Handle quantity change
    const handleQuantityChange = (productId: number, qty: number) => {
        setQuantities(prev => ({ ...prev, [productId]: Math.max(1, qty) }));
    };

    // Get variant label for display
    const getVariantLabel = (variant: ProductVariant): string => {
        // Sử dụng attribute_values nếu có
        if (variant.attribute_values && variant.attribute_values.length > 0) {
            return variant.attribute_values.map(av => av.display_value || av.value).join(' / ');
        }
        // Fallback to legacy fields
        if (variant.color) return variant.color;
        if (variant.size) return variant.size;
        if (variant.storage) return variant.storage;
        return variant.sku || 'Mặc định';
    };

    // Quick Add to Cart
    const handleQuickAddToCart = async (product: Product) => {
        const productId = product.id;
        const variants = productVariants[productId] || [];
        const selectedVariantId = selectedVariants[productId];
        const quantity = quantities[productId] || 1;

        setLoadingAdd(prev => ({ ...prev, [productId]: true }));

        // Trường hợp 1: Sản phẩm KHÔNG có biến thể - thêm trực tiếp bằng giá gốc
        if (variants.length === 0) {
            const addProductToCart = () => {
                cartService.addToCart({
                    product_id: productId,
                    variant_id: null,
                    name: product.name,
                    variant_label: 'Mặc định',
                    price: product.selling_price,
                    quantity: quantity,
                    image_url: product.image_url,
                    sku: product.sku,
                    max_stock: 999, // Không giới hạn vì không có variant stock
                });

                showToast('success', 'Đã thêm sản phẩm vào giỏ hàng');
                window.dispatchEvent(new CustomEvent('cartUpdated'));
                console.log("EVENT FIRED");
            };

            try {
                if (isAuthenticated) {
                    // Gọi API - sử dụng product_id làm variant_id tạm thời cho sản phẩm không có biến thể
                    const result = await cartService.addToCartAPI(productId, 0, quantity);
                    if (result.success) {
                        showToast('success', result.message);
                    } else {
                        addProductToCart();
                    }
                } else {
                    addProductToCart();
                }
            } catch (error) {
                console.error('Add to cart error:', error);
                addProductToCart();
            } finally {
                setLoadingAdd(prev => ({ ...prev, [productId]: false }));
            }
            return;
        }

        // Trường hợp 2: Sản phẩm CÓ biến thể - cần chọn variant
        if (!selectedVariantId) {
            showToast('error', 'Vui lòng chọn biến thể sản phẩm');
            setLoadingAdd(prev => ({ ...prev, [productId]: false }));
            return;
        }

        const selectedVariant = variants.find(v => v.id === selectedVariantId);
        if (!selectedVariant) {
            showToast('error', 'Không tìm thấy biến thể');
            setLoadingAdd(prev => ({ ...prev, [productId]: false }));
            return;
        }

        // Validate tồn kho: kiểm tra tổng trong giỏ + sắp thêm vs stock
        const maxStock = selectedVariant.stock;
        if (maxStock > 0) {
            const currentCart = cartService.getCart();
            const existingItem = currentCart.find(item =>
                item.product_id === productId &&
                item.variant_id === selectedVariantId
            );
            const currentInCart = existingItem?.quantity || 0;
            if (currentInCart + quantity > maxStock) {
                const canAdd = maxStock - currentInCart;
                if (canAdd <= 0) {
                    showToast('error', `Đã có ${currentInCart} sản phẩm trong giỏ (tồn kho: ${maxStock})`);
                } else {
                    showToast('error', `Chỉ thêm được ${canAdd} nữa (đã có ${currentInCart} trong giỏ, tồn kho: ${maxStock})`);
                }
                setLoadingAdd(prev => ({ ...prev, [productId]: false }));
                return;
            }
        }

        // Helper function to add to localStorage
        const addToLocalStorage = () => {
            cartService.addToCart({
                product_id: productId,
                variant_id: selectedVariantId,
                name: product.name,
                variant_label: getVariantLabel(selectedVariant),
                price: product.selling_price, // Fix: Use base selling price
                quantity: quantity,
                image_url: selectedVariant.image_url || product.image_url,
                sku: selectedVariant.sku || product.sku,
                max_stock: selectedVariant.stock,
            });
            showToast('success', 'Đã thêm sản phẩm vào giỏ hàng');
            window.dispatchEvent(new CustomEvent('cartUpdated'));
            console.log("EVENT FIRED");
        };

        try {
            if (isAuthenticated) {
                // User đã đăng nhập - gọi API
                const result = await cartService.addToCartAPI(productId, selectedVariantId, quantity);
                if (result.success) {
                    showToast('success', result.message);
                } else {
                    // API trả về lỗi - fallback về localStorage thay vì hiển thị lỗi
                    // Trừ trường hợp lỗi nghiệp vụ rõ ràng (hết hàng, không đủ stock...)
                    const errorMsg = result.message.toLowerCase();
                    if (errorMsg.includes('đăng nhập') || errorMsg.includes('token') || errorMsg.includes('lỗi')) {
                        // Lỗi auth hoặc lỗi server - fallback localStorage
                        console.warn('API failed, using localStorage fallback:', result.message);
                        addToLocalStorage();
                    } else {
                        // Lỗi nghiệp vụ (hết hàng, không đủ stock) - hiển thị cho user
                        showToast('error', result.message);
                    }
                }
            } else {
                // Chưa đăng nhập - dùng localStorage
                addToLocalStorage();
            }
        } catch (error) {
            console.error('Add to cart error:', error);
            // Exception - fallback localStorage
            addToLocalStorage();
        } finally {
            setLoadingAdd(prev => ({ ...prev, [productId]: false }));
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">

            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in ${toast.type === 'success'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-red-500 text-white'
                            }`}
                    >
                        <span>{toast.type === 'success' ? '✅' : '❌'}</span>
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>

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
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-8 -mt-8 relative z-10">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                            <input
                                type="text"
                                placeholder="Tìm kiếm sản phẩm theo tên, SKU..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">📁 Danh mục:</span>
                            <select
                                value={selectedCategory || ''}
                                onChange={(e) => { setSelectedCategory(e.target.value ? parseInt(e.target.value) : undefined); setPagination(p => ({ ...p, page: 1 })); }}
                                className="px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-800 dark:text-white min-w-[160px]"
                            >
                                <option value="">Tất cả</option>
                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>

                        {/* Sort */}
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">📊 Sắp xếp:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-800 dark:text-white min-w-[140px]"
                            >
                                <option value="newest">Mới nhất</option>
                                <option value="price-low">Giá thấp → cao</option>
                                <option value="price-high">Giá cao → thấp</option>
                                <option value="name">Tên A-Z</option>
                            </select>
                        </div>
                        <div className="">
                        <MiniCart />
                        </div>
                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
                            {/* <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                title="Hiển thị dạng lưới"
                            >
                                ▦
                            </button> */}
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                title="Hiển thị dạng danh sách"
                            >
                                ☰
                            </button>
                        </div>
                    </div>



                    {/* Active Filters */}
                    {(search || selectedCategory) && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <span className="text-sm text-slate-500 dark:text-slate-400">Đang lọc:</span>
                            {search && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                                    🔍 "{search}"
                                    <button onClick={() => setSearch('')} className="ml-1 hover:text-blue-900 dark:hover:text-blue-100">×</button>
                                </span>
                            )}
                            {selectedCategory && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded-full text-sm">
                                    📁 {categories.find(c => c.id === selectedCategory)?.name}
                                    <button onClick={() => setSelectedCategory(undefined)} className="ml-1 hover:text-violet-900 dark:hover:text-violet-100">×</button>
                                </span>
                            )}
                            <button
                                onClick={() => { setSearch(''); setSelectedCategory(undefined); }}
                                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ml-2"
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
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
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
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
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
                        <p className="text-slate-500 dark:text-slate-400">Đang tải sản phẩm...</p>
                    </div>
                ) : (
                    <>
                        {/* GRID VIEW */}
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                                {sortedProducts.map(product => (
                                    <div
                                        key={product.id}
                                        className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all duration-300"
                                    >
                                        {/* Image - Link to detail */}
                                        <Link to={`/products/${product.id}`}>
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
                                        </Link>

                                        {/* Content */}
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/50 px-2 py-0.5 rounded">{product.sku}</span>
                                                {product.brand && (
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">• {product.brand}</span>
                                                )}
                                            </div>
                                            <Link to={`/products/${product.id}`}>
                                                <h3 className="font-semibold text-slate-800 dark:text-white mb-2 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                    {product.name}
                                                </h3>
                                            </Link>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                                    {new Intl.NumberFormat('vi-VN').format(product.selling_price)}₫
                                                </span>
                                                <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/50 px-2 py-1 rounded-lg">
                                                    ✓ Còn hàng
                                                </span>
                                            </div>

                                            {/* Quick Add Button for Grid - Link to detail */}
                                            <Link
                                                to={`/products/${product.id}`}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                                            >
                                                🛒 Thêm vào giỏ
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* LIST VIEW with Quick Add */}
                        {viewMode === 'list' && (
                            <div className="space-y-4 mb-8">
                                {sortedProducts.map(product => {
                                    const variants = productVariants[product.id] || [];
                                    const selectedVariantId = selectedVariants[product.id];
                                    const quantity = quantities[product.id] || 1;
                                    const isLoadingVariants = loadingVariants[product.id];
                                    const isLoadingAdd = loadingAdd[product.id];

                                    return (
                                        <div
                                            key={product.id}
                                            className="group flex gap-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 hover:shadow-lg transition-all"
                                            onMouseEnter={() => loadVariantsForProduct(product.id)}
                                        >
                                            {/* Image */}
                                            <Link to={`/products/${product.id}`} className="flex-shrink-0">
                                                <div className="w-32 h-32 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center text-4xl overflow-hidden">
                                                    {product.image_url ? (
                                                        <img
                                                            src={uploadService.getImageUrl(product.image_url)}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                        />
                                                    ) : '📦'}
                                                </div>
                                            </Link>

                                            {/* Content */}
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/50 px-2 py-0.5 rounded">{product.sku}</span>
                                                        {product.category_name && (
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{product.category_name}</span>
                                                        )}
                                                    </div>
                                                    <Link to={`/products/${product.id}`}>
                                                        <h3 className="font-semibold text-lg text-slate-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                            {product.name}
                                                        </h3>
                                                    </Link>
                                                    {product.brand && <p className="text-sm text-slate-500 dark:text-slate-400">Thương hiệu: {product.brand}</p>}
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                        {new Intl.NumberFormat('vi-VN').format(product.selling_price)}₫
                                                    </span>
                                                    <span className="text-sm text-emerald-600 dark:text-emerald-400">✓ Còn hàng</span>
                                                </div>
                                            </div>

                                            {/* Quick Add Section - Fixed width for consistent layout */}
                                            <div className="flex-shrink-0 w-[240px] flex flex-col gap-3 border-l-2 border-slate-300 pl-4 bg-gradient-to-r from-slate-50 to-white rounded-r-xl py-3 pr-3">
                                                {/* Variant Dropdown */}
                                                <div>
                                                    <label className="text-sm font-bold text-slate-800 mb-2 block">Biến thể:</label>
                                                    {isLoadingVariants ? (
                                                        <div className="h-11 flex items-center justify-center text-blue-600 text-sm font-medium bg-blue-50 rounded-lg border-2 border-blue-200">
                                                            <span className="animate-spin mr-2">⏳</span> Đang tải...
                                                        </div>
                                                    ) : variants.length === 0 ? (
                                                        <div className="h-11 flex items-center justify-center text-orange-700 text-sm bg-orange-50 rounded-lg border-2 border-orange-300 font-semibold">
                                                            ⚠️ Chưa có biến thể
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={selectedVariantId || ''}
                                                            onChange={(e) => handleVariantChange(product.id, parseInt(e.target.value))}
                                                            className="w-full px-2 py-2.5 border-2 border-slate-400 rounded-lg text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer truncate"
                                                        >
                                                            {variants.map(v => (
                                                                <option key={v.id} value={v.id}>
                                                                    {getVariantLabel(v)} {v.stock > 0 ? `(${v.stock})` : '(Hết)'}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>

                                                {/* Quantity Input */}
                                                <div>
                                                    <label className="text-sm font-bold text-slate-800 mb-2 block">Số lượng:</label>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => handleQuantityChange(product.id, quantity - 1)}
                                                            disabled={quantity <= 1}
                                                            className="w-10 h-10 flex items-center justify-center border-2 border-slate-400 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-xl font-bold text-slate-700 transition-all"
                                                        >
                                                            −
                                                        </button>
                                                        <input
                                                            type="number"
                                                            value={quantity}
                                                            onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                                                            min="1"
                                                            className="w-12 h-10 px-1 text-center border-2 border-slate-400 rounded-lg text-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                        />
                                                        <button
                                                            onClick={() => handleQuantityChange(product.id, quantity + 1)}
                                                            className="w-10 h-10 flex items-center justify-center border-2 border-slate-400 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-400 text-xl font-bold text-slate-700 transition-all"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Add to Cart Button */}
                                                {variants.length === 0 && !isLoadingVariants ? (
                                                    // Không có biến thể -> Thêm trực tiếp vào giỏ hàng
                                                    <button
                                                        onClick={() => handleQuickAddToCart(product)}
                                                        disabled={isLoadingAdd}
                                                        className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${isLoadingAdd
                                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg'
                                                            }`}
                                                    >
                                                        {isLoadingAdd ? (
                                                            <><span className="animate-spin">⏳</span> Đang thêm...</>
                                                        ) : (
                                                            <>🛒 Thêm vào giỏ</>
                                                        )}
                                                    </button>
                                                ) : (
                                                    // Có biến thể -> Quick Add button
                                                    <button
                                                        onClick={() => handleQuickAddToCart(product)}
                                                        disabled={isLoadingAdd || isLoadingVariants}
                                                        className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${isLoadingAdd || isLoadingVariants
                                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg'
                                                            }`}
                                                    >
                                                        {isLoadingAdd ? (
                                                            <>
                                                                <span className="animate-spin">⏳</span>
                                                                Đang thêm...
                                                            </>
                                                        ) : (
                                                            <>
                                                                🛒 Thêm vào giỏ
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Empty State */}
                        {products.length === 0 && (
                            <div className="text-center py-16">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Không tìm thấy sản phẩm</h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-6">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
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

            {/* CSS for animations */}
            <style>{`
                @keyframes slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }
            `}</style>
        </div >
    );
};

export default ProductList;
