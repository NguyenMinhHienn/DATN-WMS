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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6">
                <ol className="flex items-center gap-2 text-sm text-slate-500">
                    <li><Link to="/" className="hover:text-primary-600">Trang chủ</Link></li>
                    <li>/</li>
                    <li><Link to="/products" className="hover:text-primary-600">Sản phẩm</Link></li>
                    <li>/</li>
                    <li className="text-slate-800">{product.name}</li>
                </ol>
            </nav>

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

                    <div className="mt-6">
                        <Link to="/products" className="btn btn-secondary">← Quay lại danh sách</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
