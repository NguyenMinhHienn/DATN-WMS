import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productVariantService } from '../../services/productVariantService';
import { productService } from '../../services/productService';
import { uploadService } from '../../services/uploadService';
import { specificationService, ProductSpecification } from '../../services/specificationService';
import { ProductWithVariants, ProductVariant, VARIANT_TYPES_CONFIG } from '../../interface';

const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<ProductWithVariants | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
    const [specifications, setSpecifications] = useState<ProductSpecification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // State cho số lượng sản phẩm muốn thêm vào giỏ
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (id) loadProduct(parseInt(id));
    }, [id]);

    const loadProduct = async (productId: number) => {
        try {
            setError(null);
            // First try to get product with variants
            let data = await productVariantService.getProductWithVariants(productId);

            // Fallback: if that returns null, try regular product fetch
            if (!data) {
                const basicProduct = await productService.getById(productId);
                if (basicProduct) {
                    data = { ...basicProduct, variants: [] } as ProductWithVariants;
                }
            }

            setProduct(data);
            // Auto-select first variant if available
            if (data?.variants && data.variants.length > 0) {
                setSelectedVariant(data.variants[0]);
            }

            // Load specifications
            try {
                const specs = await specificationService.getByProductId(productId);
                setSpecifications(specs);
            } catch (specErr) {
                console.log('No specifications found for product:', productId);
                setSpecifications([]);
            }
        } catch (err: any) {
            console.error('Failed to load product:', err);
            setError(err?.response?.data?.message || 'Không thể tải sản phẩm. Vui lòng đăng nhập.');
        } finally {
            setLoading(false);
        }
    };

    // Get color hex value for display
    const getColorHex = (colorValue: string): string => {
        const colorConfig = VARIANT_TYPES_CONFIG.find(c => c.key === 'color');
        const opt = colorConfig?.options.find(o => o.value === colorValue);
        return opt?.hex || '#6B7280';
    };

    // Get label for variant attribute
    const getVariantOptionLabel = (key: string, value: string): string => {
        const config = VARIANT_TYPES_CONFIG.find(c => c.key === key);
        const opt = config?.options.find(o => o.value === value);
        return opt?.label || value;
    };

    // Get display price (variant price or product base price)
    const displayPrice = selectedVariant?.price ?? product?.selling_price ?? 0;

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12 text-center">
                <h1 className="text-2xl font-bold text-slate-800 mb-4">Không tìm thấy sản phẩm</h1>
                {error && (
                    <p className="text-red-600 mb-4">{error}</p>
                )}
                <Link to="/products" className="btn btn-primary">Quay lại danh sách</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ========== HERO HEADER SECTION ========== */}
            <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Breadcrumb với style mới */}
                    <nav className="mb-4">
                        <ol className="flex items-center gap-2 text-sm text-primary-100">
                            <li className="flex items-center gap-1">
                                <span>🏠</span>
                                <Link to="/" className="hover:text-white transition-colors">Trang chủ</Link>
                            </li>
                            <li className="text-primary-300">›</li>
                            <li className="flex items-center gap-1">
                                <span>📦</span>
                                <Link to="/products" className="hover:text-white transition-colors">Sản phẩm</Link>
                            </li>
                            {product.category_name && (
                                <>
                                    <li className="text-primary-300">›</li>
                                    <li className="flex items-center gap-1">
                                        <span>📁</span>
                                        <span className="hover:text-white transition-colors">{product.category_name}</span>
                                    </li>
                                </>
                            )}
                            <li className="text-primary-300">›</li>
                            <li className="text-white font-medium truncate max-w-[200px] sm:max-w-none">{product.name}</li>
                        </ol>
                    </nav>

                    {/* Title Row với các action buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">{product.name}</h1>
                            <div className="flex items-center gap-3 mt-2">
                                {product.category_name && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                                        📁 {product.category_name}
                                    </span>
                                )}
                                {product.brand && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                                        🏷️ {product.brand}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-mono">
                                    SKU: {selectedVariant?.sku || product.sku}
                                </span>
                            </div>
                        </div>

                        {/* Share & Action Buttons - UI only */}
                        <div className="flex items-center gap-2">
                            <button
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
                                title="Chia sẻ sản phẩm"
                            // TODO: onClick - mở modal chia sẻ
                            >
                                📤
                            </button>
                            <button
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
                                title="So sánh sản phẩm"
                            // TODO: onClick - thêm vào danh sách so sánh
                            >
                                ⚖️
                            </button>
                            <button
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
                                title="In thông tin"
                            // TODO: onClick - window.print()
                            >
                                🖨️
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== MAIN CONTENT ========== */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Image */}
                    <div className="card">
                        <div className="w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-9xl overflow-hidden">
                            {(selectedVariant?.image_url || product.image_url) ? (
                                <img src={uploadService.getImageUrl(selectedVariant?.image_url || product.image_url || '')} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                            ) : '📦'}
                        </div>
                    </div>

                    {/* Details */}
                    <div>
                        <div className="mb-4">
                            <span className="text-sm text-primary-600 font-mono">{selectedVariant?.sku || product.sku}</span>
                            {product.barcode && <span className="text-sm text-slate-500 ml-4">Barcode: {product.barcode}</span>}
                        </div>

                        <h1 className="text-3xl font-bold text-slate-800 mb-2">{product.name}</h1>

                        {product.brand && (
                            <p className="text-lg text-slate-600 mb-4">by {product.brand}</p>
                        )}

                        <div className="flex items-baseline gap-4 mb-6">
                            <span className="text-4xl font-bold text-primary-600">
                                {new Intl.NumberFormat('vi-VN').format(displayPrice)}₫
                            </span>
                            {product.variants && product.variants.length > 1 && product.min_price !== product.max_price && (
                                <span className="text-lg text-slate-500">
                                    ({new Intl.NumberFormat('vi-VN').format(product.min_price || 0)}₫ - {new Intl.NumberFormat('vi-VN').format(product.max_price || 0)}₫)
                                </span>
                            )}
                        </div>

                        {/* Variant Selection */}
                        {product.variants && product.variants.length > 0 && (
                            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">Chọn phiên bản:</h3>
                                <div className="flex flex-wrap gap-2">
                                    {product.variants.map(variant => {
                                        const isSelected = selectedVariant?.id === variant.id;
                                        // Build variant label from attributes
                                        const labelParts: string[] = [];
                                        if (variant.color) labelParts.push(getVariantOptionLabel('color', variant.color));
                                        if (variant.size) labelParts.push(getVariantOptionLabel('size', variant.size));
                                        if (variant.storage) labelParts.push(variant.storage);
                                        if (variant.ram) labelParts.push(variant.ram);
                                        if (variant.material) labelParts.push(getVariantOptionLabel('material', variant.material));
                                        if (variant.capacity) labelParts.push(variant.capacity);

                                        const label = labelParts.join(' / ') || 'Mặc định';

                                        return (
                                            <button
                                                key={variant.id}
                                                onClick={() => setSelectedVariant(variant)}
                                                className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-all ${isSelected
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                    : 'border-slate-200 hover:border-slate-400'
                                                    } ${variant.stock <= 0 ? 'opacity-50' : ''}`}
                                            >
                                                {variant.color && (
                                                    <span
                                                        className="w-4 h-4 rounded-full border"
                                                        style={{ backgroundColor: getColorHex(variant.color) }}
                                                    />
                                                )}
                                                <span className="text-sm">{label}</span>
                                                {variant.stock <= 0 && <span className="text-xs text-red-500">(Hết hàng)</span>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Selected variant info */}
                                {selectedVariant && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 text-sm text-slate-600">
                                        <span>Tồn kho: <strong className={selectedVariant.stock > 0 ? 'text-emerald-600' : 'text-red-600'}>{selectedVariant.stock}</strong></span>
                                        <span className="mx-2">|</span>
                                        <span>SKU: <strong className="font-mono">{selectedVariant.sku}</strong></span>
                                    </div>
                                )}
                            </div>
                        )}

                        {product.description && (
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-slate-800 mb-2">Mô tả</h2>
                                <p className="text-slate-600 leading-relaxed">{product.description}</p>
                            </div>
                        )}

                        <div className="card bg-slate-50">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Thuộc tính sản phẩm</h2>
                            <table className="w-full text-sm">
                                <tbody>
                                    {product.category_name && (
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-500 w-1/3">Danh mục</td>
                                            <td className="py-2 text-slate-800 font-medium">{product.category_name}</td>
                                        </tr>
                                    )}
                                    {product.unit_name && (
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-500 w-1/3">Đơn vị</td>
                                            <td className="py-2 text-slate-800 font-medium">{product.unit_name}</td>
                                        </tr>
                                    )}
                                    {product.variant_count !== undefined && product.variant_count > 0 && (
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-500 w-1/3">Số biến thể</td>
                                            <td className="py-2 text-slate-800 font-medium">{product.variant_count}</td>
                                        </tr>
                                    )}
                                    {product.total_stock !== undefined && (
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-500 w-1/3">Tổng tồn kho</td>
                                            <td className="py-2 text-slate-800 font-medium">{product.total_stock}</td>
                                        </tr>
                                    )}
                                    {product.available_colors && (
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-500 w-1/3">Màu có sẵn</td>
                                            <td className="py-2 text-slate-800 font-medium">{product.available_colors}</td>
                                        </tr>
                                    )}
                                    {product.has_expiry && (
                                        <tr className="border-b border-slate-200">
                                            <td className="py-2 text-slate-500 w-1/3">Theo dõi</td>
                                            <td className="py-2 text-slate-800 font-medium">Có ngày hết hạn</td>
                                        </tr>
                                    )}
                                    {/* Display selected variant's specifications */}
                                    {selectedVariant && (
                                        <>
                                            {/* Display flexible attribute_values (new system) */}
                                            {selectedVariant.attribute_values && selectedVariant.attribute_values.length > 0 ? (
                                                <>
                                                    {selectedVariant.attribute_values.map((attrVal: any) => (
                                                        <tr key={attrVal.id} className="border-b border-slate-200">
                                                            <td className="py-2 text-slate-500 w-1/3">{attrVal.attribute_display_name || attrVal.attribute_name}</td>
                                                            <td className="py-2 text-slate-800 font-medium flex items-center gap-2">
                                                                {attrVal.color_code && (
                                                                    <span
                                                                        className="w-4 h-4 rounded-full border border-slate-300 inline-block"
                                                                        style={{ backgroundColor: attrVal.color_code }}
                                                                    />
                                                                )}
                                                                {attrVal.display_value}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </>
                                            ) : (
                                                /* Fallback: Display legacy columns for old products */
                                                <>
                                                    {selectedVariant.color && (
                                                        <tr className="border-b border-slate-200">
                                                            <td className="py-2 text-slate-500 w-1/3">Màu sắc</td>
                                                            <td className="py-2 text-slate-800 font-medium flex items-center gap-2">
                                                                <span
                                                                    className="w-4 h-4 rounded-full border border-slate-300 inline-block"
                                                                    style={{ backgroundColor: getColorHex(selectedVariant.color) }}
                                                                />
                                                                {getVariantOptionLabel('color', selectedVariant.color)}
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {selectedVariant.size && (
                                                        <tr className="border-b border-slate-200">
                                                            <td className="py-2 text-slate-500 w-1/3">Kích thước</td>
                                                            <td className="py-2 text-slate-800 font-medium">{selectedVariant.size}</td>
                                                        </tr>
                                                    )}
                                                    {selectedVariant.storage && (
                                                        <tr className="border-b border-slate-200">
                                                            <td className="py-2 text-slate-500 w-1/3">Dung lượng</td>
                                                            <td className="py-2 text-slate-800 font-medium">{selectedVariant.storage}</td>
                                                        </tr>
                                                    )}
                                                    {selectedVariant.ram && (
                                                        <tr className="border-b border-slate-200">
                                                            <td className="py-2 text-slate-500 w-1/3">RAM</td>
                                                            <td className="py-2 text-slate-800 font-medium">{selectedVariant.ram}</td>
                                                        </tr>
                                                    )}
                                                    {selectedVariant.material && (
                                                        <tr className="border-b border-slate-200">
                                                            <td className="py-2 text-slate-500 w-1/3">Chất liệu</td>
                                                            <td className="py-2 text-slate-800 font-medium">{selectedVariant.material}</td>
                                                        </tr>
                                                    )}
                                                    {selectedVariant.capacity && (
                                                        <tr className="border-b border-slate-200">
                                                            <td className="py-2 text-slate-500 w-1/3">Dung tích</td>
                                                            <td className="py-2 text-slate-800 font-medium">{selectedVariant.capacity}</td>
                                                        </tr>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Custom Product Specifications */}
                        {specifications.length > 0 && (
                            <div className="card bg-white border border-slate-200 mt-4">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4">Chi tiết thuộc tính</h2>
                                <table className="w-full text-sm">
                                    <tbody>
                                        {specifications.map((spec, index) => (
                                            <tr key={spec.id} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                                                <td className="py-2 px-3 text-slate-500 font-medium w-1/3">{spec.spec_name}</td>
                                                <td className="py-2 px-3 text-slate-800">{spec.spec_value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ========== (B) ADD TO CART SECTION - UI ONLY ========== */}
                        {/* TODO: Gắn logic xử lý thêm giỏ hàng khi có API */}
                        <div className="card bg-gradient-to-r from-primary-50 to-white border border-primary-100 mt-6">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                {/* Quantity Selector - Hoạt động */}
                                <div className="flex items-center gap-2">
                                    <label htmlFor="qty-input" className="text-sm font-medium text-slate-700">Số lượng:</label>
                                    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                                        <button
                                            id="btn-decrease-qty"
                                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                                            disabled={quantity <= 1}
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            id="qty-input"
                                            className="w-16 text-center border-0 focus:ring-0 py-2"
                                            value={quantity}
                                            min={1}
                                            max={selectedVariant?.stock ?? product.total_stock ?? 999}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 1;
                                                const maxStock = selectedVariant?.stock ?? product.total_stock ?? 999;
                                                setQuantity(Math.max(1, Math.min(val, maxStock)));
                                            }}
                                        />
                                        <button
                                            id="btn-increase-qty"
                                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={() => {
                                                const maxStock = selectedVariant?.stock ?? product.total_stock ?? 999;
                                                setQuantity(prev => Math.min(maxStock, prev + 1));
                                            }}
                                            disabled={quantity >= (selectedVariant?.stock ?? product.total_stock ?? 999)}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Add to Cart Button - UI only */}
                                <button
                                    id="btn-add-to-cart"
                                    className="flex-1 sm:flex-none btn bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 px-8 py-3 text-lg font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                                // TODO: onClick - gọi API thêm vào giỏ hàng
                                >
                                    <span className="text-xl">🛒</span>
                                    Thêm vào giỏ hàng
                                </button>

                                {/* Wishlist Button - UI only */}
                                <button
                                    id="btn-add-wishlist"
                                    className="btn btn-secondary px-4 py-3"
                                    title="Thêm vào yêu thích"
                                // TODO: onClick - gọi API thêm wishlist
                                >
                                    ♡
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-3 text-center sm:text-left">
                                {/* UI only - hiển thị tình trạng stock */}
                                {(selectedVariant?.stock ?? product.total_stock ?? 0) > 0
                                    ? `✓ Còn hàng (${selectedVariant?.stock ?? product.total_stock} sản phẩm)`
                                    : '✗ Hết hàng'}
                            </p>
                        </div>

                        <div className="mt-6">
                            <Link to="/products" className="btn btn-secondary">← Quay lại danh sách</Link>
                        </div>
                    </div>
                </div>

                {/* ========== (C) RELATED PRODUCTS SECTION - UI ONLY ========== */}
                {/* TODO: Replace bằng API sản phẩm liên quan - GET /products/related/:productId */}
                <div className="mt-12 border-t border-slate-200 pt-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span>📦</span> Sản phẩm liên quan
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Placeholder Related Products - sẽ thay bằng map data từ API */}
                        {/* TODO: Thay mảng placeholder này bằng API GET /products/related/:productId */}
                        {[
                            { id: 1, name: 'Sản phẩm tương tự 1', price: 1500000, image: '' },
                            { id: 2, name: 'Sản phẩm tương tự 2', price: 2200000, image: '' },
                            { id: 3, name: 'Sản phẩm tương tự 3', price: 1850000, image: '' },
                            { id: 4, name: 'Sản phẩm tương tự 4', price: 3100000, image: '' },
                        ].map(item => (
                            <Link
                                key={item.id}
                                to={`/products/${item.id}`}
                                id={`related-product-${item.id}`}
                                className="card p-4 hover:shadow-lg transition-shadow cursor-pointer group block"
                            >
                                <div className="aspect-square bg-slate-100 rounded-lg mb-3 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform overflow-hidden">
                                    {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        '📦'
                                    )}
                                </div>
                                <h3 className="text-sm font-medium text-slate-800 line-clamp-2 mb-1 group-hover:text-primary-600">
                                    {item.name}
                                </h3>
                                <p className="text-primary-600 font-bold">
                                    {new Intl.NumberFormat('vi-VN').format(item.price)}₫
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ========== (D) PRODUCT RATINGS SECTION - UI ONLY ========== */}
                {/* TODO: Gắn API đánh giá - GET /reviews/product/:productId */}
                <div className="mt-12 border-t border-slate-200 pt-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span>⭐</span> Đánh giá sản phẩm
                    </h2>

                    {/* Rating Summary - UI only */}
                    <div className="card bg-gradient-to-br from-amber-50 to-white border-amber-100">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Average Rating Display */}
                            <div className="text-center">
                                <div className="text-5xl font-bold text-amber-500">0.0</div>
                                <div className="text-2xl text-amber-400 mt-1">★★★★★</div>
                                <div className="text-sm text-slate-500 mt-1">
                                    {/* TODO: Thay bằng tổng số đánh giá từ API */}
                                    0 đánh giá
                                </div>
                            </div>

                            {/* Rating Bars Breakdown - UI placeholder */}
                            <div className="flex-1 w-full md:w-auto">
                                {[5, 4, 3, 2, 1].map(star => (
                                    <div key={star} className="flex items-center gap-2 mb-1">
                                        <span className="text-sm text-slate-600 w-12">{star} sao</span>
                                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                            {/* TODO: Width % dựa trên số lượng rating từng sao */}
                                            <div
                                                className="h-full bg-amber-400 rounded-full"
                                                style={{ width: '0%' }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-500 w-8">0</span>
                                    </div>
                                ))}
                            </div>

                            {/* Write Review Button - UI only */}
                            <div className="text-center">
                                <button
                                    id="btn-write-review"
                                    className="btn btn-primary px-6 py-3"
                                // TODO: onClick - mở modal viết đánh giá
                                >
                                    ✍️ Viết đánh giá
                                </button>
                                <p className="text-xs text-slate-500 mt-2">Đăng nhập để đánh giá</p>
                            </div>
                        </div>
                    </div>

                    {/* Reviews List - Empty State - UI only */}
                    <div className="mt-6">
                        {/* TODO: Map danh sách reviews từ API */}
                        <div className="text-center py-12 text-slate-500">
                            <div className="text-6xl mb-4">📝</div>
                            <p className="text-lg font-medium">Chưa có đánh giá nào</p>
                            <p className="text-sm mt-1">Hãy là người đầu tiên đánh giá sản phẩm này!</p>
                        </div>
                    </div>
                </div>

                {/* ========== (E) PRODUCT COMMENTS SECTION - UI ONLY ========== */}
                {/* TODO: Gắn API bình luận - GET /comments/product/:productId */}
                <div className="mt-12 border-t border-slate-200 pt-8 pb-12">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span>💬</span> Bình luận & Hỏi đáp
                    </h2>

                    {/* Comment Form - UI only */}
                    <div className="card mb-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Để lại bình luận</h3>
                        <form
                            id="form-comment"
                            // TODO: onSubmit - gọi API POST /comments
                            onSubmit={(e) => e.preventDefault()} // UI only - chặn submit
                        >
                            <textarea
                                id="comment-textarea"
                                className="input min-h-[120px] resize-y mb-4"
                                placeholder="Nhập câu hỏi hoặc bình luận của bạn về sản phẩm này..."
                            // TODO: value, onChange - controlled input
                            />
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-slate-500">
                                    {/* TODO: Hiển thị thông tin user đang đăng nhập */}
                                    Đăng nhập để bình luận
                                </p>
                                <button
                                    type="submit"
                                    id="btn-submit-comment"
                                    className="btn btn-primary px-6"
                                // TODO: disabled khi chưa đăng nhập hoặc textarea rỗng
                                >
                                    📤 Gửi bình luận
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Comments List - Empty State - UI only */}
                    <div className="space-y-4">
                        {/* TODO: Map danh sách comments từ API */}
                        <div className="text-center py-12 text-slate-500">
                            <div className="text-6xl mb-4">💭</div>
                            <p className="text-lg font-medium">Chưa có bình luận nào</p>
                            <p className="text-sm mt-1">Hãy là người đầu tiên hỏi đáp về sản phẩm này!</p>
                        </div>

                        {/* Example Comment Card Structure (hidden by default)
                    TODO: Hiển thị khi có data, cấu trúc mỗi comment:
                    <div className="card border-slate-100">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
                                U
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-slate-800">Username</span>
                                    <span className="text-xs text-slate-500">• 2 giờ trước</span>
                                </div>
                                <p className="text-slate-600">Nội dung bình luận...</p>
                                <div className="mt-2 flex items-center gap-4 text-sm">
                                    <button className="text-slate-500 hover:text-primary-600">👍 Thích</button>
                                    <button className="text-slate-500 hover:text-primary-600">💬 Trả lời</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;

