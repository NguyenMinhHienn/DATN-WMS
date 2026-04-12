import React, { useState, useEffect } from 'react';
import { attributeService } from '../../services/attributeService';
import { productService } from '../../services/productService';
import { Attribute, Category, Product } from '../../interface';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

const ProductConfig: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'categories' | 'attributes'>('categories');

    // Categories state
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', code: '', description: '', parent_id: '' });
    const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
    const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
    const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);

    // Attributes state
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [attributesLoading, setAttributesLoading] = useState(true);
    const [expandedAttr, setExpandedAttr] = useState<number | null>(null);
    const [attrModalOpen, setAttrModalOpen] = useState(false);
    const [attrForm, setAttrForm] = useState({ name: '', display_name: '', type: 'select' });

    // Value modal
    const [valueModalOpen, setValueModalOpen] = useState(false);
    const [currentAttrId, setCurrentAttrId] = useState<number | null>(null);
    const [valueForm, setValueForm] = useState({ value: '', display_value: '', color_code: '' });

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const { hasAnyRole } = useAuth();
    const canEdit = hasAnyRole(['admin', 'warehouse_manager']);

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

    // === CATEGORY HANDLERS ===
    const handleAddCategory = () => {
        setCategoryForm({ name: '', code: '', description: '', parent_id: '' });
        setEditingCategoryId(null);
        setCategoryModalOpen(true);
    };

    const handleEditCategory = (cat: Category, e: React.MouseEvent) => {
        e.stopPropagation();
        setCategoryForm({ 
            name: cat.name, 
            code: cat.code, 
            description: cat.description || '', 
            parent_id: cat.parent_id?.toString() || '' 
        });
        setEditingCategoryId(cat.id);
        setCategoryModalOpen(true);
    };

    const handleSaveCategory = async () => {
        if (!categoryForm.name || !categoryForm.code) {
            setError('Vui lòng nhập tên và mã danh mục');
            return;
        }
        try {
            if (editingCategoryId) {
                await productService.updateCategory(editingCategoryId, categoryForm);
                setSuccess('Đã cập nhật danh mục!');
            } else {
                await productService.createCategory(categoryForm);
                setSuccess('Đã thêm danh mục mới!');
            }
            setCategoryModalOpen(false);
            loadCategories();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleDeleteCategory = async (cat: Category, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${cat.name}"?`)) {
            return;
        }
        try {
            await productService.deleteCategory(cat.id);
            setSuccess('Đã xóa danh mục thành công!');
            loadCategories();
            if (expandedCategory === cat.id) {
                setExpandedCategory(null);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra: Có thể danh mục đang có sản phẩm.');
        }
    };

    // === ATTRIBUTE HANDLERS ===
    const handleAddAttribute = () => {
        setAttrForm({ name: '', display_name: '', type: 'select' });
        setAttrModalOpen(true);
    };

    const handleSaveAttribute = async () => {
        if (!attrForm.name || !attrForm.display_name) {
            setError('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        try {
            await attributeService.create(attrForm);
            setSuccess('Đã thêm thuộc tính mới!');
            setAttrModalOpen(false);
            loadAttributes();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleAddValue = (attrId: number) => {
        setCurrentAttrId(attrId);
        setValueForm({ value: '', display_value: '', color_code: '' });
        setValueModalOpen(true);
    };

    const handleSaveValue = async () => {
        if (!currentAttrId || !valueForm.value || !valueForm.display_value) {
            setError('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        try {
            await attributeService.createValue(currentAttrId, valueForm);
            setSuccess('Đã thêm giá trị mới!');
            setValueModalOpen(false);
            loadAttributes();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    // Clear messages after 3 seconds
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError('');
                setSuccess('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold">
                    <span className="gradient-text">⚙️ Cấu hình Sản phẩm</span>
                </h1>
                <p className="text-slate-600 mt-1">Quản lý danh mục và thuộc tính biến thể</p>
            </div>

            {/* Messages */}
            {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-600 font-bold">
                    {success}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'categories'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-blue-900 shadow-lg shadow-indigo-500/25'
                        : 'bg-blue-50/30 text-slate-600 hover:text-blue-900 hover:bg-slate-100'
                        }`}
                >
                    📁 Danh mục sản phẩm
                </button>
                <button
                    onClick={() => setActiveTab('attributes')}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${activeTab === 'attributes'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-blue-900 shadow-lg shadow-indigo-500/25'
                        : 'bg-blue-50/30 text-slate-600 hover:text-blue-900 hover:bg-slate-100'
                        }`}
                >
                    🎨 Thuộc tính biến thể
                </button>
            </div>

            {/* Tab Content */}
            <div className="chart-container">
                {/* === CATEGORIES TAB === */}
                {activeTab === 'categories' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-blue-900">Danh sách danh mục</h2>
                            {canEdit && (
                                <button
                                    onClick={handleAddCategory}
                                    className="btn btn-primary"
                                >
                                    + Thêm danh mục
                                </button>
                            )}
                        </div>

                        {categoriesLoading ? (
                            <div className="text-center py-8 text-slate-600">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                Đang tải...
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Chưa có danh mục nào. Hãy thêm danh mục đầu tiên!
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {categories.map(cat => (
                                    <div
                                        key={cat.id}
                                        className="border border-blue-100 rounded-lg overflow-hidden"
                                    >
                                        {/* Category Header */}
                                        <div
                                            className="flex items-center justify-between p-4 bg-blue-50/30 cursor-pointer hover:bg-slate-100 transition-all"
                                            onClick={() => handleCategoryClick(cat.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">📁</span>
                                                <div>
                                                    <p className="font-medium text-blue-900">{cat.name}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{cat.code}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {canEdit && (
                                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <button onClick={(e) => handleEditCategory(cat, e)} className="p-2 hover:bg-slate-600 rounded text-slate-600 hover:text-blue-900 transition-colors">✏️</button>
                                                        <button onClick={(e) => handleDeleteCategory(cat, e)} className="p-2 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors">🗑️</button>
                                                    </div>
                                                )}
                                                <span className="text-slate-600 ml-2">
                                                    {expandedCategory === cat.id ? '▼' : '▶'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Products in Category (Expanded) */}
                                        {expandedCategory === cat.id && (
                                            <div className="p-4 bg-slate-50 border-t border-blue-100">
                                                {categoryProductsLoading ? (
                                                    <div className="text-center py-4 text-slate-600">
                                                        <span className="animate-pulse">Đang tải sản phẩm...</span>
                                                    </div>
                                                ) : categoryProducts.length === 0 ? (
                                                    <div className="text-center py-4 text-slate-500">
                                                        Chưa có sản phẩm nào trong danh mục này
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <p className="text-sm font-medium text-slate-600 mb-3">
                                                            📦 {categoryProducts.length} sản phẩm trong danh mục
                                                        </p>
                                                        {categoryProducts.map(product => (
                                                            <div
                                                                key={product.id}
                                                                className="flex items-center gap-3 p-3 bg-blue-50/30 rounded-lg hover:bg-slate-100 transition-all"
                                                            >
                                                                {product.image_url ? (
                                                                    <img
                                                                        src={product.image_url.startsWith('http') ? product.image_url : `http://localhost:3000${product.image_url}`}
                                                                        alt={product.name}
                                                                        className="w-12 h-12 object-cover rounded"
                                                                    />
                                                                ) : (
                                                                    <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-slate-500">
                                                                        📷
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-blue-900 truncate">{product.name}</p>
                                                                    <p className="text-xs text-slate-500">
                                                                        SKU: {product.sku} • {product.selling_price?.toLocaleString()}₫
                                                                    </p>
                                                                </div>
                                                                <span className={`px-2 py-1 text-xs rounded-full ${product.status === 'active'
                                                                    ? 'bg-emerald-500/20 text-emerald-600 font-bold'
                                                                    : 'bg-slate-600/50 text-slate-600'
                                                                    }`}>
                                                                    {product.status === 'active' ? 'Đang bán' : product.status}
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
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-blue-900">Danh sách thuộc tính</h2>
                            {canEdit && (
                                <button
                                    onClick={handleAddAttribute}
                                    className="btn btn-primary"
                                >
                                    + Thêm thuộc tính
                                </button>
                            )}
                        </div>

                        {attributesLoading ? (
                            <div className="text-center py-8 text-slate-600">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                Đang tải...
                            </div>
                        ) : attributes.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Chưa có thuộc tính nào. Hãy thêm thuộc tính đầu tiên!
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {attributes.map(attr => (
                                    <div
                                        key={attr.id}
                                        className="border border-blue-100 rounded-lg overflow-hidden"
                                    >
                                        {/* Attribute Header */}
                                        <div
                                            className="flex items-center justify-between p-4 bg-blue-50/30 cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => setExpandedAttr(expandedAttr === attr.id ? null : attr.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">
                                                    {attr.type === 'color' ? '🎨' : '📏'}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-blue-900">{attr.display_name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {attr.name} • {attr.values?.length || 0} giá trị
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {canEdit && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleAddValue(attr.id); }}
                                                            className="px-3 py-1 text-sm bg-emerald-500/20 text-emerald-600 font-bold rounded-lg hover:bg-emerald-500/30 transition-colors"
                                                        >
                                                            + Thêm giá trị
                                                        </button>
                                                    </>
                                                )}
                                                <span className="text-slate-600">
                                                    {expandedAttr === attr.id ? '▼' : '▶'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Attribute Values (Expanded) */}
                                        {expandedAttr === attr.id && attr.values && attr.values.length > 0 && (
                                            <div className="p-4 bg-slate-50 border-t border-blue-100">
                                                <div className="flex flex-wrap gap-2">
                                                    {attr.values.map(val => (
                                                        <div
                                                            key={val.id}
                                                            className="flex items-center gap-2 px-3 py-2 bg-blue-50/30 rounded-full text-sm border border-blue-100"
                                                        >
                                                            {attr.type === 'color' && val.color_code && (
                                                                <span
                                                                    className="w-4 h-4 rounded-full border border-slate-300"
                                                                    style={{ backgroundColor: val.color_code }}
                                                                />
                                                            )}
                                                            <span className="text-slate-700 font-medium">{val.display_value}</span>
                                                            {canEdit && (
                                                                <button className="text-red-400 hover:text-red-300 ml-1 transition-colors">×</button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {expandedAttr === attr.id && (!attr.values || attr.values.length === 0) && (
                                            <div className="p-4 bg-slate-50 border-t border-blue-100 text-center text-slate-500 text-sm">
                                                Chưa có giá trị nào. Nhấn "+ Thêm giá trị" để bắt đầu.
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Attribute Modal */}
            <Modal
                isOpen={attrModalOpen}
                onClose={() => setAttrModalOpen(false)}
                title="Thêm thuộc tính mới"
            >
                <div className="space-y-4">
                    <div>
                        <label className="label">Tên hệ thống (không dấu) *</label>
                        <input
                            type="text"
                            value={attrForm.name}
                            onChange={(e) => setAttrForm(prev => ({ ...prev, name: e.target.value }))}
                            className="input"
                            placeholder="VD: color, size, storage"
                        />
                    </div>
                    <div>
                        <label className="label">Tên hiển thị *</label>
                        <input
                            type="text"
                            value={attrForm.display_name}
                            onChange={(e) => setAttrForm(prev => ({ ...prev, display_name: e.target.value }))}
                            className="input"
                            placeholder="VD: Màu sắc, Kích thước"
                        />
                    </div>
                    <div>
                        <label className="label">Loại</label>
                        <select
                            value={attrForm.type}
                            onChange={(e) => setAttrForm(prev => ({ ...prev, type: e.target.value }))}
                            className="input"
                        >
                            <option value="select">Select (dropdown)</option>
                            <option value="color">Color (có color picker)</option>
                            <option value="text">Text (nhập tự do)</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setAttrModalOpen(false)} className="btn btn-secondary">Hủy</button>
                        <button onClick={handleSaveAttribute} className="btn btn-primary">Thêm</button>
                    </div>
                </div>
            </Modal>

            {/* Add Value Modal */}
            <Modal
                isOpen={valueModalOpen}
                onClose={() => setValueModalOpen(false)}
                title="Thêm giá trị mới"
            >
                <div className="space-y-4">
                    <div>
                        <label className="label">Giá trị (không dấu) *</label>
                        <input
                            type="text"
                            value={valueForm.value}
                            onChange={(e) => setValueForm(prev => ({ ...prev, value: e.target.value }))}
                            className="input"
                            placeholder="VD: black, M, 64GB"
                        />
                    </div>
                    <div>
                        <label className="label">Tên hiển thị *</label>
                        <input
                            type="text"
                            value={valueForm.display_value}
                            onChange={(e) => setValueForm(prev => ({ ...prev, display_value: e.target.value }))}
                            className="input"
                            placeholder="VD: Đen, M, 64GB"
                        />
                    </div>
                    <div>
                        <label className="label">Mã màu (nếu là color)</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={valueForm.color_code || '#000000'}
                                onChange={(e) => setValueForm(prev => ({ ...prev, color_code: e.target.value }))}
                                className="w-12 h-10 rounded border border-slate-300 bg-slate-100"
                            />
                            <input
                                type="text"
                                value={valueForm.color_code}
                                onChange={(e) => setValueForm(prev => ({ ...prev, color_code: e.target.value }))}
                                className="input flex-1"
                                placeholder="#000000"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setValueModalOpen(false)} className="btn btn-secondary">Hủy</button>
                        <button onClick={handleSaveValue} className="btn btn-primary">Thêm</button>
                    </div>
                </div>
            </Modal>

            {/* Category Modal */}
            <Modal
                isOpen={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                title={editingCategoryId ? "Sửa danh mục" : "Thêm danh mục mới"}
            >
                <div className="space-y-4">
                    <div>
                        <label className="label">Mã danh mục *</label>
                        <input
                            type="text"
                            value={categoryForm.code}
                            onChange={(e) => setCategoryForm(prev => ({ ...prev, code: e.target.value }))}
                            className="input"
                            placeholder="VD: PHONE, LAPTOP"
                        />
                    </div>
                    <div>
                        <label className="label">Tên danh mục *</label>
                        <input
                            type="text"
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                            className="input"
                            placeholder="VD: Điện thoại, Laptop"
                        />
                    </div>
                    <div>
                        <label className="label">Mô tả</label>
                        <textarea
                            value={categoryForm.description}
                            onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                            className="input"
                            rows={3}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setCategoryModalOpen(false)} className="btn btn-secondary">Hủy</button>
                        <button
                            onClick={handleSaveCategory}
                            className="btn btn-primary"
                        >
                            {editingCategoryId ? 'Lưu thay đổi' : 'Thêm'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ProductConfig;
