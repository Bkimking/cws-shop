import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, ShoppingBag } from 'lucide-react';
import { formatShopMoney } from '@/components/shop/money';
import type { ShopBranch, ShopProduct } from '@/types/shop';

export default function ShopShow({
    branch,
    product,
}: {
    branch: ShopBranch;
    product: ShopProduct;
}) {
    const firstAvailable = product.variants.find(
        (variant) => variant.available,
    );
    const form = useForm({
        variant_id: firstAvailable?.id ?? product.variants[0]?.id ?? 0,
        quantity: 1,
    });
    const selected = product.variants.find(
        (variant) => variant.id === form.data.variant_id,
    );

    return (
        <>
            <Head title={product.name} />
            <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
                <Link
                    href="/shop"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-3.5" /> Back to shop
                </Link>

                <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
                    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-border/70 bg-muted/50">
                        {product.image_url ? (
                            <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex size-28 items-center justify-center rounded-3xl bg-background text-5xl font-semibold text-primary shadow-sm">
                                {product.name.slice(0, 1)}
                            </div>
                        )}
                    </div>

                    <div className="space-y-5">
                        <div>
                            <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                                {product.category ?? 'General'} · {branch.name}
                            </p>
                            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                                {product.name}
                            </h1>
                            <p className="mt-2 font-mono text-xl font-semibold">
                                {formatShopMoney(
                                    product.price,
                                    product.currency,
                                )}
                            </p>
                        </div>

                        {product.description && (
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {product.description}
                            </p>
                        )}

                        <div className="space-y-2">
                            <p className="text-xs font-medium">
                                Choose a variant
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {product.variants.map((variant) => (
                                    <button
                                        key={variant.id}
                                        type="button"
                                        disabled={!variant.available}
                                        onClick={() =>
                                            form.setData(
                                                'variant_id',
                                                variant.id,
                                            )
                                        }
                                        className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                                            form.data.variant_id === variant.id
                                                ? 'border-primary/50 bg-primary/10 text-foreground'
                                                : 'border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                                        } disabled:cursor-not-allowed disabled:opacity-40`}
                                    >
                                        <span className="block font-medium">
                                            {variant.name}
                                        </span>
                                        <span className="mt-0.5 block font-mono text-[10px]">
                                            {formatShopMoney(
                                                variant.price,
                                                product.currency,
                                            )}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center rounded-xl border border-border/70">
                                <button
                                    type="button"
                                    onClick={() =>
                                        form.setData(
                                            'quantity',
                                            Math.max(1, form.data.quantity - 1),
                                        )
                                    }
                                    className="px-3 py-2 text-sm"
                                >
                                    −
                                </button>
                                <span className="w-7 text-center font-mono text-sm">
                                    {form.data.quantity}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        form.setData(
                                            'quantity',
                                            form.data.quantity + 1,
                                        )
                                    }
                                    className="px-3 py-2 text-sm"
                                >
                                    +
                                </button>
                            </div>
                            <button
                                type="button"
                                disabled={
                                    !selected?.available || form.processing
                                }
                                onClick={() =>
                                    form.post('/shop/cart/add', {
                                        preserveScroll: true,
                                    })
                                }
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ShoppingBag className="size-4" />
                                Add to cart
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Check className="size-3.5 text-primary" />
                            {selected?.available
                                ? `Available at ${branch.name}`
                                : 'Currently out of stock'}
                        </div>

                        <Link
                            href="/shop/cart"
                            className="inline-block text-xs font-medium text-primary hover:underline"
                        >
                            Go to cart
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
