import { Head, Link, useForm } from '@inertiajs/react';
import { Check, LockKeyhole, Smartphone } from 'lucide-react';
import { formatShopMoney } from '@/components/shop/money';
import type { ShopBranch, ShopLine, ShopTotals } from '@/types/shop';

export default function ShopCheckout({
    branch,
    lines,
    totals,
    pickups,
    selectedPickupId,
    mpesaEnabled,
}: {
    branch: ShopBranch;
    lines: ShopLine[];
    totals: ShopTotals;
    pickups: Array<{
        id: number;
        name: string;
        branch: string;
        address: string | null;
        phone: string | null;
    }>;
    selectedPickupId: number;
    mpesaEnabled: boolean;
    paypalEnabled: boolean;
}) {
    const form = useForm({
        name: '',
        phone: '',
        email: '',
        pickup_warehouse_id: String(selectedPickupId),
        payment_method: 'mpesa',
        notes: '',
    });
    const selectedPickup = pickups.find(
        (pickup) => String(pickup.id) === form.data.pickup_warehouse_id,
    );

    return (
        <>
            <Head title="Checkout" />
            <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
                <div className="mb-6">
                    <Link
                        href="/shop/cart"
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        ← Back to cart
                    </Link>
                    <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                        Checkout
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Pickup at {branch.name}. {branch.address}
                    </p>
                </div>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post('/shop/checkout');
                    }}
                    className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start"
                >
                    <div className="space-y-5">
                        <section className="rounded-2xl border border-border/70 bg-card p-5">
                            <h2 className="text-sm font-semibold">
                                Your details
                            </h2>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <label className="space-y-1.5 text-xs">
                                    <span className="font-medium">
                                        Full name
                                    </span>
                                    <input
                                        value={form.data.name}
                                        onChange={(event) =>
                                            form.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                                        placeholder="Your name"
                                    />
                                    {form.errors.name && (
                                        <span className="text-destructive">
                                            {form.errors.name}
                                        </span>
                                    )}
                                </label>
                                <label className="space-y-1.5 text-xs">
                                    <span className="font-medium">
                                        Phone (M-Pesa)
                                    </span>
                                    <input
                                        value={form.data.phone}
                                        onChange={(event) =>
                                            form.setData(
                                                'phone',
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                                        placeholder="0712 345 678"
                                    />
                                    {form.errors.phone && (
                                        <span className="text-destructive">
                                            {form.errors.phone}
                                        </span>
                                    )}
                                </label>
                                <label className="space-y-1.5 text-xs sm:col-span-2">
                                    <span className="font-medium">
                                        Email for the pickup notification
                                    </span>
                                    <input
                                        type="email"
                                        value={form.data.email}
                                        onChange={(event) =>
                                            form.setData(
                                                'email',
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                                        placeholder="you@example.com"
                                    />
                                    {form.errors.email && (
                                        <span className="text-destructive">
                                            {form.errors.email}
                                        </span>
                                    )}
                                </label>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-border/70 bg-card p-5">
                            <h2 className="text-sm font-semibold">
                                Pickup point
                            </h2>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                Choose the warehouse closest to you. Your items
                                are prepared there and you collect them — no
                                shipping.
                            </p>
                            <select
                                value={form.data.pickup_warehouse_id}
                                onChange={(event) =>
                                    form.setData(
                                        'pickup_warehouse_id',
                                        event.target.value,
                                    )
                                }
                                className="mt-3 w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                            >
                                {pickups.map((pickup) => (
                                    <option
                                        key={pickup.id}
                                        value={String(pickup.id)}
                                    >
                                        {pickup.name} · {pickup.branch}
                                    </option>
                                ))}
                            </select>
                            {form.errors.pickup_warehouse_id && (
                                <p className="mt-1 text-[11px] text-destructive">
                                    {form.errors.pickup_warehouse_id}
                                </p>
                            )}
                            {selectedPickup && (
                                <div className="mt-3 rounded-xl bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                                    <p className="font-medium text-foreground">
                                        {selectedPickup.name}
                                    </p>
                                    <p>
                                        {selectedPickup.address ??
                                            'Pickup at the branch'}
                                    </p>
                                    {selectedPickup.phone && (
                                        <p>{selectedPickup.phone}</p>
                                    )}
                                </div>
                            )}
                            {pickups.length === 0 && (
                                <p className="mt-2 text-[11px] text-destructive">
                                    No pickup warehouse is configured for this
                                    branch.
                                </p>
                            )}
                        </section>

                        <section className="rounded-2xl border border-border/70 bg-card p-5">
                            <h2 className="text-sm font-semibold">Pay with</h2>
                            <div className="mt-4 grid gap-2">
                                <button
                                    type="button"
                                    disabled={!mpesaEnabled}
                                    onClick={() =>
                                        form.setData('payment_method', 'mpesa')
                                    }
                                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${form.data.payment_method === 'mpesa' ? 'border-primary/50 bg-primary/10' : 'border-border/70 hover:border-primary/30'} disabled:cursor-not-allowed disabled:opacity-40`}
                                >
                                    <Smartphone className="size-5 text-primary" />
                                    <span className="flex-1">
                                        <span className="block text-sm font-medium">
                                            M-Pesa STK push
                                        </span>
                                        <span className="block text-[11px] text-muted-foreground">
                                            A prompt is sent to your phone.
                                        </span>
                                    </span>
                                    {form.data.payment_method === 'mpesa' && (
                                        <Check className="size-4 text-primary" />
                                    )}
                                </button>

                                <button
                                    type="button"
                                    disabled
                                    className="flex items-center gap-3 rounded-xl border border-border/50 p-3 text-left opacity-45"
                                >
                                    <span className="flex size-5 items-center justify-center rounded-full border border-border text-[8px] font-bold">
                                        P
                                    </span>
                                    <span className="flex-1">
                                        <span className="block text-sm font-medium">
                                            PayPal
                                        </span>
                                        <span className="block text-[11px] text-muted-foreground">
                                            Muted for now. Use M-Pesa.
                                        </span>
                                    </span>
                                </button>
                            </div>
                            {!mpesaEnabled && (
                                <p className="mt-3 text-[11px] text-destructive">
                                    M-Pesa sandbox is not configured. Add
                                    MPESA_* keys in .env.
                                </p>
                            )}
                            {form.errors.payment_method && (
                                <p className="mt-2 text-[11px] text-destructive">
                                    {form.errors.payment_method}
                                </p>
                            )}
                        </section>

                        <section className="rounded-2xl border border-border/70 bg-card p-5">
                            <h2 className="text-sm font-semibold">Notes</h2>
                            <textarea
                                value={form.data.notes}
                                onChange={(event) =>
                                    form.setData('notes', event.target.value)
                                }
                                rows={3}
                                className="mt-3 w-full resize-none rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                                placeholder="Pickup instructions, landmarks, etc."
                            />
                        </section>
                    </div>

                    <aside className="rounded-2xl border border-border/70 bg-card p-5">
                        <h2 className="text-sm font-semibold">Order summary</h2>
                        <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
                            {lines.map((line) => (
                                <div
                                    key={line.variant_id}
                                    className="flex justify-between gap-2 text-xs"
                                >
                                    <span className="min-w-0 truncate text-muted-foreground">
                                        {line.quantity} × {line.name}
                                    </span>
                                    <span className="shrink-0 font-mono">
                                        {formatShopMoney(
                                            line.line_total,
                                            totals.currency,
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 space-y-2 border-t border-border/60 pt-3 text-xs">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span className="font-mono text-foreground">
                                    {formatShopMoney(
                                        totals.subtotal,
                                        totals.currency,
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Tax (incl.)</span>
                                <span className="font-mono text-foreground">
                                    {formatShopMoney(
                                        totals.tax,
                                        totals.currency,
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm font-semibold">
                                <span>Total</span>
                                <span className="font-mono">
                                    {formatShopMoney(
                                        totals.total,
                                        totals.currency,
                                    )}
                                </span>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={form.processing || !mpesaEnabled}
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <LockKeyhole className="size-4" />
                            {form.processing
                                ? 'Sending STK…'
                                : 'Place order & pay'}
                        </button>
                        <p className="mt-2 text-center text-[10px] text-muted-foreground">
                            Payment is confirmed by M-Pesa. Do not close the
                            next page.
                        </p>
                    </aside>
                </form>
            </div>
        </>
    );
}
