import { Link } from '@inertiajs/react';
import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import type { ShopProduct } from '@/types/shop';
import { formatShopMoney } from './money';

export function ShopProductCard({ product }: { product: ShopProduct }) {
    const variant = product.variants.find((item) => item.available);
    const form = useForm({
        variant_id: variant?.id ?? product.variants[0]?.id ?? 0,
        quantity: 1,
    });

    const add = () => {
        if (!variant) return;

        form.post('/shop/cart/add', {
            preserveScroll: true,
            onSuccess: () => form.reset('quantity'),
        });
    };

    return (
        <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-colors hover:border-primary/40">
            <Link
                href={`/shop/product/${product.id}`}
                className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted/60"
            >
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-background/80 text-2xl font-semibold text-primary shadow-sm">
                        {product.name.slice(0, 1).toUpperCase()}
                    </div>
                )}
                {product.stock <= 0 && (
                    <span className="absolute top-3 right-3 rounded-full bg-background/90 px-2 py-1 text-[10px] text-muted-foreground">
                        Out of stock
                    </span>
                )}
            </Link>

            <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <Link
                            href={`/shop/product/${product.id}`}
                            className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary"
                        >
                            {product.name}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {product.category ?? 'General'} · {product.branch}
                        </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold">
                        {formatShopMoney(product.price, product.currency)}
                    </span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <span className="text-[11px] text-muted-foreground">
                        {product.stock <= 0
                            ? 'Out of stock'
                            : product.stock <= 5
                              ? 'Only a few left'
                              : 'In stock'}
                    </span>
                    <button
                        type="button"
                        onClick={add}
                        disabled={!variant || form.processing}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ShoppingBag className="size-3.5" />
                        Add
                    </button>
                </div>
            </div>
        </article>
    );
}

export function ShopProductLink({ product }: { product: ShopProduct }) {
    return (
        <Link
            href={`/shop/product/${product.id}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
            View product
            <ArrowUpRight className="size-3" />
        </Link>
    );
}
