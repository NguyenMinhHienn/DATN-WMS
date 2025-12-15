import React, { useState, useEffect } from 'react';
import { productService } from '../../services/productService';
import { Product, Category, Unit, ProductFormData, PaginationInfo } from '../../interface';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';

const Products: React.FC = () => {
    // State
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1, limit: 10, total: 0, totalPages: 0
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<ProductFormData>({
        sku: '',
        name: '',
        description: '',
        category_id: undefined,
        unit_id: undefined,
        brand: '',
        cost_price: 0,
        selling_price: 0,
        min_stock_level: 0,
        reorder_point: 0,
        status: 'draft',
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const { hasAnyRole } = useAuth();
    const canEdit = hasAnyRole(['admin', 'warehouse_manager']);
    const canDelete = hasAnyRole(['admin']);

    // Load data
    useEffect(() => {
        loadProducts();
        loadCategories();
        loadUnits();
    }, [pagination.page, search, selectedCategory, selectedStatus]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const result = await productService.getAll(
                pagination.page,
                pagination.limit,
                search || undefined,
                selectedCategory,
                selectedStatus || undefined
            );
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

    const loadUnits = async () => {
        try {
            const data = await productService.getUnits();
            setUnits(data);
        } catch (error) {
            console.error('Failed to load units:', error);
        }
    };

    // Search handler with debounce
    const handleSearch = (value: string) => {
        setSearch(value);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    // Open modal for create
    const handleCreate = () => {
        setEditingProduct(null);
        setFormData({
            sku: '',
            name: '',
            description: '',
            category_id: undefined,
            unit_id: undefined,
            brand: '',
            cost_price: 0,
            selling_price: 0,
            min_stock_level: 0,
            reorder_point: 0,
            status: 'draft',
        });
        setFormError('');
        setIsModalOpen(true);
    };

    // Open modal for edit
    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            sku: product.sku,
            name: product.name,
            description: product.description || '',
            category_id: product.category_id,
            unit_id: product.unit_id,
            brand: product.brand || '',
            cost_price: product.cost_price,
            selling_price: product.selling_price,
            min_stock_level: product.min_stock_level,
            reorder_point: product.reorder_point,
            status: product.status,
            image_url: product.image_url,
        });
        setFormError('');
        setIsModalOpen(true);
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        try {
            if (editingProduct) {
                await productService.update(editingProduct.id, formData);
            } else {
                await productService.create(formData);
            }
            setIsModalOpen(false);
            loadProducts();
        } catch (error: any) {
            setFormError(error.response?.data?.message || 'An error occurred');
        } finally {
            setFormLoading(false);
        }
    };

    // Handle delete
    const handleDelete = async (product: Product) => {
        if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
            return;
        }

        try {
            await productService.delete(product.id);
            loadProducts();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete product');
        }
    };

    // Form input handler
    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Products</h1>
                    <p className="text-slate-600">Manage your product catalog</p>
                </div>
                {canEdit && (
                    <button onClick={handleCreate} className="btn btn-primary">
                        + Add Product
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <select
                            value={selectedCategory || ''}
                            onChange={(e) => {
                                setSelectedCategory(e.target.value ? parseInt(e.target.value) : undefined);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="input"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <select
                            value={selectedStatus}
                            onChange={(e) => {
                                setSelectedStatus(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="input"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="draft">Draft</option>
                            <option value="discontinued">Discontinued</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Product</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">SKU</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Category</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Cost</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Price</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Status</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(product => (
                                    <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                                                    ) : '📦'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{product.name}</p>
                                                    <p className="text-xs text-slate-500">{product.brand}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-600 font-mono">{product.sku}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600">{product.category_name || '-'}</td>
                                        <td className="py-3 px-4 text-sm text-slate-600 text-right">
                                            {new Intl.NumberFormat('vi-VN').format(product.cost_price)}
                                        </td>
                                        <td className="py-3 px-4 text-sm font-medium text-slate-800 text-right">
                                            {new Intl.NumberFormat('vi-VN').format(product.selling_price)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-xs px-2 py-1 rounded-full ${product.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                                    product.status === 'inactive' ? 'bg-slate-100 text-slate-600' :
                                                        product.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-red-100 text-red-700'
                                                }`}>
                                                {product.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => handleEdit(product)}
                                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-primary-600 transition-colors"
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(product)}
                                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-red-600 transition-colors"
                                                        title="Delete"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {products.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-500">
                                            No products found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="px-4 pb-4">
                            <Pagination
                                pagination={pagination}
                                onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? 'Edit Product' : 'Add New Product'}
                size="lg"
            >
                <form onSubmit={handleSubmit}>
                    {formError && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                            {formError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">SKU *</label>
                            <input
                                type="text"
                                name="sku"
                                value={formData.sku}
                                onChange={handleInputChange}
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="input"
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="label">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                className="input"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="label">Category</label>
                            <select
                                name="category_id"
                                value={formData.category_id || ''}
                                onChange={handleInputChange}
                                className="input"
                            >
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label">Unit</label>
                            <select
                                name="unit_id"
                                value={formData.unit_id || ''}
                                onChange={handleInputChange}
                                className="input"
                            >
                                <option value="">Select Unit</option>
                                {units.map(unit => (
                                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label">Brand</label>
                            <input
                                type="text"
                                name="brand"
                                value={formData.brand}
                                onChange={handleInputChange}
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="label">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="input"
                            >
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="discontinued">Discontinued</option>
                            </select>
                        </div>

                        <div>
                            <label className="label">Cost Price *</label>
                            <input
                                type="number"
                                name="cost_price"
                                value={formData.cost_price}
                                onChange={handleInputChange}
                                className="input"
                                min="0"
                                step="1000"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">Selling Price *</label>
                            <input
                                type="number"
                                name="selling_price"
                                value={formData.selling_price}
                                onChange={handleInputChange}
                                className="input"
                                min="0"
                                step="1000"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">Min Stock Level</label>
                            <input
                                type="number"
                                name="min_stock_level"
                                value={formData.min_stock_level}
                                onChange={handleInputChange}
                                className="input"
                                min="0"
                            />
                        </div>

                        <div>
                            <label className="label">Reorder Point</label>
                            <input
                                type="number"
                                name="reorder_point"
                                value={formData.reorder_point}
                                onChange={handleInputChange}
                                className="input"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={formLoading}
                            className="btn btn-primary"
                        >
                            {formLoading ? 'Saving...' : (editingProduct ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Products;
