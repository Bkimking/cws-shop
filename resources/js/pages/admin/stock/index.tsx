import { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import adminstock from '@/routes/admin/stock';
import type { Auth } from '@/types';
import {
    Package,
    Warehouse,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Search,
    Box,
    ArrowUpRight,
    ArrowDownRight,
    User,
    Clock,
    Plus,
} from 'lucide-react';

interface Warehouse {
    id: number;
    name: string;
    branch: {
        id: number;
        name: string;
        region_id: number;
    };
}

interface Category {
    id: number;
    name: string;
}

interface ProductVariantSimple {
    id: number;
    variant_name: string;
    sku_suffix: string | null;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    category_id: number;
    category: Category;
    variants: ProductVariantSimple[];
}

interface ProductVariant {
    id: number;
    variant_name: string;
    sku_suffix: string | null;
    price_delta: number;
    product: {
        id: number;
        name: string;
        sku: string;
        category: {
            id: number;
            name: string;
        };
    };
}

interface StockLevel {
    id: number;
    warehouse_id: number;
    product_variant_id: number;
    quantity_on_hand: number;
    reorder_point: number;
    warehouse: Warehouse;
    product_variant: ProductVariant;
}

interface Movement {
    id: number;
    warehouse_id: number;
    product_variant_id: number;
    quantity: number;
    type: string;
    reference_id: string;
    notes: string | null;
    created_at: string;
    warehouse: {
        id: number;
        name: string;
    };
    product_variant: {
        id: number;
        variant_name: string;
    };
    createdBy: {
        id: number;
        name: string;
    };
}

interface StockIndexProps {
    stockLevels: {
        data: StockLevel[];
        links: any[];
    };
    warehouses: Warehouse[];
    categories: Category[];
    products: Product[];
}

function StockBadge({
    quantity,
    reorderPoint,
}: {
    quantity: number;
    reorderPoint: number;
}) {
    if (quantity <= 0) {
        return (
            <Badge
                variant="destructive"
                className="border-red-500/30 bg-red-500/20 text-red-400"
            >
                <XCircle className="mr-1 size-3" />
                Out
            </Badge>
        );
    }

    if (quantity <= reorderPoint) {
        return (
            <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/20 text-amber-400"
            >
                <AlertTriangle className="mr-1 size-3" />
                Low
            </Badge>
        );
    }

    return (
        <Badge
            variant="outline"
            className="border-green-500/30 bg-green-500/20 text-green-400"
        >
            <CheckCircle2 className="mr-1 size-3" />
            OK
        </Badge>
    );
}

function MovementIcon({ type, quantity }: { type: string; quantity: number }) {
    if (quantity > 0) {
        return <ArrowUpRight className="size-4 text-green-500" />;
    }
    return <ArrowDownRight className="size-4 text-red-500" />;
}

function MovementTypeBadge({ type }: { type: string }) {
    const colors: Record<string, string> = {
        ADJUSTMENT: 'border-blue-500/30 bg-blue-500/20 text-blue-400',
        TRANSFER_IN: 'border-green-500/30 bg-green-500/20 text-green-400',
        TRANSFER_OUT: 'border-orange-500/30 bg-orange-500/20 text-orange-400',
        PURCHASE: 'border-purple-500/30 bg-purple-500/20 text-purple-400',
        RETURN: 'border-pink-500/30 bg-pink-500/20 text-pink-400',
        WASTAGE: 'border-red-500/30 bg-red-500/20 text-red-400',
    };

    return (
        <Badge variant="outline" className={colors[type] || 'border-border/60'}>
            {type.replace('_', ' ')}
        </Badge>
    );
}

export default function StockIndex({
    stockLevels,
    warehouses,
    categories,
    products,
}: StockIndexProps) {
    const stockList = stockLevels.data || [];
    const [selectedStockId, setSelectedStockId] = useState<number | null>(
        stockList[0]?.id ?? null,
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWarehouseFilter, setSelectedWarehouseFilter] =
        useState<string>('all');
    const [selectedStateFilter, setSelectedStateFilter] =
        useState<string>('all');

    // Modal cascading filter state
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');

    const {
        data: createData,
        setData: setCreateData,
        post: createPost,
        processing: createProcessing,
        errors: createErrors,
        reset: createReset,
    } = useForm({
        warehouse_id: '',
        product_variant_id: '',
        quantity_on_hand: '',
        reorder_point: '',
        supplier_name: '',
        notes: '',
    });

    const { auth } = usePage<{ auth: Auth }>().props;
    const canTransfer = (auth.permissions ?? []).includes('transfer stock');
    const transferForm = useForm({
        from_warehouse_id: '',
        to_warehouse_id: '',
        product_variant_id: '',
        quantity: '',
        notes: '',
    });
    const variantOptions = products.flatMap((product) =>
        product.variants.map((variant) => ({
            id: variant.id,
            label: `${product.name} · ${variant.variant_name}${variant.sku_suffix ? ` (${variant.sku_suffix})` : ''}`,
        })),
    );

    // Reset cascading filters when category changes
    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCategoryId(e.target.value);
        setSelectedProductId('');
        setCreateData('product_variant_id', '');
    };

    // Reset product variant when product changes
    const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedProductId(e.target.value);
        setCreateData('product_variant_id', '');
    };

    // Filter products by selected category
    const filteredProducts = selectedCategoryId
        ? products.filter((p) => p.category_id === parseInt(selectedCategoryId))
        : [];

    // Get variants for selected product
    const selectedProduct = products.find(
        (p) => p.id === parseInt(selectedProductId),
    );
    const productVariants = selectedProduct?.variants || [];
    const selectedVariant = productVariants.find(
        (v) => v.id === parseInt(createData.product_variant_id),
    );

    const submitTransfer = (e: FormEvent) => {
        e.preventDefault();
        transferForm.post(adminstock.transfer().url, {
            preserveScroll: true,
            onSuccess: () => transferForm.reset(),
        });
    };

    const submitCreateStockLevel = (e: FormEvent) => {
        e.preventDefault();
        createPost(adminstock.createStockLevel().url, {
            preserveScroll: true,
            onSuccess: () => {
                createReset();
                setSelectedCategoryId('');
                setSelectedProductId('');
            },
        });
    };

    const selectedStock =
        stockList.find((s) => s.id === selectedStockId) || stockList[0] || null;

    const filteredStock = stockList.filter((s) => {
        const matchesSearch =
            !searchQuery ||
            s.product_variant?.product?.name
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            s.product_variant?.product?.sku
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase());
        const matchesWarehouse =
            selectedWarehouseFilter === 'all' ||
            s.warehouse?.id?.toString() === selectedWarehouseFilter;
        const matchesState =
            selectedStateFilter === 'all' ||
            (selectedStateFilter === 'ok' &&
                s.quantity_on_hand > s.reorder_point) ||
            (selectedStateFilter === 'low' &&
                s.quantity_on_hand <= s.reorder_point &&
                s.quantity_on_hand > 0) ||
            (selectedStateFilter === 'out' && s.quantity_on_hand <= 0);
        return matchesSearch && matchesWarehouse && matchesState;
    });

    return (
        <>
            <Head title="Stock" />

            <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
                {/* Header */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b px-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <Box className="size-5 text-primary" />
                            <h1 className="text-xl font-semibold tracking-tight">
                                Stock
                            </h1>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Manage inventory levels across warehouses
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {canTransfer && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                        <ArrowUpRight className="mr-1.5 size-4" />
                                        Transfer stock
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>
                                            Transfer stock
                                        </DialogTitle>
                                        <DialogDescription>
                                            Move quantity between warehouses.
                                            This records transfer-out and
                                            transfer-in movements.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form
                                        onSubmit={submitTransfer}
                                        className="space-y-4 pt-2"
                                    >
                                        <div className="grid gap-2">
                                            <Label htmlFor="from_warehouse_id">
                                                From warehouse
                                            </Label>
                                            <select
                                                id="from_warehouse_id"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={
                                                    transferForm.data
                                                        .from_warehouse_id
                                                }
                                                onChange={(e) =>
                                                    transferForm.setData(
                                                        'from_warehouse_id',
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    Select source
                                                </option>
                                                {warehouses.map((wh) => (
                                                    <option
                                                        key={wh.id}
                                                        value={wh.id}
                                                    >
                                                        {wh.name} (
                                                        {wh.branch.name})
                                                    </option>
                                                ))}
                                            </select>
                                            {transferForm.errors
                                                .from_warehouse_id && (
                                                <p className="text-xs text-destructive">
                                                    {
                                                        transferForm.errors
                                                            .from_warehouse_id
                                                    }
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="to_warehouse_id">
                                                To warehouse
                                            </Label>
                                            <select
                                                id="to_warehouse_id"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={
                                                    transferForm.data
                                                        .to_warehouse_id
                                                }
                                                onChange={(e) =>
                                                    transferForm.setData(
                                                        'to_warehouse_id',
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    Select destination
                                                </option>
                                                {warehouses.map((wh) => (
                                                    <option
                                                        key={wh.id}
                                                        value={wh.id}
                                                    >
                                                        {wh.name} (
                                                        {wh.branch.name})
                                                    </option>
                                                ))}
                                            </select>
                                            {transferForm.errors
                                                .to_warehouse_id && (
                                                <p className="text-xs text-destructive">
                                                    {
                                                        transferForm.errors
                                                            .to_warehouse_id
                                                    }
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="transfer_variant">
                                                Product variant
                                            </Label>
                                            <select
                                                id="transfer_variant"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={
                                                    transferForm.data
                                                        .product_variant_id
                                                }
                                                onChange={(e) =>
                                                    transferForm.setData(
                                                        'product_variant_id',
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    Select variant
                                                </option>
                                                {variantOptions.map(
                                                    (variant) => (
                                                        <option
                                                            key={variant.id}
                                                            value={variant.id}
                                                        >
                                                            {variant.label}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                            {transferForm.errors
                                                .product_variant_id && (
                                                <p className="text-xs text-destructive">
                                                    {
                                                        transferForm.errors
                                                            .product_variant_id
                                                    }
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="transfer_quantity">
                                                Quantity
                                            </Label>
                                            <Input
                                                id="transfer_quantity"
                                                type="number"
                                                min="1"
                                                value={
                                                    transferForm.data.quantity
                                                }
                                                onChange={(e) =>
                                                    transferForm.setData(
                                                        'quantity',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {transferForm.errors.quantity && (
                                                <p className="text-xs text-destructive">
                                                    {
                                                        transferForm.errors
                                                            .quantity
                                                    }
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="transfer_notes">
                                                Notes
                                            </Label>
                                            <Input
                                                id="transfer_notes"
                                                value={transferForm.data.notes}
                                                onChange={(e) =>
                                                    transferForm.setData(
                                                        'notes',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Optional transfer note"
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                type="submit"
                                                disabled={
                                                    transferForm.processing
                                                }
                                            >
                                                Transfer stock
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="mr-1.5 size-4" />
                                    Receive stock
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>
                                        Receive / add stock
                                    </DialogTitle>
                                    <DialogDescription>
                                        Add a product to a warehouse. Add a
                                        supplier when this is a purchase
                                        receipt.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={submitCreateStockLevel}>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="warehouse_id">
                                                Warehouse
                                            </Label>
                                            <select
                                                id="warehouse_id"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                value={createData.warehouse_id}
                                                onChange={(e) =>
                                                    setCreateData(
                                                        'warehouse_id',
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    Select a warehouse
                                                </option>
                                                {warehouses.map((wh) => (
                                                    <option
                                                        key={wh.id}
                                                        value={wh.id}
                                                    >
                                                        {wh.name} (
                                                        {wh.branch.name})
                                                    </option>
                                                ))}
                                            </select>
                                            {createErrors.warehouse_id && (
                                                <p className="text-xs text-destructive">
                                                    {createErrors.warehouse_id}
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="category_id">
                                                Category
                                            </Label>
                                            <select
                                                id="category_id"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                value={selectedCategoryId}
                                                onChange={handleCategoryChange}
                                            >
                                                <option value="">
                                                    Select a category
                                                </option>
                                                {categories.map((cat) => (
                                                    <option
                                                        key={cat.id}
                                                        value={cat.id}
                                                    >
                                                        {cat.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="product_id">
                                                Product
                                            </Label>
                                            <select
                                                id="product_id"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                value={selectedProductId}
                                                onChange={handleProductChange}
                                                disabled={!selectedCategoryId}
                                            >
                                                <option value="">
                                                    Select a product
                                                </option>
                                                {filteredProducts.map(
                                                    (prod) => (
                                                        <option
                                                            key={prod.id}
                                                            value={prod.id}
                                                            title={`${prod.name} - SKU: ${prod.sku}`}
                                                        >
                                                            {prod.name} (
                                                            {prod.sku})
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                            {selectedProduct && (
                                                <p className="text-xs text-muted-foreground">
                                                    <span className="font-medium text-foreground">
                                                        {selectedProduct.name}
                                                    </span>
                                                    {' • SKU: '}
                                                    <span className="font-mono">
                                                        {selectedProduct.sku}
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="product_variant_id">
                                                Product Variant
                                            </Label>
                                            <select
                                                id="product_variant_id"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                value={
                                                    createData.product_variant_id
                                                }
                                                onChange={(e) =>
                                                    setCreateData(
                                                        'product_variant_id',
                                                        e.target.value,
                                                    )
                                                }
                                                disabled={!selectedProductId}
                                            >
                                                <option value="">
                                                    Select a variant
                                                </option>
                                                {productVariants.map(
                                                    (variant) => (
                                                        <option
                                                            key={variant.id}
                                                            value={variant.id}
                                                            title={`${variant.variant_name}${variant.sku_suffix ? ` - SKU Suffix: ${variant.sku_suffix}` : ''}`}
                                                        >
                                                            {
                                                                variant.variant_name
                                                            }
                                                            {variant.sku_suffix &&
                                                                ` (${variant.sku_suffix})`}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                            {selectedVariant && (
                                                <p className="text-xs text-muted-foreground">
                                                    <span className="font-medium text-foreground">
                                                        {
                                                            selectedVariant.variant_name
                                                        }
                                                    </span>
                                                    {selectedVariant.sku_suffix && (
                                                        <>
                                                            {' • SKU Suffix: '}
                                                            <span className="font-mono">
                                                                {
                                                                    selectedVariant.sku_suffix
                                                                }
                                                            </span>
                                                        </>
                                                    )}
                                                </p>
                                            )}
                                            {createErrors.product_variant_id && (
                                                <p className="text-xs text-destructive">
                                                    {
                                                        createErrors.product_variant_id
                                                    }
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="quantity_on_hand">
                                                Initial Quantity
                                            </Label>
                                            <Input
                                                id="quantity_on_hand"
                                                type="number"
                                                step="1"
                                                value={
                                                    createData.quantity_on_hand
                                                }
                                                onChange={(e) =>
                                                    setCreateData(
                                                        'quantity_on_hand',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {createErrors.quantity_on_hand && (
                                                <p className="text-xs text-destructive">
                                                    {
                                                        createErrors.quantity_on_hand
                                                    }
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="reorder_point">
                                                Reorder Point
                                            </Label>
                                            <Input
                                                id="reorder_point"
                                                type="number"
                                                step="1"
                                                value={createData.reorder_point}
                                                onChange={(e) =>
                                                    setCreateData(
                                                        'reorder_point',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {createErrors.reorder_point && (
                                                <p className="text-xs text-destructive">
                                                    {createErrors.reorder_point}
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="supplier_name">
                                                Supplier (optional)
                                            </Label>
                                            <Input
                                                id="supplier_name"
                                                placeholder="Supplier or delivery note"
                                                value={createData.supplier_name}
                                                onChange={(e) =>
                                                    setCreateData(
                                                        'supplier_name',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {createErrors.supplier_name && (
                                                <p className="text-xs text-destructive">
                                                    {createErrors.supplier_name}
                                                </p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="notes">Notes</Label>
                                            <Input
                                                id="notes"
                                                placeholder="Additional details..."
                                                value={createData.notes}
                                                onChange={(e) =>
                                                    setCreateData(
                                                        'notes',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {createErrors.notes && (
                                                <p className="text-xs text-destructive">
                                                    {createErrors.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            type="submit"
                                            disabled={createProcessing}
                                        >
                                            {createProcessing
                                                ? 'Creating...'
                                                : 'Create Stock Level'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Master-Detail Layout */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    {/* Left Pane: Stock List */}
                    <div className="flex w-96 shrink-0 flex-col border-r bg-muted/20">
                        {/* Search & Filters */}
                        <div className="space-y-2 border-b p-3">
                            <div className="relative">
                                <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search products..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="h-9 pl-8 text-sm"
                                />
                            </div>

                            {/* Warehouse Filter */}
                            <div className="flex flex-wrap gap-1 pt-1">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedWarehouseFilter('all')
                                    }
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                        selectedWarehouseFilter === 'all'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                >
                                    All Warehouses
                                </button>
                                {warehouses.map((wh) => (
                                    <button
                                        key={wh.id}
                                        type="button"
                                        onClick={() =>
                                            setSelectedWarehouseFilter(
                                                wh.id.toString(),
                                            )
                                        }
                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                            selectedWarehouseFilter ===
                                            wh.id.toString()
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        {wh.name}
                                    </button>
                                ))}
                            </div>

                            {/* State Filter */}
                            <div className="flex flex-wrap gap-1 pt-1">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedStateFilter('all')
                                    }
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                        selectedStateFilter === 'all'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedStateFilter('ok')}
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                        selectedStateFilter === 'ok'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                >
                                    OK
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedStateFilter('low')
                                    }
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                        selectedStateFilter === 'low'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                >
                                    Low
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedStateFilter('out')
                                    }
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                        selectedStateFilter === 'out'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                >
                                    Out
                                </button>
                            </div>
                        </div>

                        {/* List Items */}
                        <div className="flex-1 space-y-1 overflow-y-auto p-2">
                            {filteredStock.map((stock) => {
                                const isSelected =
                                    stock.id === selectedStock?.id;

                                return (
                                    <div
                                        key={stock.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                            setSelectedStockId(stock.id)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === 'Enter' ||
                                                e.key === ' '
                                            ) {
                                                setSelectedStockId(stock.id);
                                            }
                                        }}
                                        className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-left transition-all outline-none ${
                                            isSelected
                                                ? 'border-primary/50 bg-primary/5 shadow-xs'
                                                : 'border-transparent hover:border-border hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Package className="size-4 text-muted-foreground group-hover:text-foreground" />
                                                <span className="text-sm font-semibold tracking-tight">
                                                    {stock.product_variant
                                                        ?.product?.name ||
                                                        'Unknown Product'}
                                                </span>
                                            </div>
                                            <StockBadge
                                                quantity={
                                                    stock.quantity_on_hand
                                                }
                                                reorderPoint={
                                                    stock.reorder_point
                                                }
                                            />
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Warehouse className="size-3" />
                                                {stock.warehouse.name}
                                            </span>
                                            <span className="font-mono font-semibold">
                                                {stock.quantity_on_hand}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredStock.length === 0 && (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    No stock items found matching filter.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Stock Details */}
                    <div className="flex flex-1 flex-col overflow-hidden bg-background">
                        {selectedStock ? (
                            <>
                                {/* Header / Hero */}
                                <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40 shadow-xs">
                                            <Package className="size-6 text-primary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <h2 className="text-lg font-bold tracking-tight">
                                                    {selectedStock
                                                        ?.product_variant
                                                        ?.product?.name ||
                                                        'Unknown Product'}
                                                </h2>
                                                <Badge
                                                    variant="outline"
                                                    className="gap-1 text-xs"
                                                >
                                                    <Warehouse className="size-3" />
                                                    {selectedStock?.warehouse
                                                        ?.name ||
                                                        'Unknown Warehouse'}
                                                </Badge>
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                SKU:{' '}
                                                {selectedStock?.product_variant
                                                    ?.product?.sku || 'N/A'}
                                                {selectedStock?.product_variant
                                                    ?.variant_name &&
                                                    ` • ${selectedStock.product_variant.variant_name}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Toolbar */}
                                    <div className="flex items-center gap-2">
                                        {selectedStock && (
                                            <Link
                                                href={
                                                    adminstock.show({
                                                        stockLevel:
                                                            selectedStock.id,
                                                    }).url
                                                }
                                            >
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    View Details
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {/* Tabs Layout */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <Tabs
                                        defaultValue="overview"
                                        className="space-y-6"
                                    >
                                        <TabsList className="bg-muted/60 p-1">
                                            <TabsTrigger
                                                value="overview"
                                                className="text-xs"
                                            >
                                                Overview
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="movements"
                                                className="text-xs"
                                            >
                                                Movement History
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent
                                            value="overview"
                                            className="space-y-4"
                                        >
                                            <Card>
                                                <CardContent className="space-y-4 p-6">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="mb-1 text-xs text-muted-foreground">
                                                                On Hand
                                                            </p>
                                                            <div className="text-2xl font-semibold tabular-nums">
                                                                {selectedStock?.quantity_on_hand ??
                                                                    0}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="mb-1 text-xs text-muted-foreground">
                                                                Reorder Point
                                                            </p>
                                                            <div className="text-2xl font-semibold tabular-nums">
                                                                {selectedStock?.reorder_point ??
                                                                    0}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="mb-1 text-xs text-muted-foreground">
                                                            Status
                                                        </p>
                                                        <StockBadge
                                                            quantity={
                                                                selectedStock?.quantity_on_hand ??
                                                                0
                                                            }
                                                            reorderPoint={
                                                                selectedStock?.reorder_point ??
                                                                0
                                                            }
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        <TabsContent
                                            value="movements"
                                            className="space-y-4"
                                        >
                                            <Card>
                                                <CardContent className="p-6">
                                                    <div className="py-8 text-center text-sm text-muted-foreground">
                                                        Movement history
                                                        available in detail view
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <div className="text-center text-muted-foreground">
                                    <Package className="mx-auto mb-2 size-8 opacity-50" />
                                    <p className="text-sm">
                                        Select a stock item to view details
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

StockIndex.layout = {
    breadcrumbs: [
        {
            title: 'Stock',
            href: adminstock.index().url,
        },
    ],
};
