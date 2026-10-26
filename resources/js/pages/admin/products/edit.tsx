import { Head, Link, router, useForm, useHttp } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import adminproducts from '@/routes/admin/products';
import {
    ArrowLeft,
    Package,
    Plus,
    Trash2,
    DollarSign,
    Tag,
    Layers,
    Image,
    Box,
    Lock,
    Unlock,
    RefreshCw,
    UploadCloud,
    X,
    Star,
} from 'lucide-react';

interface ProductVariant {
    id?: number;
    variant_name: string;
    sku_suffix: string | null;
    price_delta: number;
}

interface ProductImage {
    id: number;
    path: string;
    url: string;
    alt_text: string | null;
    is_primary: boolean;
}

interface ProductRegionPrice {
    id?: number;
    region_id: number;
    price_override: number | null;
    region: {
        id: number;
        name: string;
    };
}

interface Product {
    id: number;
    category_id: number;
    name: string;
    sku: string;
    description: string | null;
    base_price: number;
    is_active: boolean;
    category: {
        id: number;
        name: string;
    };
    variants: ProductVariant[];
    region_prices: ProductRegionPrice[];
    images: ProductImage[];
}

interface Category {
    id: number;
    name: string;
}

interface Region {
    id: number;
    name: string;
}

interface Props {
    product: Product;
    categories: Category[];
    regions: Region[];
}

const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function AdminProductEdit({
    product,
    categories,
    regions,
}: Props) {
    const { data, setData, put, processing, errors } = useForm({
        category_id: String(product.category_id),
        name: product.name,
        sku: product.sku,
        description: product.description ?? '',
        base_price: String(product.base_price),
        is_active: product.is_active,
        variants: product.variants.map((v) => ({
            id: v.id,
            variant_name: v.variant_name,
            sku_suffix: v.sku_suffix ?? '',
            price_delta: String(v.price_delta),
        })),
        images: [] as File[],
        region_prices: product.region_prices.map((rp) => ({
            id: rp.id,
            region_id: String(rp.region_id),
            price_override: rp.price_override ? String(rp.price_override) : '',
        })),
    });

    const [skuLocked, setSkuLocked] = useState(false);
    const [skuPreview, setSkuPreview] = useState('');
    const [variantLocked, setVariantLocked] = useState<boolean[]>(
        product.variants.map(() => false),
    );
    const [variantPreview, setVariantPreview] = useState<string[]>(
        product.variants.map(() => ''),
    );
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [generatingSku, setGeneratingSku] = useState(false);

    // Generate SKU preview from category and name
    const generateSkuPreview = (categoryId: string, name: string) => {
        if (!categoryId || !name) {
            setSkuPreview('');
            return;
        }

        const words = name.split(/[\s\-_]+/);
        const abbreviated = words
            .map((word) => word.substring(0, 3).toUpperCase())
            .join('-');
        setSkuPreview(`${categoryId}-${abbreviated}-${product.id}`);
    };

    // Generate variant suffix preview
    const generateVariantPreview = (variantName: string, index: number) => {
        if (!variantName) {
            const newPreviews = [...variantPreview];
            newPreviews[index] = '';
            setVariantPreview(newPreviews);
            return;
        }

        const firstWord = variantName.split(/[\s\-_]+/)[0] || '';
        const suffix = `-${firstWord.substring(0, 1).toUpperCase()}`;
        const newPreviews = [...variantPreview];
        newPreviews[index] = suffix;
        setVariantPreview(newPreviews);
    };

    // Call API to generate actual SKU
    const handleGenerateSku = async () => {
        if (!data.category_id || !data.name) {
            return;
        }

        setGeneratingSku(true);
        try {
            const response = await fetch(adminproducts.generateSku().url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>(
                            'meta[name="csrf-token"]',
                        )?.content ?? '',
                },
                body: JSON.stringify({
                    category_id: data.category_id,
                    name: data.name,
                    product_id: product.id,
                }),
            });
            const result = (await response.json()) as { sku?: string };

            if (result.sku) {
                setData('sku', result.sku);
                setSkuLocked(false);
            }
        } catch (error) {
            console.error('Failed to generate SKU:', error);
        } finally {
            setGeneratingSku(false);
        }
    };

    // Handle category change
    const handleCategoryChange = (value: string) => {
        setData('category_id', value);
        generateSkuPreview(value, data.name);
    };

    // Handle name change
    const handleNameChange = (value: string) => {
        setData('name', value);
        generateSkuPreview(data.category_id, value);
    };

    // Handle variant name change
    const handleVariantNameChange = (index: number, value: string) => {
        updateVariant(index, 'variant_name', value);
        generateVariantPreview(value, index);
    };

    // Generate variant suffix
    const handleGenerateVariantSuffix = (index: number) => {
        const variant = data.variants[index];
        if (!variant.variant_name) {
            return;
        }

        const firstWord = variant.variant_name.split(/[\s\-_]+/)[0] || '';
        const suffix = `-${firstWord.substring(0, 1).toUpperCase()}`;
        updateVariant(index, 'sku_suffix', suffix);

        const newLocked = [...variantLocked];
        newLocked[index] = false;
        setVariantLocked(newLocked);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(adminproducts.update(product.id).url, { forceFormData: true });
    };

    const addVariant = () => {
        setData('variants', [
            ...data.variants,
            {
                id: undefined,
                variant_name: '',
                sku_suffix: '',
                price_delta: '',
            },
        ]);
        setVariantLocked([...variantLocked, true]);
        setVariantPreview([...variantPreview, '']);
    };

    const removeVariant = (index: number) => {
        const newVariants = data.variants.filter((_, i) => i !== index);
        setData('variants', newVariants);
    };

    const updateVariant = (index: number, field: string, value: string) => {
        const newVariants = [...data.variants];
        newVariants[index] = { ...newVariants[index], [field]: value };
        setData('variants', newVariants);
    };

    const addRegionPrice = () => {
        setData('region_prices', [
            ...data.region_prices,
            { id: undefined, region_id: '', price_override: '' },
        ]);
    };

    const removeRegionPrice = (index: number) => {
        const newPrices = data.region_prices.filter((_, i) => i !== index);
        setData('region_prices', newPrices);
    };

    const updateRegionPrice = (index: number, field: string, value: string) => {
        const newPrices = [...data.region_prices];
        newPrices[index] = { ...newPrices[index], [field]: value };
        setData('region_prices', newPrices);
    };

    return (
        <>
            <Head title={`Edit ${product.name}`} />
            <div className="mx-auto w-full max-w-4xl p-6">
                <Link href={adminproducts.index().url}>
                    <Button variant="ghost" size="sm" className="mb-4 -ml-3">
                        <ArrowLeft className="mr-1.5 size-4" />
                        Back to products
                    </Button>
                </Link>

                <div className="mb-6 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
                        <Package className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            Edit Product
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Update the details for{' '}
                            <strong>{product.name}</strong>.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    {/* Basics Section */}
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Package className="size-4" />
                                Basics
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Product name, SKU, category, and description.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category_id">
                                        Category
                                    </Label>
                                    <select
                                        id="category_id"
                                        className={selectClass}
                                        value={data.category_id}
                                        onChange={(e) =>
                                            handleCategoryChange(e.target.value)
                                        }
                                    >
                                        <option value="">
                                            Select a category
                                        </option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.category_id && (
                                        <p className="text-xs text-destructive">
                                            {errors.category_id}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sku">SKU</Label>
                                    <div className="relative">
                                        <Input
                                            id="sku"
                                            value={data.sku}
                                            onChange={(e) =>
                                                setData('sku', e.target.value)
                                            }
                                            maxLength={100}
                                            disabled={skuLocked}
                                            className={
                                                skuLocked ? 'bg-muted/50' : ''
                                            }
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSkuLocked(!skuLocked)
                                            }
                                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                            title={
                                                skuLocked
                                                    ? 'Unlock to edit manually'
                                                    : 'Lock SKU'
                                            }
                                        >
                                            {skuLocked ? (
                                                <Lock className="size-4" />
                                            ) : (
                                                <Unlock className="size-4" />
                                            )}
                                        </button>
                                    </div>
                                    {skuPreview && data.sku !== skuPreview && (
                                        <p className="text-xs text-muted-foreground">
                                            Preview: {skuPreview}
                                        </p>
                                    )}
                                    {!skuLocked &&
                                        data.category_id &&
                                        data.name && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleGenerateSku}
                                                disabled={generatingSku}
                                                className="w-full"
                                                title="Auto-generate SKU from category + product name"
                                            >
                                                <RefreshCw
                                                    className={`mr-1.5 size-3.5 ${generatingSku ? 'animate-spin' : ''}`}
                                                />
                                                {generatingSku
                                                    ? 'Generating...'
                                                    : 'Regenerate SKU'}
                                            </Button>
                                        )}
                                    {errors.sku && (
                                        <p className="text-xs text-destructive">
                                            {errors.sku}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Product name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) =>
                                        handleNameChange(e.target.value)
                                    }
                                    maxLength={255}
                                />
                                {errors.name && (
                                    <p className="text-xs text-destructive">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    placeholder="Product description..."
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-xs text-destructive">
                                        {errors.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <Checkbox
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) =>
                                        setData('is_active', checked === true)
                                    }
                                />
                                <Label
                                    htmlFor="is_active"
                                    className="cursor-pointer"
                                >
                                    Active — available for sales and orders
                                </Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pricing Section */}
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <DollarSign className="size-4" />
                                Pricing
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Base price and regional price overrides.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="base_price">Base price</Label>
                                <div className="relative">
                                    <DollarSign className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                                    <Input
                                        id="base_price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="pl-9"
                                        value={data.base_price}
                                        onChange={(e) =>
                                            setData(
                                                'base_price',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                {errors.base_price && (
                                    <p className="text-xs text-destructive">
                                        {errors.base_price}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Regional price overrides</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addRegionPrice}
                                    >
                                        <Plus className="mr-1.5 size-3.5" />
                                        Add Override
                                    </Button>
                                </div>

                                {data.region_prices.map((rp, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-2"
                                    >
                                        <div className="flex-1 space-y-2">
                                            <select
                                                className={selectClass}
                                                value={rp.region_id}
                                                onChange={(e) =>
                                                    updateRegionPrice(
                                                        index,
                                                        'region_id',
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    Select region
                                                </option>
                                                {regions.map((region) => (
                                                    <option
                                                        key={region.id}
                                                        value={region.id}
                                                    >
                                                        {region.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="relative">
                                                <DollarSign className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="pl-9"
                                                    placeholder="Override price (optional)"
                                                    value={rp.price_override}
                                                    onChange={(e) =>
                                                        updateRegionPrice(
                                                            index,
                                                            'price_override',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="mt-6 text-destructive hover:text-destructive"
                                            onClick={() =>
                                                removeRegionPrice(index)
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Variants Section */}
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Layers className="size-4" />
                                Variants
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Product variants like sizes, colors, or other
                                options.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="flex items-center justify-between">
                                <Label>Product variants</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addVariant}
                                >
                                    <Plus className="mr-1.5 size-3.5" />
                                    Add Variant
                                </Button>
                            </div>

                            {errors.variants && (
                                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                    {errors.variants}
                                </p>
                            )}

                            {data.variants.map((variant, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-3 items-start gap-3"
                                >
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor={`variant-name-${index}`}
                                        >
                                            Variant name
                                        </Label>
                                        <Input
                                            id={`variant-name-${index}`}
                                            value={variant.variant_name}
                                            onChange={(e) =>
                                                handleVariantNameChange(
                                                    index,
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="e.g. Size L / Red"
                                            maxLength={255}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`variant-sku-${index}`}>
                                            SKU suffix
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id={`variant-sku-${index}`}
                                                value={
                                                    variant.sku_suffix ||
                                                    variantPreview[index]
                                                }
                                                onChange={(e) =>
                                                    updateVariant(
                                                        index,
                                                        'sku_suffix',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g. -L"
                                                maxLength={50}
                                                disabled={
                                                    variantLocked[index] &&
                                                    !variant.sku_suffix
                                                }
                                                className={
                                                    variantLocked[index] &&
                                                    !variant.sku_suffix
                                                        ? 'bg-muted/50'
                                                        : ''
                                                }
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newLocked = [
                                                        ...variantLocked,
                                                    ];
                                                    newLocked[index] =
                                                        !newLocked[index];
                                                    setVariantLocked(newLocked);
                                                }}
                                                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                title={
                                                    variantLocked[index]
                                                        ? 'Unlock to edit manually'
                                                        : 'Lock suffix'
                                                }
                                            >
                                                {variantLocked[index] ? (
                                                    <Lock className="size-4" />
                                                ) : (
                                                    <Unlock className="size-4" />
                                                )}
                                            </button>
                                        </div>
                                        {variantPreview[index] &&
                                            !variant.sku_suffix && (
                                                <p className="text-xs text-muted-foreground">
                                                    Preview:{' '}
                                                    {variantPreview[index]}
                                                </p>
                                            )}
                                        {!variantLocked[index] &&
                                            variant.variant_name && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleGenerateVariantSuffix(
                                                            index,
                                                        )
                                                    }
                                                    className="w-full"
                                                    title="Auto-generate suffix from variant name"
                                                >
                                                    <RefreshCw className="mr-1.5 size-3.5" />
                                                    Generate
                                                </Button>
                                            )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor={`variant-price-${index}`}
                                        >
                                            Price delta
                                        </Label>
                                        <div className="relative">
                                            <DollarSign className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                                            <Input
                                                id={`variant-price-${index}`}
                                                type="number"
                                                step="0.01"
                                                className="pl-9"
                                                value={variant.price_delta}
                                                onChange={(e) =>
                                                    updateVariant(
                                                        index,
                                                        'price_delta',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        {data.variants.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="w-full text-destructive hover:text-destructive"
                                                onClick={() =>
                                                    removeVariant(index)
                                                }
                                            >
                                                <Trash2 className="mr-1.5 size-3.5" />
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Images Section */}
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Image className="size-4" />
                                Images
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Product images (feature coming soon).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            {product.images.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {product.images.map((image) => (
                                        <div
                                            key={image.id}
                                            className="relative aspect-square overflow-hidden rounded-lg border border-border/60"
                                        >
                                            <img
                                                src={image.url}
                                                alt={
                                                    image.alt_text ??
                                                    product.name
                                                }
                                                className="h-full w-full object-cover"
                                            />
                                            {image.is_primary && (
                                                <span className="absolute top-1 left-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-medium text-primary-foreground">
                                                    Primary
                                                </span>
                                            )}
                                            <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                                                {!image.is_primary && (
                                                    <button
                                                        type="button"
                                                        title="Make primary"
                                                        className="flex size-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground hover:text-primary"
                                                        onClick={() =>
                                                            router.post(
                                                                `/admin/products/${product.id}/images/${image.id}/primary`,
                                                                {},
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            )
                                                        }
                                                    >
                                                        <Star className="size-3" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    title="Remove image"
                                                    className="ml-auto flex size-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground hover:text-destructive"
                                                    onClick={() =>
                                                        router.delete(
                                                            `/admin/products/${product.id}/images/${image.id}`,
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/40">
                                <UploadCloud className="size-6 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                    Add more images
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    JPG, PNG or WebP · up to 5 MB each
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="sr-only"
                                    onChange={(event) => {
                                        const files = Array.from(
                                            event.target.files ?? [],
                                        );
                                        setData('images', files);
                                        setImagePreviews(
                                            files.map((file) =>
                                                URL.createObjectURL(file),
                                            ),
                                        );
                                    }}
                                />
                            </label>
                            {imagePreviews.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {imagePreviews.map((preview, index) => (
                                        <div
                                            key={preview}
                                            className="relative aspect-square overflow-hidden rounded-lg border border-border/60"
                                        >
                                            <img
                                                src={preview}
                                                alt={`New product image ${index + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground"
                                                onClick={() => {
                                                    const next =
                                                        data.images.filter(
                                                            (_, i) =>
                                                                i !== index,
                                                        );
                                                    setData('images', next);
                                                    setImagePreviews(
                                                        next.map((file) =>
                                                            URL.createObjectURL(
                                                                file,
                                                            ),
                                                        ),
                                                    );
                                                }}
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {errors.images && (
                                <p className="text-xs text-destructive">
                                    {errors.images}
                                </p>
                            )}
                            {Object.entries(errors)
                                .filter(([key]) => key.startsWith('images.'))
                                .map(([key, value]) => (
                                    <p
                                        key={key}
                                        className="text-xs text-destructive"
                                    >
                                        {value}
                                    </p>
                                ))}
                        </CardContent>
                    </Card>

                    {/* Stock Section */}
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Box className="size-4" />
                                Stock
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Inventory management (feature coming soon).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <p className="text-sm text-muted-foreground">
                                Stock levels will be managed in the Inventory
                                module.
                            </p>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Link href={adminproducts.index().url}>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Saving…' : 'Save changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

AdminProductEdit.layout = {
    breadcrumbs: [
        { title: 'Products', href: adminproducts.index().url },
        { title: 'Edit', href: '#' },
    ],
};
