import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    MessageCircle,
    PackageCheck,
    Sparkles,
    Truck,
} from 'lucide-react';
import { ShopProductCard } from '@/components/shop/product-card';
import type { ShopBranch, ShopProduct } from '@/types/shop';

export default function ShopLanding({
    branch,
    products,
}: {
    branch: ShopBranch;
    products: ShopProduct[];
}) {
    return (
        <>
            <Head title="CWSPOS Shop" />

            <section className="relative overflow-hidden border-b border-border/60">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,var(--primary),transparent_45%)] opacity-[0.08]" />
                <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
                    <div className="max-w-xl space-y-5">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] text-primary">
                            <Sparkles className="size-3" />
                            Shop smart. Ask anything.
                        </div>
                        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                            Everyday essentials, picked from the shelf.
                        </h1>
                        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                            Browse the shelves at {branch.name}, build a cart in
                            seconds, and pay with M-Pesa. Need help? The shop
                            assistant can find products and build your cart for
                            you.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href="/shop"
                                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                                Start shopping
                                <ArrowRight className="size-4" />
                            </Link>
                            <Link
                                href="/shop/assistant"
                                className="inline-flex items-center gap-2 rounded-full border border-border/80 px-4 py-2.5 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                            >
                                <MessageCircle className="size-4 text-primary" />
                                Ask the assistant
                            </Link>
                        </div>
                        <div className="flex flex-wrap gap-4 pt-2 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                                <BadgeCheck className="size-3.5 text-primary" />{' '}
                                Real shelf stock
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <PackageCheck className="size-3.5 text-primary" />{' '}
                                {branch.name} pickup
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Truck className="size-3.5 text-primary" /> Fast
                                checkout
                            </span>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.55)]">
                        <p className="text-[10px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                            This week at the shop
                        </p>
                        <div className="mt-4 space-y-3">
                            {products.slice(0, 3).map((product) => (
                                <Link
                                    key={product.id}
                                    href={`/shop/product/${product.id}`}
                                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-2.5 transition-colors hover:border-primary/40"
                                >
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="size-10 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                                            {product.name.slice(0, 1)}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium">
                                            {product.name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {product.stock > 0
                                                ? 'In stock'
                                                : 'Out of stock'}
                                        </p>
                                    </div>
                                    <span className="font-mono text-xs font-semibold">
                                        {product.currency}{' '}
                                        {product.price.toFixed(2)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                        <Link
                            href="/shop"
                            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                            Browse all products{' '}
                            <ArrowRight className="size-3" />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
                <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                            Fresh picks
                        </p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight">
                            Popular on the shelf
                        </h2>
                    </div>
                    <Link
                        href="/shop"
                        className="text-xs text-primary hover:underline"
                    >
                        See all
                    </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                        <ShopProductCard key={product.id} product={product} />
                    ))}
                </div>
            </section>
        </>
    );
}
