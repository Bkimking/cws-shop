import { Head, Link, router } from '@inertiajs/react';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import { formatShopMoney } from '@/components/shop/money';
import type { ShopBranch, ShopLine, ShopTotals } from '@/types/shop';

function CartLine({ line, currency }: { line: ShopLine; currency: string }) {
    const form = useForm({ quantity: line.quantity });

    const setQuantity = (quantity: number) => {
        if (quantity < 0 || quantity > line.available) return;
        form.setData('quantity', quantity);
        form.patch(`/shop/cart/${line.variant_id}`, { preserveScroll: true });
    };

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                {line.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{line.name}</p>
                <p className="text-[11px] text-muted-foreground">{line.variant} · {line.sku}</p>
            </div>
            <div className="flex items-center rounded-lg border border-border/70">
                <button type="button" onClick={() => setQuantity(line.quantity - 1)} className="p-1.5"><Minus className="size-3.5" /></button>
                <span className="w-7 text-center font-mono text-xs">{line.quantity}</span>
                <button type="button" onClick={() => setQuantity(line.quantity + 1)} className="p-1.5"><Plus className="size-3.5" /></button>
            </div>
            <span className="w-24 text-right font-mono text-sm font-semibold">
                {formatShopMoney(line.line_total, currency)}
            </span>
            <button
                type="button"
                aria-label={`Remove ${line.name}`}
                onClick={() => router.delete(`/shop/cart/${line.variant_id}`, { preserveScroll: true })}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
                <Trash2 className="size-4" />
            </button>
        </div>
    );
}

export default function ShopCart({
    branch,
    lines,
    totals,
}: {
    branch: ShopBranch;
    lines: ShopLine[];
    totals: ShopTotals;
}) {
    return (
        <>
            <Head title="Your cart" />
            <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
                <div className="mb-6">
                    <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">{branch.name}</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your cart</h1>
                </div>

                {lines.length === 0 ? (
                    <div className="rounded-3xl border border-border/70 bg-card py-20 text-center">
                        <ShoppingBag className="mx-auto size-8 text-muted-foreground" />
                        <p className="mt-3 text-sm font-medium">Your cart is empty.</p>
                        <Link href="/shop" className="mt-2 inline-block text-xs text-primary hover:underline">Start shopping</Link>
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
                        <div className="space-y-2">
                            {lines.map((line) => (
                                <CartLine key={line.variant_id} line={line} currency={totals.currency} />
                            ))}
                        </div>

                        <aside className="rounded-2xl border border-border/70 bg-card p-5">
                            <h2 className="text-sm font-semibold">Order summary</h2>
                            <div className="mt-4 space-y-2 text-xs">
                                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="font-mono text-foreground">{formatShopMoney(totals.subtotal, totals.currency)}</span></div>
                                <div className="flex justify-between text-muted-foreground"><span>Tax (incl.)</span><span className="font-mono text-foreground">{formatShopMoney(totals.tax, totals.currency)}</span></div>
                                <div className="flex justify-between border-t border-border/60 pt-2 text-sm font-semibold"><span>Total</span><span className="font-mono">{formatShopMoney(totals.total, totals.currency)}</span></div>
                            </div>
                            <Link href="/shop/checkout" className="mt-5 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                                Continue to checkout
                            </Link>
                            <Link href="/shop" className="mt-3 block text-center text-[11px] text-muted-foreground hover:text-foreground">Keep shopping</Link>
                        </aside>
                    </div>
                )}
            </div>
        </>
    );
}
