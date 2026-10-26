import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock3,
    Loader2,
    RefreshCw,
    XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { formatShopMoney } from '@/components/shop/money';
import type { ShopOrder } from '@/types/shop';

export default function ShopOrderPage({
    order: initialOrder,
}: {
    order: ShopOrder;
}) {
    const [order, setOrder] = useState(initialOrder);
    const [refreshing, setRefreshing] = useState(false);
    const announcedReady = useRef(false);

    const ready =
        order.status === 'completed' && order.pickup_status === 'ready';
    const collected = order.pickup_status === 'collected';

    useEffect(() => {
        if (!ready || announcedReady.current) return;

        announcedReady.current = true;
        toast.success(
            order.pickup
                ? `Your items are ready at ${order.pickup.name}.`
                : 'Your items are ready for pickup.',
        );
    }, [order.pickup, ready]);

    useEffect(() => {
        if (order.status !== 'pending') return;

        const timer = window.setInterval(async () => {
            const response = await fetch(
                `/shop/orders/${order.public_token}/status`,
                {
                    headers: { Accept: 'application/json' },
                },
            );

            if (!response.ok) return;

            const data = (await response.json()) as { order: ShopOrder };

            if (data.order) {
                setOrder(data.order);
            }
        }, 3000);

        return () => window.clearInterval(timer);
    }, [order.public_token, order.status]);

    const paid = order.status === 'completed';
    const failed =
        order.status === 'cancelled' || order.payment_status === 'failed';
    const failureReason =
        order.payment?.failure_reason ??
        (failed
            ? 'The M-Pesa request was cancelled, expired or did not confirm.'
            : null);

    const refresh = async () => {
        setRefreshing(true);

        try {
            const response = await fetch(
                `/shop/orders/${order.public_token}/refresh`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN':
                            document.querySelector<HTMLMetaElement>(
                                'meta[name="csrf-token"]',
                            )?.content ?? '',
                    },
                },
            );
            const data = (await response.json()) as {
                message?: string;
                order?: ShopOrder;
            };

            if (data.order) {
                setOrder(data.order);
            }

            if (data.message) {
                toast.info(data.message);
            }
        } catch {
            toast.error('Could not refresh the payment status.');
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <>
            <Head title={`Order ${order.number}`} />
            <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 print:hidden">
                <div className="rounded-3xl border border-border/70 bg-card p-6 text-center">
                    <div
                        className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${paid ? 'bg-success/15 text-success' : failed ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}
                    >
                        {paid ? (
                            <CheckCircle2 className="size-7" />
                        ) : failed ? (
                            <XCircle className="size-7" />
                        ) : (
                            <Clock3 className="size-7" />
                        )}
                    </div>
                    <p className="mt-4 text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                        Order {order.number}
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                        {collected
                            ? 'Order collected'
                            : ready
                              ? 'Ready for pickup'
                              : paid
                                ? 'Preparing your order'
                                : failed
                                  ? 'Payment did not complete'
                                  : 'Check your phone'}
                    </h1>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                        {collected
                            ? 'This order has been collected. Thank you for shopping with us.'
                            : ready
                              ? `Your items are ready. Collect them at ${order.pickup?.name ?? order.branch?.name ?? 'the shop'}${order.customer_email ? ` — we emailed ${order.customer_email}` : ''}.`
                              : paid
                                ? `Payment confirmed. The team at ${order.pickup?.name ?? order.branch?.name ?? 'the shop'} is preparing your order; you will get an email when it is ready.`
                                : failed
                                  ? (failureReason ??
                                    'The M-Pesa request was cancelled or failed. Your stock has been released. You can try again.')
                                  : 'Approve the M-Pesa STK prompt on your phone. This page updates automatically. If you cancel the prompt, the stock is released.'}
                    </p>
                    <p className="mt-4 font-mono text-2xl font-semibold">
                        {formatShopMoney(order.total, order.currency)}
                    </p>
                </div>

                <div className="mt-4 rounded-2xl border border-border/70 bg-card p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                                Payment status
                            </p>
                            <p className="mt-1 text-sm font-medium capitalize">
                                {order.payment?.status ??
                                    order.payment_status ??
                                    'pending'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void refresh()}
                            disabled={refreshing}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                            {refreshing ? (
                                <Loader2 className="size-3 animate-spin" />
                            ) : (
                                <RefreshCw className="size-3" />
                            )}
                            {refreshing ? 'Checking…' : 'Refresh status'}
                        </button>
                    </div>
                    {order.payment?.expires_at &&
                        order.payment.status === 'pending' && (
                            <p className="mt-2 text-[11px] text-muted-foreground">
                                Payment expires{' '}
                                {new Date(
                                    order.payment.expires_at,
                                ).toLocaleTimeString()}
                                . If it is not approved, the order will be
                                cancelled and stock released.
                            </p>
                        )}
                    {order.payment?.last_checked_at && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            Last checked{' '}
                            {new Date(
                                order.payment.last_checked_at,
                            ).toLocaleString()}
                            .
                        </p>
                    )}
                    {failureReason && (
                        <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                            {failureReason}
                        </p>
                    )}
                    <div className="mt-4 grid gap-2 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                        <div className="flex justify-between gap-3">
                            <span>Order placed</span>
                            <span>
                                {new Date(
                                    order.created_at ?? Date.now(),
                                ).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span>Payment</span>
                            <span className="capitalize">
                                {order.payment?.status ??
                                    order.payment_status ??
                                    'pending'}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span>Pickup</span>
                            <span className="capitalize">
                                {order.pickup_status ?? 'pending'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 rounded-2xl border border-border/70 bg-card p-5">
                    <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                        Pickup point
                    </p>
                    <p className="mt-1 text-sm font-medium">
                        {order.pickup?.name ?? order.branch?.name ?? 'The shop'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {order.pickup?.address ?? order.branch?.address}
                    </p>
                    {order.pickup?.phone && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            {order.pickup.phone}
                        </p>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                        {collected
                            ? 'Collected — no further action needed.'
                            : ready
                              ? 'Bring your order number. Your items are packed at this pickup warehouse.'
                              : 'No shipping. The team will notify you when your items are ready.'}
                    </p>
                </div>

                <div className="mt-4 rounded-2xl border border-border/70 bg-card p-5">
                    <div className="space-y-2">
                        {order.items.map((item, index) => (
                            <div
                                key={index}
                                className="flex justify-between gap-3 text-xs"
                            >
                                <span className="text-muted-foreground">
                                    {item.quantity} × {item.name}{' '}
                                    {item.variant ? `· ${item.variant}` : ''}
                                </span>
                                <span className="font-mono">
                                    {formatShopMoney(
                                        item.line_total,
                                        order.currency,
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-between border-t border-border/60 pt-3 text-sm font-semibold">
                        <span>Total</span>
                        <span className="font-mono">
                            {formatShopMoney(order.total, order.currency)}
                        </span>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Link
                        href="/shop"
                        className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Keep shopping
                    </Link>
                    {failed && (
                        <button
                            type="button"
                            onClick={() =>
                                router.post(
                                    `/shop/orders/${order.public_token}/retry`,
                                )
                            }
                            className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            Try payment again
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded-full border border-border/70 px-4 py-2 text-xs text-foreground hover:bg-muted"
                    >
                        Print receipt
                    </button>
                    {paid && order.customer_email && (
                        <button
                            type="button"
                            onClick={() =>
                                router.post(
                                    `/shop/orders/${order.public_token}/email`,
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                            className="rounded-full border border-border/70 px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Email receipt
                        </button>
                    )}
                    <Link
                        href="/shop/assistant"
                        className="rounded-full border border-border/70 px-4 py-2 text-xs text-foreground hover:bg-muted"
                    >
                        Ask AI about this order
                    </Link>
                </div>
            </div>

            <div className="hidden p-8 text-black print:block">
                <div className="mx-auto max-w-2xl">
                    <div className="border-b border-black pb-4 text-center">
                        <h1 className="text-xl font-semibold">CWSPOS Shop</h1>
                        <p className="mt-1 text-xs">Pickup receipt</p>
                    </div>
                    <div className="mt-4 flex justify-between text-xs">
                        <span>Order {order.number}</span>
                        <span>
                            {new Date(
                                order.created_at ?? Date.now(),
                            ).toLocaleString()}
                        </span>
                    </div>
                    <div className="mt-4 text-xs">
                        <p className="font-semibold">Pickup point</p>
                        <p>{order.pickup?.name ?? order.branch?.name}</p>
                        <p>{order.pickup?.address ?? order.branch?.address}</p>
                        {order.pickup?.phone && <p>{order.pickup.phone}</p>}
                    </div>
                    <table className="mt-6 w-full text-xs">
                        <thead>
                            <tr className="border-b border-black text-left">
                                <th className="py-1">Item</th>
                                <th className="py-1 text-center">Qty</th>
                                <th className="py-1 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item, index) => (
                                <tr
                                    key={index}
                                    className="border-b border-neutral-300"
                                >
                                    <td className="py-1.5">
                                        {item.name}
                                        {item.variant
                                            ? ` · ${item.variant}`
                                            : ''}
                                    </td>
                                    <td className="py-1.5 text-center">
                                        {item.quantity}
                                    </td>
                                    <td className="py-1.5 text-right">
                                        {formatShopMoney(
                                            item.line_total,
                                            order.currency,
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-4 flex justify-between border-t border-black pt-2 text-sm font-semibold">
                        <span>Total</span>
                        <span>
                            {formatShopMoney(order.total, order.currency)}
                        </span>
                    </div>
                    <div className="mt-6 flex justify-between text-xs">
                        <span>
                            Payment:{' '}
                            {order.payment?.status ??
                                order.payment_status ??
                                'completed'}
                        </span>
                        <span>Pickup: {order.pickup_status ?? 'pending'}</span>
                    </div>
                    <p className="mt-8 text-center text-[10px]">
                        Bring this receipt or your order number when collecting.
                        No shipping.
                    </p>
                </div>
            </div>
        </>
    );
}
