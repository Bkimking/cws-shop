import { Button } from '@/components/ui/button';
import {
    Lock,
    Minus,
    Plus,
    ShoppingCart,
    Trash2,
    UserRound,
} from 'lucide-react';
import type { CartLine } from '@/types/pos';
import { formatMoney } from './money';

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <span className="text-[color:var(--paper-ink-muted)]">{label}</span>
            <span>{value}</span>
        </div>
    );
}

export function CartPanel({
    lines,
    totals,
    taxRate,
    currency,
    tillOpen,
    canDiscount,
    onIncrement,
    onDecrement,
    onRemove,
    onClear,
    onCharge,
}: {
    lines: CartLine[];
    totals: { subtotal: number; tax: number; total: number };
    taxRate: number;
    currency: string;
    tillOpen: boolean;
    canDiscount: boolean;
    onIncrement: (variantId: number) => void;
    onDecrement: (variantId: number) => void;
    onRemove: (variantId: number) => void;
    onClear: () => void;
    onCharge: () => void;
}) {
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

    return (
        <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="receipt receipt-edge flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-dashed border-[color:var(--paper-rule)] px-4 py-3">
                    <div>
                        <div className="text-[10px] tracking-[0.16em] text-[color:var(--paper-ink-muted)] uppercase">
                            Current sale
                        </div>
                        <div className="text-sm font-semibold">
                            {itemCount} item{itemCount === 1 ? '' : 's'}
                        </div>
                    </div>
                    {lines.length > 0 ? (
                        <button
                            type="button"
                            onClick={onClear}
                            className="rounded-md px-2 py-1 text-[11px] text-[color:var(--paper-ink-muted)] transition-colors hover:bg-black/5"
                        >
                            Clear
                        </button>
                    ) : (
                        <ShoppingCart className="size-4 text-[color:var(--paper-ink-muted)]" />
                    )}
                </div>

                <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto px-4 py-3">
                    {lines.length === 0 ? (
                        <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center">
                            <ShoppingCart className="size-7 text-[color:var(--paper-ink-muted)]/60" />
                            <p className="text-sm font-medium">Cart is empty</p>
                            <p className="max-w-[190px] text-[11px] text-[color:var(--paper-ink-muted)]">
                                Scan a barcode or tap a product to start the
                                sale.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {lines.map((line) => (
                                <div key={line.variant_id}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-medium">
                                                {line.name}
                                            </p>
                                            <p className="text-[10px] text-[color:var(--paper-ink-muted)]">
                                                {line.variant} ·{' '}
                                                {formatMoney(line.price)}
                                            </p>
                                        </div>
                                        <div className="text-right text-[13px] font-medium">
                                            {formatMoney(
                                                line.price * line.quantity,
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        <div className="flex items-center rounded-md border border-[color:var(--paper-rule)]/70">
                                            <button
                                                type="button"
                                                aria-label={`Decrease ${line.name}`}
                                                onClick={() =>
                                                    onDecrement(line.variant_id)
                                                }
                                                className="flex size-8 items-center justify-center text-[color:var(--paper-ink-muted)] transition-colors hover:bg-black/5"
                                            >
                                                <Minus className="size-4" />
                                            </button>
                                            <span className="w-7 text-center font-mono text-[12px]">
                                                {line.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                aria-label={`Increase ${line.name}`}
                                                onClick={() =>
                                                    onIncrement(line.variant_id)
                                                }
                                                className="flex size-8 items-center justify-center text-[color:var(--paper-ink-muted)] transition-colors hover:bg-black/5"
                                            >
                                                <Plus className="size-4" />
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            aria-label={`Remove ${line.name}`}
                                            onClick={() =>
                                                onRemove(line.variant_id)
                                            }
                                            className="rounded-md p-1.5 text-[color:var(--paper-ink-muted)] transition-colors hover:bg-[color:var(--void)]/10 hover:text-[color:var(--void)]"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>

                                    <hr className="receipt-rule mt-2.5" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-1 border-t border-dashed border-[color:var(--paper-rule)] px-4 py-3 text-[13px]">
                    <SummaryRow
                        label="Subtotal (excl. VAT)"
                        value={formatMoney(totals.subtotal)}
                    />
                    <SummaryRow
                        label={`VAT ${taxRate}%`}
                        value={formatMoney(totals.tax)}
                    />
                    <div className="mt-2 flex items-baseline justify-between border-t border-dashed border-[color:var(--paper-rule)] pt-2">
                        <span className="text-sm font-semibold">Total</span>
                        <span className="font-mono text-xl font-semibold">
                            {currency} {formatMoney(totals.total)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Button
                    type="button"
                    onClick={onCharge}
                    disabled={!tillOpen || lines.length === 0}
                    className="h-14 w-full rounded-xl bg-pay text-base font-semibold text-pay-foreground shadow-none hover:opacity-90 disabled:opacity-40"
                >
                    Charge {currency} {formatMoney(totals.total)}
                </Button>

                <div className="grid grid-cols-3 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled
                        title="Held carts are coming next."
                        className="h-9 text-[11px]"
                    >
                        Hold
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled
                        title={
                            canDiscount
                                ? 'Discounts are coming next.'
                                : 'You do not have the apply discounts permission.'
                        }
                        className="h-9 gap-1 text-[11px]"
                    >
                        {!canDiscount && <Lock className="size-3" />}
                        Discount
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled
                        title="Customer picker is coming next."
                        className="h-9 gap-1 text-[11px]"
                    >
                        <UserRound className="size-3" />
                        Walk-in
                    </Button>
                </div>
            </div>
        </div>
    );
}
