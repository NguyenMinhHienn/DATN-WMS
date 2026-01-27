import React, { useState, useEffect, useMemo } from 'react';
import { productService } from '../../services/productService';
import { productVariantService } from '../../services/productVariantService';
import { attributeService } from '../../services/attributeService';
import {
    Product, Category, Unit, ProductFormData, PaginationInfo,
    ProductVariant, ProductVariantFormData,
    Attribute, AttributeValue, VARIANT_TYPES_CONFIG
} from '../../interface';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import ImageCropper from '../../components/ImageCropper';
import { uploadService } from '../../services/uploadService';

// Interface for variant in form (before saving to DB)
interface TempVariant {
    id?: number;
    color?: string;
    size?: string;
    storage?: string;
    ram?: string;
    material?: string;
    capacity?: string;
    sku: string;
    price: number;
    stock: number;
    isNew?: boolean;
}

const Products: React.FC = () => {
    // State
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [attributes, setAttributes] = useState<Attribute[]>([]); // Flexible attributes from API
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

    // === NEW: 2-Step Form State ===
    const [formStep, setFormStep] = useState(1); // 1 = Product Info, 2 = Variant Setup
    const [hasVariants, setHasVariants] = useState(false); // Toggle: Sản phẩm có biến thể?
    const [selectedAttributes, setSelectedAttributes] = useState<{
        attribute_id: number;
        attribute_name: string;
        attribute_display_name: string;
        value_ids: number[];
    }[]>([]);
    const [generatedVariants, setGeneratedVariants] = useState<ProductVariant[]>([]);
    const [variantPrices, setVariantPrices] = useState<{ [sku: string]: number }>({});
    const [variantStocks, setVariantStocks] = useState<{ [sku: string]: number }>({});
    const [generatingVariants, setGeneratingVariants] = useState(false);
    const [customValues, setCustomValues] = useState<{ [attr_id: number]: string }>({});
    const [initialStock, setInitialStock] = useState(0); // Initial stock for new variants

    // Variants in form state (legacy - kept for existing form)
    const [formVariants, setFormVariants] = useState<TempVariant[]>([]);
    const [newVariantData, setNewVariantData] = useState<Partial<TempVariant>>({});
    const [newVariantPrice, setNewVariantPrice] = useState(0);
    const [newVariantStock, setNewVariantStock] = useState(0);

    // Separate Variant Modal
    const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [variantLoading, setVariantLoading] = useState(false);
    const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
    const [variantFormData, setVariantFormData] = useState<ProductVariantFormData>({
        sku: '',
        price: 0,
        stock: 0,
    });
    const [variantFormError, setVariantFormError] = useState('');

    const { hasAnyRole } = useAuth();
    const canEdit = hasAnyRole(['admin', 'warehouse_manager']);
    const canDelete = hasAnyRole(['admin']);

    // Get active variant types based on selected category
    // Default: show color variant if category has no specific variant_types configured
    const activeVariantTypes = useMemo(() => {
        if (!formData.category_id) {
            // If no category selected, default to color only
            return VARIANT_TYPES_CONFIG.filter(vt => vt.key === 'color');
        }

        // Convert to number for comparison (form select values are strings)
        const categoryId = Number(formData.category_id);
        const category = categories.find(c => c.id === categoryId);

        console.log('Category lookup:', { categoryId, category, variant_types: category?.variant_types });

        // If category not found or has no variant_types, default to color
        if (!category) {
            return VARIANT_TYPES_CONFIG.filter(vt => vt.key === 'color');
        }

        // Get variant_types - could be JSON string, array, or null
        let types: string[] = [];
        const vt = category.variant_types;

        if (!vt) {
            // No variant types configured
            return VARIANT_TYPES_CONFIG.filter(vt => vt.key === 'color');
        }

        if (typeof vt === 'string') {
            try {
                types = JSON.parse(vt);
            } catch {
                return VARIANT_TYPES_CONFIG.filter(vt => vt.key === 'color');
            }
        } else if (Array.isArray(vt)) {
            types = vt;
        }

        // If parsed types is empty, default to color
        if (!types || types.length === 0) {
            return VARIANT_TYPES_CONFIG.filter(vt => vt.key === 'color');
        }

        console.log('Parsed variant types:', types);
        return VARIANT_TYPES_CONFIG.filter(vtConfig => types.includes(vtConfig.key));
    }, [formData.category_id, categories]);

    // Load data
    useEffect(() => {
        loadProducts();
        loadCategories();
        loadUnits();
        loadAttributes(); // Load flexible attributes from API
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

    // Load flexible attributes from API
    const loadAttributes = async () => {
        try {
            const data = await attributeService.getAll(true); // includeValues = true
            setAttributes(data);
            console.log('Loaded attributes from API:', data);
        } catch (error) {
            console.error('Failed to load attributes:', error);
        }
    };

    // Handle adding a custom attribute value
    const handleAddCustomValue = async (attributeId: number) => {
        const customVal = customValues[attributeId]?.trim();
        if (!customVal) return;

        try {
            // Call API to create new attribute value
            const newValue = await attributeService.createValue(attributeId, {
                value: customVal.toLowerCase().replace(/\s+/g, '_'),
                display_value: customVal
            });

            // Reload attributes to get updated list
            await loadAttributes();

            // Auto-select the new value
            setSelectedAttributes(prev => prev.map(sa => {
                if (sa.attribute_id !== attributeId) return sa;
                return { ...sa, value_ids: [...sa.value_ids, newValue.id] };
            }));

            // Clear input
            setCustomValues(prev => ({ ...prev, [attributeId]: '' }));
            setFormError('');
        } catch (error: any) {
            console.error('Failed to add custom value:', error);
            setFormError(error.response?.data?.message || 'Lỗi khi thêm giá trị mới');
        }
    };

    const loadVariants = async (productId: number) => {
        try {
            setVariantLoading(true);
            const data = await productVariantService.getByProduct(productId);
            setVariants(data);
        } catch (error) {
            console.error('Failed to load variants:', error);
        } finally {
            setVariantLoading(false);
        }
    };

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
        // Reset 2-step form state
        setFormStep(1);
        setHasVariants(false);
        setSelectedAttributes([]);
        setGeneratedVariants([]);
        setVariantPrices({});
        setVariantStocks({});
        setInitialStock(0);
        // Legacy reset
        setFormVariants([]);
        setNewVariantData({});
        setNewVariantPrice(0);
        setNewVariantStock(0);
        setFormError('');
        setIsModalOpen(true);
    };

    // Open modal for edit
    const handleEdit = async (product: Product) => {
        // CRITICAL: Reset ALL variant-related state FIRST to prevent data bleeding
        setFormVariants([]);
        setSelectedAttributes([]);
        setCustomValues({});
        setGeneratedVariants([]);
        setVariantPrices({});
        setVariantStocks({});
        setInitialStock(0);
        setHasVariants(false);
        setFormStep(1);
        setFormError('');

        // Now set the new product data
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

        // Load variants for THIS specific product
        try {
            const existingVariants = await productVariantService.getByProduct(product.id);
            console.log(`Loaded ${existingVariants.length} variants for product ${product.id}`);
            setFormVariants(existingVariants.map(v => ({
                id: v.id,
                color: v.color || undefined,
                size: v.size || undefined,
                storage: v.storage || undefined,
                ram: v.ram || undefined,
                material: v.material || undefined,
                capacity: v.capacity || undefined,
                sku: v.sku,
                price: v.price,
                stock: v.stock,
                isNew: false
            })));
            // Set hasVariants flag if product has variants
            if (existingVariants.length > 0) {
                setHasVariants(true);
            }
        } catch (error) {
            console.error('Failed to load variants for product:', product.id, error);
            setFormVariants([]);
        }

        setNewVariantData({});
        setNewVariantPrice(product.selling_price);
        setNewVariantStock(0);
        setIsModalOpen(true);
    };

    // Generate SKU for variant based on selected attributes
    const generateVariantSku = (attrs: Partial<TempVariant>) => {
        const parts = [formData.sku];
        if (attrs.color) parts.push(attrs.color.toUpperCase());
        if (attrs.size) parts.push(attrs.size);
        if (attrs.storage) parts.push(attrs.storage);
        if (attrs.ram) parts.push(attrs.ram);
        if (attrs.material) parts.push(attrs.material.toUpperCase().slice(0, 3));
        if (attrs.capacity) parts.push(attrs.capacity);
        return parts.join('-');
    };

    // Add variant to form
    const handleAddVariant = () => {
        // Check all required variant types are selected
        const missingTypes = activeVariantTypes.filter(vt => !newVariantData[vt.key]);
        if (missingTypes.length > 0) {
            setFormError(`Vui lòng chọn: ${missingTypes.map(t => t.label).join(', ')}`);
            return;
        }

        // Check duplicate combination
        const isDuplicate = formVariants.some(v => {
            return activeVariantTypes.every(vt => v[vt.key] === newVariantData[vt.key]);
        });
        if (isDuplicate) {
            setFormError('Tổ hợp này đã tồn tại!');
            return;
        }

        const newVariant: TempVariant = {
            ...newVariantData,
            sku: generateVariantSku(newVariantData),
            price: newVariantPrice || formData.selling_price,
            stock: newVariantStock,
            isNew: true
        };

        setFormVariants([...formVariants, newVariant]);
        setNewVariantData({});
        setNewVariantPrice(formData.selling_price);
        setNewVariantStock(0);
        setFormError('');
    };

    const handleRemoveVariant = (index: number) => {
        setFormVariants(formVariants.filter((_, i) => i !== index));
    };

    const handleUpdateVariantField = (index: number, field: keyof TempVariant, value: any) => {
        const updated = [...formVariants];
        (updated[index] as any)[field] = value;
        setFormVariants(updated);
    };

    // Validate product form before submit
    const validateProductForm = (): string | null => {
        if (!formData.name || formData.name.trim().length === 0) {
            return 'Tên sản phẩm là bắt buộc';
        }
        if (!formData.category_id) {
            return 'Vui lòng chọn danh mục';
        }
        if (formData.selling_price < 0) {
            return 'Giá bán phải >= 0';
        }
        if (formData.cost_price !== undefined && formData.cost_price < 0) {
            return 'Giá nhập phải >= 0';
        }
        return null;
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        // Validate trước khi submit
        const validationError = validateProductForm();
        if (validationError) {
            setFormError(validationError);
            setFormLoading(false);
            return;
        }

        try {
            let productId: number;

            if (editingProduct) {
                // UPDATE existing product
                await productService.update(editingProduct.id, formData);
                productId = editingProduct.id;

                // Update existing variants (legacy formVariants)
                for (const variant of formVariants) {
                    if (variant.id) {
                        await productVariantService.update(variant.id, {
                            color: variant.color,
                            size: variant.size,
                            storage: variant.storage,
                            ram: variant.ram,
                            material: variant.material,
                            capacity: variant.capacity,
                            sku: variant.sku,
                            price: variant.price,
                            stock: variant.stock
                        });
                    } else {
                        // Create new variant added during edit
                        await productVariantService.create(productId, {
                            color: variant.color,
                            size: variant.size,
                            storage: variant.storage,
                            ram: variant.ram,
                            material: variant.material,
                            capacity: variant.capacity,
                            sku: variant.sku,
                            price: variant.price,
                            stock: variant.stock
                        });
                    }
                }

                // If hasVariants and selectedAttributes has data, generate new variants via API
                if (hasVariants && selectedAttributes.length > 0 && selectedAttributes.every(sa => sa.value_ids.length > 0)) {
                    try {
                        console.log('Generating variants for existing product...');
                        const generatedVariants = await productVariantService.generateVariants(productId, {
                            attributes: selectedAttributes.map(sa => ({
                                attribute_id: sa.attribute_id,
                                value_ids: sa.value_ids
                            })),
                            base_price: formData.selling_price,
                            base_stock: initialStock
                        });
                        console.log('Generated variants:', generatedVariants);
                    } catch (genError) {
                        console.error('Failed to generate variants:', genError);
                    }
                }
            } else {
                // CREATE new product
                // Auto-generate unique SKU
                const categoryId = Number(formData.category_id);
                const category = categories.find(c => c.id === categoryId);
                const categoryCode = category?.code?.toUpperCase() || 'PROD';
                const timestamp = Date.now().toString(36).toUpperCase();
                const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                const autoSku = `${categoryCode}-${timestamp}-${randomSuffix}`;

                // Create product with auto-generated SKU
                const productDataWithSku = {
                    ...formData,
                    sku: autoSku
                };

                const result = await productService.create(productDataWithSku);
                console.log('Created product result:', result);

                productId = result.id;

                if (!productId) {
                    throw new Error('Không lấy được ID sản phẩm sau khi tạo');
                }

                console.log('Product ID:', productId, 'hasVariants:', hasVariants, 'selectedAttributes:', selectedAttributes);

                // Check if we should use flexible attribute system
                if (hasVariants && selectedAttributes.length > 0 && selectedAttributes.every(sa => sa.value_ids.length > 0)) {
                    // Use the generate variants API for flexible attribute system
                    try {
                        console.log('Generating variants for new product...');
                        const generatedVariants = await productVariantService.generateVariants(productId, {
                            attributes: selectedAttributes.map(sa => ({
                                attribute_id: sa.attribute_id,
                                value_ids: sa.value_ids
                            })),
                            base_price: formData.selling_price,
                            base_stock: initialStock
                        });
                        console.log('Generated variants:', generatedVariants);
                    } catch (genError: any) {
                        console.error('Failed to generate variants:', genError);
                        setFormError(`Lỗi tạo biến thể: ${genError.response?.data?.message || genError.message}`);
                    }
                } else if (formVariants.length > 0) {
                    // Fallback: Create legacy variants from formVariants
                    for (const variant of formVariants) {
                        console.log('Creating legacy variant:', variant);
                        try {
                            await productVariantService.create(productId, {
                                color: variant.color,
                                size: variant.size,
                                storage: variant.storage,
                                ram: variant.ram,
                                material: variant.material,
                                capacity: variant.capacity,
                                sku: variant.sku,
                                price: variant.price,
                                stock: variant.stock
                            });
                            console.log('Legacy variant created successfully');
                        } catch (variantError: any) {
                            console.error('Failed to create variant:', variantError);
                            throw new Error(`Lỗi tạo biến thể: ${variantError.response?.data?.message || variantError.message}`);
                        }
                    }
                } else if (!hasVariants) {
                    // No variants selected - create default variant with initial stock
                    try {
                        console.log('Creating default variant with stock:', initialStock);
                        await productVariantService.create(productId, {
                            sku: `${autoSku}-DEFAULT`,
                            price: formData.selling_price,
                            stock: initialStock
                        });
                        console.log('Default variant created successfully');
                    } catch (defaultVariantError: any) {
                        console.error('Failed to create default variant:', defaultVariantError);
                        // Don't throw error, product is still created
                    }
                }
            }

            setIsModalOpen(false);
            loadProducts();
        } catch (error: any) {
            console.error('Submit error:', error);
            setFormError(error.response?.data?.message || error.message || 'Có lỗi xảy ra');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (product: Product) => {
        if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}"?`)) return;
        try {
            await productService.delete(product.id);
            loadProducts();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete product');
        }
    };

    const handleManageVariants = (product: Product) => {
        setSelectedProduct(product);
        setEditingVariant(null);
        setVariantFormData({ sku: `${product.sku}-`, price: product.selling_price, stock: 0 });
        setVariantFormError('');
        loadVariants(product.id);
        setIsVariantModalOpen(true);
    };

    const handleVariantSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        setVariantLoading(true);
        setVariantFormError('');

        try {
            if (editingVariant) {
                await productVariantService.update(editingVariant.id, variantFormData);
            } else {
                await productVariantService.create(selectedProduct.id, variantFormData);
            }
            setEditingVariant(null);
            setVariantFormData({ sku: `${selectedProduct.sku}-`, price: selectedProduct.selling_price, stock: 0 });
            loadVariants(selectedProduct.id);
        } catch (error: any) {
            setVariantFormError(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setVariantLoading(false);
        }
    };

    const handleEditVariant = (variant: ProductVariant) => {
        setEditingVariant(variant);
        setVariantFormData({
            color: variant.color || undefined,
            size: variant.size || undefined,
            storage: variant.storage || undefined,
            ram: variant.ram || undefined,
            material: variant.material || undefined,
            capacity: variant.capacity || undefined,
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
            image_url: variant.image_url,
        });
    };

    const handleDeleteVariant = async (variant: ProductVariant) => {
        if (!confirm(`Xóa biến thể này?`)) return;
        try {
            await productVariantService.delete(variant.id);
            if (selectedProduct) loadVariants(selectedProduct.id);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete variant');
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        const newValue = type === 'number' ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, [name]: newValue }));

        if (name === 'selling_price') {
            setNewVariantPrice(parseFloat(value) || 0);
        }

        // Reset variants when category changes (different variant types)
        if (name === 'category_id') {
            setFormVariants([]);
            setNewVariantData({});
        }
    };

    const handleVariantInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        setVariantFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    // Get display label for variant attributes
    const getVariantLabel = (variant: TempVariant): string => {
        const parts: string[] = [];
        activeVariantTypes.forEach(vt => {
            const val = variant[vt.key];
            if (val) {
                const opt = vt.options.find(o => o.value === val);
                parts.push(opt?.label || val);
            }
        });
        return parts.join(' / ') || 'Default';
    };

    const getColorHex = (colorValue: string): string => {
        const colorConfig = VARIANT_TYPES_CONFIG.find(c => c.key === 'color');
        const opt = colorConfig?.options.find(o => o.value === colorValue);
        return opt?.hex || '#6B7280';
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Quản lý sản phẩm</h1>
                    <p className="text-slate-600">Quản lý sản phẩm và biến thể theo danh mục</p>
                </div>
                {canEdit && (
                    <button onClick={handleCreate} className="btn btn-primary">
                        + Thêm sản phẩm
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Tìm kiếm sản phẩm..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="input"
                    />
                    <select
                        value={selectedCategory || ''}
                        onChange={(e) => {
                            setSelectedCategory(e.target.value ? parseInt(e.target.value) : undefined);
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="input"
                    >
                        <option value="">Tất cả danh mục</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <select
                        value={selectedStatus}
                        onChange={(e) => {
                            setSelectedStatus(e.target.value);
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="input"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Đang bán</option>
                        <option value="inactive">Tạm ngừng</option>
                        <option value="draft">Nháp</option>
                    </select>
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
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Sản phẩm</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Mã SKU</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Danh mục</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Giá bán</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Trạng thái</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(product => (
                                    <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 overflow-hidden">
                                                    {product.image_url ? (
                                                        <img src={uploadService.getImageUrl(product.image_url)} alt="" className="w-full h-full object-cover rounded-lg" />
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
                                        <td className="py-3 px-4 text-sm font-medium text-slate-800 text-right">
                                            {new Intl.NumberFormat('vi-VN').format(product.selling_price)}₫
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-xs px-2 py-1 rounded-full ${product.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                                product.status === 'inactive' ? 'bg-slate-100 text-slate-600' :
                                                    product.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {product.status === 'active' ? 'Đang bán' :
                                                    product.status === 'inactive' ? 'Tạm ngừng' :
                                                        product.status === 'draft' ? 'Nháp' : 'Ngừng KD'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-center gap-1">
                                                {canEdit && (
                                                    <>
                                                        <button
                                                            onClick={() => handleManageVariants(product)}
                                                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                                                            title="Quản lý biến thể"
                                                        >🎨</button>
                                                        <button
                                                            onClick={() => handleEdit(product)}
                                                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-primary-600"
                                                            title="Sửa"
                                                        >✏️</button>
                                                    </>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(product)}
                                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-red-600"
                                                        title="Xóa"
                                                    >🗑️</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {products.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-500">
                                            Không tìm thấy sản phẩm
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <div className="px-4 pb-4">
                            <Pagination
                                pagination={pagination}
                                onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Create/Edit Product Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
                size="lg"
            >
                <form onSubmit={handleSubmit}>
                    {formError && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                            {formError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Danh mục - ở đầu tiên */}
                        <div>
                            <label className="label">Danh mục *</label>
                            <select name="category_id" value={formData.category_id || ''} onChange={handleInputChange} className="input" required>
                                <option value="">Chọn danh mục</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Trạng thái *</label>
                            <select name="status" value={formData.status} onChange={handleInputChange} className="input" required>
                                <option value="draft">Nháp</option>
                                <option value="active">Đang bán</option>
                                <option value="inactive">Tạm ngừng</option>
                                <option value="discontinued">Ngừng kinh doanh</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Tên sản phẩm *</label>
                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="input" required />
                        </div>
                        <div>
                            <label className="label">Mã SKU (tự động)</label>
                            <input
                                type="text"
                                name="sku"
                                value={formData.sku}
                                className="input bg-slate-100 cursor-not-allowed"
                                readOnly
                                placeholder="Tự động tạo khi lưu..."
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="label">Mô tả</label>
                            <textarea name="description" value={formData.description} onChange={handleInputChange} className="input" rows={2} />
                        </div>
                        <div>
                            <label className="label">Thương hiệu</label>
                            <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} className="input" />
                        </div>
                        <div>
                            <label className="label">Hình ảnh sản phẩm</label>
                            <ImageCropper
                                value={formData.image_url}
                                onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                                maxSize={400}
                                placeholder="Click để chọn ảnh"
                            />
                            <p className="text-xs text-slate-500 mt-1">Kích thước tối đa: 5MB. Định dạng: JPG, PNG, WebP</p>
                        </div>
                        <div>
                            <label className="label">Giá nhập *</label>
                            <input type="number" name="cost_price" value={formData.cost_price} onChange={handleInputChange} className="input" min="0" step="1000" required />
                        </div>
                        <div>
                            <label className="label">Giá bán cơ bản *</label>
                            <input type="number" name="selling_price" value={formData.selling_price} onChange={handleInputChange} className="input" min="0" step="1000" required />
                        </div>
                    </div>

                    {/* === NEW: 2-Step Variant Section with Flexible Attributes === */}
                    <div className="mt-6 pt-4 border-t border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            🎨 Thiết lập biến thể sản phẩm
                        </h3>

                        {/* Step 1: Toggle has variants */}
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={hasVariants}
                                    onChange={(e) => setHasVariants(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm font-medium text-slate-700">
                                    Sản phẩm này có nhiều biến thể (màu sắc, kích thước, dung lượng...)
                                </span>
                            </label>
                        </div>

                        {/* Step 2: Attribute Selection (only if hasVariants) */}
                        {hasVariants && (
                            <div className="space-y-4">
                                {/* Attribute Selection */}
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h4 className="font-medium text-blue-800 mb-3">📋 Chọn loại thuộc tính</h4>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                                        {attributes.map(attr => {
                                            const isSelected = selectedAttributes.some(sa => sa.attribute_id === attr.id);
                                            return (
                                                <button
                                                    key={attr.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedAttributes(prev =>
                                                                prev.filter(sa => sa.attribute_id !== attr.id)
                                                            );
                                                        } else {
                                                            setSelectedAttributes(prev => [...prev, {
                                                                attribute_id: attr.id,
                                                                attribute_name: attr.name,
                                                                attribute_display_name: attr.display_name,
                                                                value_ids: []
                                                            }]);
                                                        }
                                                    }}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${isSelected
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                                                        }`}
                                                >
                                                    {isSelected ? '✓ ' : ''}{attr.display_name}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Value Selection for Each Selected Attribute */}
                                    {selectedAttributes.length > 0 && (
                                        <div className="space-y-4 mt-4">
                                            {selectedAttributes.map(selAttr => {
                                                const attr = attributes.find(a => a.id === selAttr.attribute_id);
                                                if (!attr || !attr.values) return null;

                                                return (
                                                    <div key={selAttr.attribute_id} className="bg-white p-3 rounded-lg border border-blue-200">
                                                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                                                            {selAttr.attribute_display_name}
                                                        </label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {attr.values.map(val => {
                                                                const isValSelected = selAttr.value_ids.includes(val.id);
                                                                return (
                                                                    <button
                                                                        key={val.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedAttributes(prev =>
                                                                                prev.map(sa => {
                                                                                    if (sa.attribute_id !== selAttr.attribute_id) return sa;
                                                                                    const newIds = isValSelected
                                                                                        ? sa.value_ids.filter(id => id !== val.id)
                                                                                        : [...sa.value_ids, val.id];
                                                                                    return { ...sa, value_ids: newIds };
                                                                                })
                                                                            );
                                                                        }}
                                                                        className={`px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1 ${isValSelected
                                                                            ? 'bg-green-600 text-white'
                                                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                            }`}
                                                                    >
                                                                        {attr.type === 'color' && val.color_code && (
                                                                            <span
                                                                                className="w-4 h-4 rounded-full border border-slate-300"
                                                                                style={{ backgroundColor: val.color_code }}
                                                                            />
                                                                        )}
                                                                        {val.display_value}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        {/* Input for custom value */}
                                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-blue-100">
                                                            <input
                                                                type="text"
                                                                placeholder={`Nhập ${selAttr.attribute_display_name} mới...`}
                                                                value={customValues[selAttr.attribute_id] || ''}
                                                                onChange={(e) => setCustomValues(prev => ({
                                                                    ...prev,
                                                                    [selAttr.attribute_id]: e.target.value
                                                                }))}
                                                                className="input text-sm flex-1"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        handleAddCustomValue(selAttr.attribute_id);
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddCustomValue(selAttr.attribute_id)}
                                                                className="btn btn-secondary text-sm whitespace-nowrap"
                                                            >
                                                                + Thêm
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Initial Stock Input */}
                                    {selectedAttributes.length > 0 && selectedAttributes.every(sa => sa.value_ids.length > 0) && (
                                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <label className="block text-sm font-medium text-green-800 mb-2">
                                                📦 Số lượng tồn kho ban đầu (cho mỗi biến thể)
                                            </label>
                                            <input
                                                type="number"
                                                value={initialStock}
                                                onChange={(e) => setInitialStock(Math.max(0, parseInt(e.target.value) || 0))}
                                                className="input w-full"
                                                min="0"
                                                placeholder="Nhập số lượng..."
                                            />
                                            <p className="text-xs text-green-600 mt-1">
                                                Mỗi biến thể sẽ có số lượng này. Bạn có thể chỉnh sửa riêng từng biến thể sau.
                                            </p>
                                        </div>
                                    )}

                                    {/* Generate Variants Button */}
                                    {selectedAttributes.length > 0 && selectedAttributes.every(sa => sa.value_ids.length > 0) && (
                                        <div className="mt-4">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!editingProduct && !formData.name) {
                                                        setFormError('Vui lòng nhập tên sản phẩm trước');
                                                        return;
                                                    }
                                                    setGeneratingVariants(true);
                                                    try {
                                                        // Calculate number of variants
                                                        const count = selectedAttributes.reduce((acc, sa) => acc * sa.value_ids.length, 1);
                                                        setFormError('');
                                                        alert(`Sẽ tạo ${count} biến thể với ${initialStock} sản phẩm mỗi biến thể khi lưu.`);
                                                    } finally {
                                                        setGeneratingVariants(false);
                                                    }
                                                }}
                                                disabled={generatingVariants}
                                                className="btn btn-primary w-full"
                                            >
                                                {generatingVariants ? '⏳ Đang xử lý...' : `🚀 Xem trước biến thể (${selectedAttributes.reduce((acc, sa) => acc * Math.max(sa.value_ids.length, 1), 1)
                                                    } tổ hợp x ${initialStock} SP)`}
                                            </button>
                                            <p className="text-xs text-slate-500 mt-2 text-center">
                                                Biến thể sẽ được tạo khi bạn bấm "Thêm mới" hoặc "Cập nhật"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Empty State */}
                                {selectedAttributes.length === 0 && (
                                    <div className="text-center py-6 text-slate-500 text-sm">
                                        👆 Chọn ít nhất một loại thuộc tính để bắt đầu tạo biến thể
                                    </div>
                                )}
                            </div>
                        )}

                        {/* No variants - show initial stock input */}
                        {!hasVariants && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <h4 className="font-medium text-amber-800 mb-3">📦 Số lượng sản phẩm ban đầu</h4>
                                <p className="text-sm text-amber-700 mb-3">
                                    Sản phẩm này không có biến thể. Nhập số lượng tồn kho ban đầu:
                                </p>
                                <input
                                    type="number"
                                    value={initialStock}
                                    onChange={(e) => setInitialStock(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="input w-full"
                                    min="0"
                                    placeholder="Nhập số lượng..."
                                />
                                <p className="text-xs text-amber-600 mt-2">
                                    💡 Bạn có thể cập nhật số lượng sau bằng cách quản lý biến thể.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Hủy</button>
                        <button type="submit" disabled={formLoading} className="btn btn-primary">
                            {formLoading ? 'Đang lưu...' : (editingProduct ? 'Cập nhật' : 'Thêm mới')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Variant Management Modal (Separate) */}
            <Modal
                isOpen={isVariantModalOpen}
                onClose={() => setIsVariantModalOpen(false)}
                title={`Quản lý biến thể - ${selectedProduct?.name || ''}`}
                size="lg"
            >
                <div className="space-y-4">
                    <form onSubmit={handleVariantSubmit} className="p-4 bg-slate-50 rounded-lg">
                        {variantFormError && (
                            <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm">{variantFormError}</div>
                        )}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-slate-600">SKU</label>
                                <input name="sku" value={variantFormData.sku} onChange={handleVariantInputChange} className="input text-sm" required />
                            </div>
                            <div>
                                <label className="text-xs text-slate-600">Giá</label>
                                <input type="number" name="price" value={variantFormData.price} onChange={handleVariantInputChange} className="input text-sm" min="0" required />
                            </div>
                            <div>
                                <label className="text-xs text-slate-600">Tồn kho</label>
                                <input type="number" name="stock" value={variantFormData.stock} onChange={handleVariantInputChange} className="input text-sm" min="0" />
                            </div>
                        </div>
                        <div className="flex justify-end mt-3">
                            <button type="submit" disabled={variantLoading} className="btn btn-primary text-sm">
                                {variantLoading ? 'Đang lưu...' : (editingVariant ? 'Cập nhật' : 'Thêm')}
                            </button>
                        </div>
                    </form>

                    <div>
                        <h4 className="font-medium text-slate-800 mb-2">Danh sách ({variants.length})</h4>
                        {variants.length === 0 ? (
                            <p className="text-slate-500 text-sm py-4 text-center">Chưa có biến thể</p>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {variants.map(v => (
                                    <div key={v.id} className="flex items-center justify-between p-2 bg-white border rounded">
                                        <div>
                                            <p className="text-sm font-mono">{v.sku}</p>
                                            <p className="text-xs text-slate-500">
                                                {[v.color, v.size, v.storage, v.ram, v.material, v.capacity].filter(Boolean).join(' / ') || 'Default'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{new Intl.NumberFormat('vi-VN').format(v.price)}₫</span>
                                            <span className={`text-xs ${v.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>Tồn: {v.stock}</span>
                                            <button onClick={() => handleEditVariant(v)} className="p-1 hover:bg-slate-100 rounded">✏️</button>
                                            <button onClick={() => handleDeleteVariant(v)} className="p-1 hover:bg-red-50 rounded text-red-500">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-3 border-t">
                        <button type="button" onClick={() => setIsVariantModalOpen(false)} className="btn btn-secondary">Đóng</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Products;
