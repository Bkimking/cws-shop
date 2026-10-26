import { cn } from '@/lib/utils';
import type { PosReceipt } from '@/types/pos';
import { formatMoney } from './money';

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <span className="receipt-muted">{label}</span>
            <span>{value}</span>
        </div>
    );
}

export function Receipt({
    receipt,
    printable = false,
    className,
}: {
    receipt: PosReceipt;
    printable?: boolean;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'receipt receipt-edge px-5 py-4 text-[13px]',
                printable && 'receipt-print',
                className,
            )}
        >
            <div className="text-center">
                <div className="text-base font-semibold tracking-tight">
                    {receipt.branch.name}
                </div>
                {receipt.branch.address && (
                    <div className="receipt-muted text-[11px] leading-snug">
                        {receipt.branch.address}
                    </div>
                )}
                {receipt.branch.phone && (
                    <div className="receipt-muted text-[11px]">
                        {receipt.branch.phone}
                    </div>
                )}
            </div>

            <hr className="receipt-rule my-3" />

            <div className="flex items-baseline justify-between gap-4 text-[11px]">
                <span>Order #{receipt.number}</span>
                <span>{receipt.created_at_label}</span>
            </div>
            <div className="receipt-muted text-[11px]">
                Cashier: {receipt.cashier}
            </div>

            <hr className="receipt-rule my-3" />

            <div className="space-y-2.5">
                {receipt.items.map((item) => (
                    <div key={item.id}>
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 flex-1 truncate">
                                {item.name}
                                {item.variant ? ` · ${item.variant}` : ''}
                            </span>
                            <span>{formatMoney(item.line_total)}</span>
                        </div>
                        <div className="receipt-muted text-[11px]">
                            {item.quantity} × {formatMoney(item.unit_price)}
                            {item.discount > 0
                                ? ` − ${formatMoney(item.discount)}`
                                : ''}
                        </div>
                    </div>
                ))}
            </div>

            <hr className="receipt-rule my-3" />

            <div className="space-y-1">
                <Row label="Subtotal" value={formatMoney(receipt.subtotal)} />
                <Row
                    label={`VAT ${receipt.tax_rate}%`}
                    value={formatMoney(receipt.tax)}
                />
                <div className="mt-2 flex items-baseline justify-between border-t border-dashed border-[color:var(--paper-rule)] pt-2">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="text-lg font-semibold">
                        {receipt.currency} {formatMoney(receipt.total)}
                    </span>
                </div>
            </div>

            <hr className="receipt-rule my-3" />

            <div className="space-y-1">
                <Row label="Cash" value={formatMoney(receipt.payment.amount)} />
                <Row
                    label="Tendered"
                    value={formatMoney(receipt.payment.tendered)}
                />
                <Row
                    label="Change"
                    value={formatMoney(receipt.payment.change)}
                />
            </div>

            <div className="mt-5 flex items-center justify-between">
                <span className="stamp stamp-paid">Paid</span>
                <span className="receipt-muted text-[10px]">
                    Thank you for your business
                </span>
            </div>
        </div>
    );
}
