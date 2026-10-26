import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PackageSearch, Search, ScanLine } from 'lucide-react';
import type { RefObject } from 'react';
import type { PosCategory, PosProduct } from '@/types/pos';
import { formatMoney } from './money';

function StockDot({ stock }: { stock: number }) {
    if (stock <= 0) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-void/40 bg-void/10 px-1.5 py-0.5 text-[10px] font-medium text-void">
                <span className="size-1.5 rounded-full bg-void" />
                Out
            </span>
        );
    }

    if (stock <= 5) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-hold/40 bg-hold/10 px-1.5 py-0.5 text-[10px] font-medium text-hold">
                <span className="size-1.5 rounded-full bg-hold" />
                Low · {stock}
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-pay/30 bg-pay/10 px-1.5 py-0.5 text-[10px] font-medium text-pay">
            <span className="size-1.5 rounded-full bg-pay" />
            {stock}
        </span>
    );
}

function ProductTile({
    product,
    currency,
    disabled,
    onAdd,
}: {
    product: PosProduct;
    currency: string;
    disabled: boolean;
    onAdd: (product: PosProduct) => void;
}) {
    const outOfStock = product.stock <= 0;

    return (
        <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={disabled || outOfStock}
            className={cn(
                'group relative flex min-h-[128px] flex-col justify-between rounded-xl border border-border/70 bg-card p-3 text-left transition-colors',
                'hover:border-primary/50 hover:bg-tile-hover focus-visible:border-primary focus-visible:outline-none',
                'active:bg-tile-active disabled:cursor-not-allowed disabled:opacity-45',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="size-9 rounded-lg object-cover"
                    />
                ) : (
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-[11px] font-semibold tracking-wide text-muted-foreground">
                        {product.name.slice(0, 2).toUpperCase()}
                    </div>
                )}
                <StockDot stock={product.stock} />
            </div>

            <div className="mt-3 space-y-1">
                <p className="line-clamp-2 text-[13px] leading-tight font-medium sm:text-sm">
                    {product.name}
                </p>
                <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-base text-foreground">
                        {formatMoney(product.price)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {product.variants.length > 1
                            ? `${product.variants.length} variants`
                            : (product.variants[0]?.name ?? '')}
                    </span>
                </div>
            </div>

            {outOfStock && (
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/55 text-[11px] font-semibold tracking-wide text-void uppercase">
                    Out of stock
                </span>
            )}

            <span className="pointer-events-none absolute right-2 bottom-2 hidden font-mono text-[10px] text-muted-foreground group-hover:block">
                {currency}
            </span>
        </button>
    );
}

export function ProductGrid({
    products,
    categories,
    search,
    onSearchChange,
    onSearchSubmit,
    categoryId,
    onCategoryChange,
    onAdd,
    disabled,
    currency,
    inputRef,
}: {
    products: PosProduct[];
    categories: PosCategory[];
    search: string;
    onSearchChange: (value: string) => void;
    onSearchSubmit: () => void;
    categoryId: number | 'all';
    onCategoryChange: (id: number | 'all') => void;
    onAdd: (product: PosProduct) => void;
    disabled: boolean;
    currency: string;
    inputRef?: RefObject<HTMLInputElement | null>;
}) {
    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            onSearchSubmit();
                        }
                    }}
                    placeholder="Scan barcode or search product…"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-11 bg-card pr-20 pl-9 text-base"
                />
                <div className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 text-[10px] text-muted-foreground">
                    <ScanLine className="size-3.5" />
                    scan / enter
                </div>
            </div>

            <div className="-mx-1 no-scrollbar flex gap-1.5 overflow-x-auto px-1 pb-0.5">
                <button
                    type="button"
                    onClick={() => onCategoryChange('all')}
                    className={cn(
                        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        categoryId === 'all'
                            ? 'border-primary/40 bg-primary/15 text-primary'
                            : 'border-border/70 bg-card text-muted-foreground hover:text-foreground',
                    )}
                >
                    All
                </button>
                {categories.map((category) => (
                    <button
                        key={category.id}
                        type="button"
                        onClick={() => onCategoryChange(category.id)}
                        className={cn(
                            'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                            categoryId === category.id
                                ? 'border-primary/40 bg-primary/15 text-primary'
                                : 'border-border/70 bg-card text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {category.name}
                    </button>
                ))}
            </div>

            <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto pr-1">
                {products.length === 0 ? (
                    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 text-center">
                        <PackageSearch className="size-8 text-muted-foreground/60" />
                        <p className="text-sm font-medium">No products found</p>
                        <p className="max-w-[260px] text-xs text-muted-foreground">
                            Try another search, or add active products with a
                            stock level in the back-office.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2.5 pb-2 md:grid-cols-3 2xl:grid-cols-4">
                        {products.map((product) => (
                            <ProductTile
                                key={product.id}
                                product={product}
                                currency={currency}
                                disabled={disabled}
                                onAdd={onAdd}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
