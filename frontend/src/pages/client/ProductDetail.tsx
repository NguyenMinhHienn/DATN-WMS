import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productService } from '../../services/productService';
import { Product } from '../../interface';

const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadProduct(parseInt(id));
    }, [id]);

    const loadProduct = async (productId: number) => {
        try {
            const data = await productService.getById(productId);
            setProduct(data);
        } catch (error) {
            console.error('Failed to load product:', error);
        } finally {
            setLoading(false);
        }
    };

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
                <h1 className="text-2xl font-bold text-slate-800 mb-4">Product Not Found</h1>
                <Link to="/products" className="btn btn-primary">Back to Products</Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumb */}
            <nav className="mb-6">
                <ol className="flex items-center gap-2 text-sm text-slate-500">
                    <li><Link to="/" className="hover:text-primary-600">Home</Link></li>
                    <li>/</li>
                    <li><Link to="/products" className="hover:text-primary-600">Products</Link></li>
                    <li>/</li>
                    <li className="text-slate-800">{product.name}</li>
                </ol>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Image */}
                <div className="card">
                    <div className="w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-9xl">
                        {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                        ) : '📦'}
                    </div>
                </div>

                {/* Details */}
                <div>
                    <div className="mb-4">
                        <span className="text-sm text-primary-600 font-mono">{product.sku}</span>
                        {product.barcode && <span className="text-sm text-slate-500 ml-4">Barcode: {product.barcode}</span>}
                    </div>

                    <h1 className="text-3xl font-bold text-slate-800 mb-2">{product.name}</h1>

                    {product.brand && (
                        <p className="text-lg text-slate-600 mb-4">by {product.brand}</p>
                    )}

                    <div className="flex items-baseline gap-4 mb-6">
                        <span className="text-4xl font-bold text-primary-600">
                            {new Intl.NumberFormat('vi-VN').format(product.selling_price)}₫
                        </span>
                        {product.wholesale_price && (
                            <span className="text-lg text-slate-500">
                                Wholesale: {new Intl.NumberFormat('vi-VN').format(product.wholesale_price)}₫
                            </span>
                        )}
                    </div>

                    {product.description && (
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-slate-800 mb-2">Description</h2>
                            <p className="text-slate-600 leading-relaxed">{product.description}</p>
                        </div>
                    )}

                    <div className="card bg-slate-50">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Specifications</h2>
                        <dl className="grid grid-cols-2 gap-4 text-sm">
                            {product.category_name && (
                                <>
                                    <dt className="text-slate-500">Category</dt>
                                    <dd className="text-slate-800 font-medium">{product.category_name}</dd>
                                </>
                            )}
                            {product.unit_name && (
                                <>
                                    <dt className="text-slate-500">Unit</dt>
                                    <dd className="text-slate-800 font-medium">{product.unit_name}</dd>
                                </>
                            )}
                            <dt className="text-slate-500">Minimum Stock</dt>
                            <dd className="text-slate-800 font-medium">{product.min_stock_level}</dd>
                            <dt className="text-slate-500">Reorder Point</dt>
                            <dd className="text-slate-800 font-medium">{product.reorder_point}</dd>
                            {product.has_expiry && (
                                <>
                                    <dt className="text-slate-500">Tracking</dt>
                                    <dd className="text-slate-800 font-medium">Has Expiry Date</dd>
                                </>
                            )}
                        </dl>
                    </div>

                    <div className="mt-6">
                        <Link to="/products" className="btn btn-secondary">← Back to Products</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
