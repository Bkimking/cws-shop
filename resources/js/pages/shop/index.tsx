import { Head, Link } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { ShopProductCard } from '@/components/shop/product-card';
import type { ShopBranch, ShopProduct } from '@/types/shop';

export default function ShopIndex({
    branch,
    products,
    categories,
    filters,
}: {
    branch: ShopBranch;
    products: ShopProduct[];
    categories: string[];
    filters: { q: string; category: string | null };
}) {
    return (
        <>
            <Head title="Shop" />
            <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
                <div className="flex flex-col gap-5 border-b border-border/60 pb-8 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">{branch.name}</p>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">The shelf</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {products.length} products available for pickup.
                        </p>
                    </div>
                    <form action="/shop" method="get" className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-border/70 bg-card p-1.5">
                        <Search className="ml-2 size-4 text-muted-foreground" />
                        <input
                            name="q"
                            defaultValue={filters.q}
                            placeholder="Search products…"
                            className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none"
                        />
                        <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                            Search
                        </button>
                    </form>
                </div>

                <div className="mt-6 flex flex-wrap gap-1.5">
                    <Link
                        href="/shop"
                        className={`rounded-full border px-3 py-1.5 text-[11px] ${!filters.category ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:text-foreground'}`}
                    >
                        All
                    </Link>
                    {categories.map((category) => (
                        <Link
                            key={category}
                            href={`/shop?category=${encodeURIComponent(category)}`}
                            className={`rounded-full border px-3 py-1.5 text-[11px] ${filters.category === category ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:text-foreground'}`}
                        >
                            {category}
                        </Link>
                    ))}
                </div>

                {products.length === 0 ? (
                    <div className="py-20 text-center">
                        <p className="text-sm font-medium">Nothing on this shelf yet.</p>
                        <Link href="/shop" className="mt-2 inline-block text-xs text-primary hover:underline">Clear filters</Link>
                    </div>
                ) : (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {products.map((product) => <ShopProductCard key={product.id} product={product} />)}
                    </div>
                )}
            </div>
        </>
    );
}
