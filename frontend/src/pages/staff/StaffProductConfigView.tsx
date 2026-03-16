// src/pages/staff/StaffProductConfigView.tsx
import React, { useState, useEffect } from 'react';
import { attributeService } from '../../services/attributeService';
import { productService } from '../../services/productService';
import { Attribute, Category, Product } from '../../interface';

const StaffProductConfigView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'categories' | 'attributes'>('categories');

    // Categories state
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
    const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
    const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);

    // Attributes state
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [attributesLoading, setAttributesLoading] = useState(true);
    const [expandedAttr, setExpandedAttr] = useState<number | null>(null);

    // Load data
    useEffect(() => {
        loadCategories();
        loadAttributes();
    }, []);

    const loadCategories = async () => {
        try {
            setCategoriesLoading(true);
            const data = await productService.getCategories();
            setCategories(data);
        } catch (err) {
            console.error('Failed to load categories:', err);
        } finally {
            setCategoriesLoading(false);
        }
    };

    const loadAttributes = async () => {
        try {
            setAttributesLoading(true);
            const data = await attributeService.getAll(true);
            setAttributes(data);
        } catch (err) {
            console.error('Failed to load attributes:', err);
        } finally {
            setAttributesLoading(false);
        }
    };

    // Load products by category
    const loadCategoryProducts = async (categoryId: number) => {
        try {
            setCategoryProductsLoading(true);
            const result = await productService.getAll(1, 100, undefined, categoryId);
            setCategoryProducts(result.data);
        } catch (err) {
            console.error('Failed to load category products:', err);
            setCategoryProducts([]);
        } finally {
            setCategoryProductsLoading(false);
        }
    };

    // Handle category click - expand/collapse and load products
    const handleCategoryClick = (categoryId: number) => {
        if (expandedCategory === categoryId) {
            setExpandedCategory(null);
            setCategoryProducts([]);
        } else {
            setExpandedCategory(categoryId);
            loadCategoryProducts(categoryId);
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Cấu hình Sản phẩm (View-only)</h1>
                <p className="text-slate-500 mt-1">Xem danh mục và thuộc tính sản phẩm</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'categories'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-emerald-50'
                        }`}
                >
                    📁 Danh mục sản phẩm
                </button>
                <button
                    onClick={() => setActiveTab('attributes')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'attributes'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-emerald-50'
                        }`}
                >
                    🎨 Thuộc tính biến thể
                </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100">
                {/* === CATEGORIES TAB === */}
                {activeTab === 'categories' && (
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Danh sách danh mục</h2>

                        {categoriesLoading ? (
                            <div className="text-center py-8 text-slate-400">
                                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                Đang tải...
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Chưa có danh mục nào.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {categories.map(cat => (
                                    <div
                                        key={cat.id}
                                        className="border border-slate-100 rounded-lg overflow-hidden"
                                    >
                                        {/* Category Header */}
                                        <div
                                            className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-emerald-50/50 transition-all"
                                            onClick={() => handleCategoryClick(cat.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">📁</span>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{cat.name}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{cat.code}</p>
                                                </div>
                                            </div>
                                            <span className="text-slate-400">
                                                {expandedCategory === cat.id ? '▼' : '▶'}
                                            </span>
                                        </div>

                                        {/* Products in Category (Expanded) */}
                                        {expandedCategory === cat.id && (
                                            <div className="p-4 bg-white border-t border-slate-100">
                                                {categoryProductsLoading ? (
                                                    <div className="text-center py-4 text-slate-400">
                                                        <span className="animate-pulse">Đang tải sản phẩm...</span>
                                                    </div>
                                                ) : categoryProducts.length === 0 ? (
                                                    <div className="text-center py-4 text-slate-500 text-sm">
                                                        Chưa có sản phẩm nào trong danh mục này
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <p className="text-sm font-semibold text-emerald-600 mb-3">
                                                            📦 {categoryProducts.length} sản phẩm trong danh mục
                                                        </p>
                                                        {categoryProducts.map(product => (
                                                            <div
                                                                key={product.id}
                                                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                                                            >
                                                                {product.image_url ? (
                                                                    <img
                                                                        src={product.image_url.startsWith('http') ? product.image_url : `http://localhost:3000${product.image_url}`}
                                                                        alt={product.name}
                                                                        className="w-12 h-12 object-cover rounded bg-white p-1"
                                                                    />
                                                                ) : (
                                                                    <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center text-slate-400">
                                                                        📷
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-slate-800 truncate">{product.name}</p>
                                                                    <p className="text-xs text-slate-500">
                                                                        SKU: {product.sku} • {product.selling_price?.toLocaleString()}₫
                                                                    </p>
                                                                </div>
                                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${product.status === 'active'
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-slate-200 text-slate-600'
                                                                    }`}>
                                                                    {product.status === 'active' ? 'Đang bán' : 'Ngừng bán'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* === ATTRIBUTES TAB === */}
                {activeTab === 'attributes' && (
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Danh sách thuộc tính</h2>

                        {attributesLoading ? (
                            <div className="text-center py-8 text-slate-400">
                                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                Đang tải...
                            </div>
                        ) : attributes.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Chưa có thuộc tính nào.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {attributes.map(attr => (
                                    <div
                                        key={attr.id}
                                        className="border border-slate-100 rounded-lg overflow-hidden"
                                    >
                                        {/* Attribute Header */}
                                        <div
                                            className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-emerald-50/50 transition-colors"
                                            onClick={() => setExpandedAttr(expandedAttr === attr.id ? null : attr.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">
                                                    {attr.type === 'color' ? '🎨' : '📏'}
                                                </span>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{attr.display_name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {attr.name} • {attr.values?.length || 0} giá trị
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-slate-400">
                                                {expandedAttr === attr.id ? '▼' : '▶'}
                                            </span>
                                        </div>

                                        {/* Attribute Values (Expanded) */}
                                        {expandedAttr === attr.id && attr.values && attr.values.length > 0 && (
                                            <div className="p-4 bg-white border-t border-slate-100">
                                                <div className="flex flex-wrap gap-2">
                                                    {attr.values.map(val => (
                                                        <div
                                                            key={val.id}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm border border-slate-200"
                                                        >
                                                            {attr.type === 'color' && val.color_code && (
                                                                <span
                                                                    className="w-4 h-4 rounded-full border border-slate-200"
                                                                    style={{ backgroundColor: val.color_code }}
                                                                />
                                                            )}
                                                            <span className="text-slate-700 font-medium">{val.display_value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {expandedAttr === attr.id && (!attr.values || attr.values.length === 0) && (
                                            <div className="p-4 bg-white border-t border-slate-100 text-center text-slate-500 text-sm italic">
                                                Chưa có giá trị nào.
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffProductConfigView;
