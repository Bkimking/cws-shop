import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
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
} from '@/components/ui/dialog';
import adminproducts from '@/routes/admin/products';
import {
    Package,
    Plus,
    Search,
    Pencil,
    Ban,
    Power,
    Tag,
    Layers,
    DollarSign,
    Activity,
} from 'lucide-react';

interface ProductVariant {
    id: number;
    variant_name: string;
    sku_suffix: string | null;
    price_delta: number;
}

interface ProductRegionPrice {
    id: number;
    region_id: number;
    price_override: number | null;
    region: {
        id: number;
        name: string;
    };
}

interface Product {
    id: number;
    name: string;
    sku: string;
    description: string | null;
    base_price: number;
    is_active: boolean;
    category: {
        id: number;
        name: string;
    };
    variants_count?: number;
    variants?: ProductVariant[];
    images?: Array<{
        id: number;
        url: string;
        alt_text: string | null;
        is_primary: boolean;
    }>;
    region_prices?: ProductRegionPrice[];
}

interface Category {
    id: number;
    name: string;
}

interface ProductsIndexProps {
    products: {
        data: Product[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    categories: Category[];
}

export default function AdminProductsIndex({
    products,
    categories,
}: ProductsIndexProps) {
    const productList = products.data || [];
    const [selectedProductId, setSelectedProductId] = useState<number>(
        productList[0]?.id ?? 1,
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] =
        useState<string>('all');
    const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
    const [productToDeactivate, setProductToDeactivate] =
        useState<Product | null>(null);
    const [confirmProductName, setConfirmProductName] = useState('');

    const selectedProduct =
        productList.find((p) => p.id === selectedProductId) || productList[0];

    const filteredProducts = productList.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
            selectedCategoryFilter === 'all' ||
            p.category.name === selectedCategoryFilter;
        return matchesSearch && matchesCategory;
    });

    const handleDeactivate = () => {
        if (!productToDeactivate) return;

        router.delete(adminproducts.destroy(productToDeactivate.id).url, {
            onSuccess: () => {
                setDeactivateModalOpen(false);
                setProductToDeactivate(null);
                setConfirmProductName('');
            },
        });
    };

    const handleReactivate = (product: Product) => {
        router.post(adminproducts.reactivate(product.id).url, {});
    };

    return (
        <>
            <Head title="Products" />

            <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
                {/* Header */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b px-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <Package className="size-5 text-primary" />
                            <h1 className="text-xl font-semibold tracking-tight">
                                Products
                            </h1>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Manage product catalog, variants, pricing, and
                            regional overrides.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={adminproducts.create().url}>
                            <Button size="sm">
                                <Plus className="mr-1.5 size-4" />
                                Add Product
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Master-Detail Layout */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    {/* Left Pane: Product List */}
                    <div className="flex w-96 shrink-0 flex-col border-r bg-muted/20">
                        {/* Search & Category Filter */}
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

                            {/* Category Filter Chips */}
                            <div className="flex flex-wrap gap-1 pt-1">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedCategoryFilter('all')
                                    }
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                        selectedCategoryFilter === 'all'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                >
                                    All
                                </button>
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() =>
                                            setSelectedCategoryFilter(cat.name)
                                        }
                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                            selectedCategoryFilter === cat.name
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List Items */}
                        <div className="flex-1 space-y-1 overflow-y-auto p-2">
                            {filteredProducts.map((product) => {
                                const isSelected =
                                    product.id === selectedProduct?.id;

                                return (
                                    <div
                                        key={product.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                            setSelectedProductId(product.id)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === 'Enter' ||
                                                e.key === ' '
                                            ) {
                                                setSelectedProductId(
                                                    product.id,
                                                );
                                            }
                                        }}
                                        className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-left transition-all outline-none ${
                                            isSelected
                                                ? 'border-primary/50 bg-primary/5 shadow-xs'
                                                : 'border-transparent hover:border-border hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex min-w-0 items-center gap-2">
                                                {(product.images ?? []).length >
                                                0 ? (
                                                    <img
                                                        src={
                                                            (
                                                                product.images ??
                                                                []
                                                            ).find(
                                                                (image) =>
                                                                    image.is_primary,
                                                            )?.url ??
                                                            (product.images ??
                                                                [])[0].url
                                                        }
                                                        alt={product.name}
                                                        className="size-8 rounded-md object-cover"
                                                    />
                                                ) : (
                                                    <Package className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                                                )}
                                                <span className="truncate text-sm font-semibold tracking-tight">
                                                    {product.name}
                                                </span>
                                            </div>
                                            <Badge
                                                variant={
                                                    product.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                                className={
                                                    product.is_active
                                                        ? 'bg-emerald-500 text-[10px] hover:bg-emerald-600'
                                                        : 'text-[10px]'
                                                }
                                            >
                                                {product.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Tag className="size-3" />
                                                {product.category.name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Layers className="size-3" />
                                                {product.variants_count ??
                                                    product.variants?.length ??
                                                    0}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredProducts.length === 0 && (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    No products found matching filter.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Product Details */}
                    <div className="flex flex-1 flex-col overflow-hidden bg-background">
                        {selectedProduct ? (
                            <>
                                {/* Header / Hero */}
                                <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-11 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 shadow-xs">
                                            {(selectedProduct.images ?? [])
                                                .length > 0 ? (
                                                <img
                                                    src={
                                                        (
                                                            selectedProduct.images ??
                                                            []
                                                        ).find(
                                                            (image) =>
                                                                image.is_primary,
                                                        )?.url ??
                                                        (selectedProduct.images ??
                                                            [])[0].url
                                                    }
                                                    alt={selectedProduct.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <Package className="size-6 text-primary" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <h2 className="text-lg font-bold tracking-tight">
                                                    {selectedProduct.name}
                                                </h2>
                                                <Badge
                                                    variant="outline"
                                                    className="gap-1 text-xs"
                                                >
                                                    <Tag className="size-3" />
                                                    {
                                                        selectedProduct.category
                                                            .name
                                                    }
                                                </Badge>
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                SKU: {selectedProduct.sku}
                                                {selectedProduct.description &&
                                                    ` • ${selectedProduct.description}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Toolbar */}
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={
                                                adminproducts.edit(
                                                    selectedProduct.id,
                                                ).url
                                            }
                                        >
                                            <Button variant="outline" size="sm">
                                                <Pencil className="mr-1.5 size-3.5" />
                                                Edit
                                            </Button>
                                        </Link>
                                        {selectedProduct.is_active ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    setProductToDeactivate(
                                                        selectedProduct,
                                                    );
                                                    setConfirmProductName('');
                                                    setDeactivateModalOpen(
                                                        true,
                                                    );
                                                }}
                                            >
                                                <Ban className="mr-1.5 size-3.5" />
                                                Deactivate
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-emerald-600 hover:bg-emerald-50"
                                                onClick={() =>
                                                    handleReactivate(
                                                        selectedProduct,
                                                    )
                                                }
                                            >
                                                <Power className="mr-1.5 size-3.5" />
                                                Reactivate
                                            </Button>
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
                                                value="variants"
                                                className="text-xs"
                                            >
                                                Variants (
                                                {selectedProduct.variants
                                                    ?.length ?? 0}
                                                )
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="pricing"
                                                className="text-xs"
                                            >
                                                Pricing
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
                                                                Base Price
                                                            </p>
                                                            <div className="flex items-center gap-1 text-lg font-semibold">
                                                                <DollarSign className="size-4 text-muted-foreground" />
                                                                {Number(
                                                                    selectedProduct.base_price,
                                                                ).toFixed(2)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="mb-1 text-xs text-muted-foreground">
                                                                Status
                                                            </p>
                                                            <Badge
                                                                variant={
                                                                    selectedProduct.is_active
                                                                        ? 'default'
                                                                        : 'secondary'
                                                                }
                                                                className={
                                                                    selectedProduct.is_active
                                                                        ? 'bg-emerald-500 hover:bg-emerald-600'
                                                                        : ''
                                                                }
                                                            >
                                                                {selectedProduct.is_active
                                                                    ? 'Active'
                                                                    : 'Inactive'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    {selectedProduct.description && (
                                                        <div>
                                                            <p className="mb-1 text-xs text-muted-foreground">
                                                                Description
                                                            </p>
                                                            <p className="text-sm">
                                                                {
                                                                    selectedProduct.description
                                                                }
                                                            </p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        <TabsContent
                                            value="variants"
                                            className="space-y-4"
                                        >
                                            <Card>
                                                <CardContent className="p-6">
                                                    {selectedProduct.variants &&
                                                    selectedProduct.variants
                                                        .length > 0 ? (
                                                        <div className="space-y-3">
                                                            {selectedProduct.variants.map(
                                                                (variant) => (
                                                                    <div
                                                                        key={
                                                                            variant.id
                                                                        }
                                                                        className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                                                                    >
                                                                        <div>
                                                                            <p className="text-sm font-medium">
                                                                                {
                                                                                    variant.variant_name
                                                                                }
                                                                            </p>
                                                                            {variant.sku_suffix && (
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    SKU
                                                                                    Suffix:{' '}
                                                                                    {
                                                                                        variant.sku_suffix
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-1 text-sm">
                                                                            <DollarSign className="size-3 text-muted-foreground" />
                                                                            {Number(
                                                                                variant.price_delta,
                                                                            ).toFixed(
                                                                                2,
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="py-4 text-center text-sm text-muted-foreground">
                                                            No variants
                                                            configured
                                                        </p>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        <TabsContent
                                            value="pricing"
                                            className="space-y-4"
                                        >
                                            <Card>
                                                <CardContent className="p-6">
                                                    {selectedProduct.region_prices &&
                                                    selectedProduct
                                                        .region_prices.length >
                                                        0 ? (
                                                        <div className="space-y-3">
                                                            {selectedProduct.region_prices.map(
                                                                (rp) => (
                                                                    <div
                                                                        key={
                                                                            rp.id
                                                                        }
                                                                        className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                                                                    >
                                                                        <div>
                                                                            <p className="text-sm font-medium">
                                                                                {
                                                                                    rp
                                                                                        .region
                                                                                        .name
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 text-sm">
                                                                            <DollarSign className="size-3 text-muted-foreground" />
                                                                            {rp.price_override
                                                                                ? Number(
                                                                                      rp.price_override,
                                                                                  ).toFixed(
                                                                                      2,
                                                                                  )
                                                                                : 'Using base price'}
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="py-4 text-center text-sm text-muted-foreground">
                                                            No regional price
                                                            overrides configured
                                                        </p>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center">
                                <div className="text-center text-muted-foreground">
                                    <Package className="mx-auto mb-4 size-12 opacity-50" />
                                    <p className="text-sm">
                                        Select a product to view details
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Deactivate Confirmation Dialog */}
            <Dialog
                open={deactivateModalOpen}
                onOpenChange={setDeactivateModalOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Deactivate Product</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to deactivate{' '}
                            <strong>{productToDeactivate?.name}</strong>? This
                            will prevent it from being used in new orders.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <label className="text-sm font-medium">
                            Type the product name to confirm:{' '}
                            <strong>{productToDeactivate?.name}</strong>
                        </label>
                        <Input
                            value={confirmProductName}
                            onChange={(e) =>
                                setConfirmProductName(e.target.value)
                            }
                            placeholder={productToDeactivate?.name}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeactivateModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeactivate}
                            disabled={
                                confirmProductName !== productToDeactivate?.name
                            }
                        >
                            Deactivate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminProductsIndex.layout = {
    breadcrumbs: [{ title: 'Products', href: adminproducts.index().url }],
};
