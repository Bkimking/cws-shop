import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTerminalTheme } from '@/layouts/app/app-terminal-layout';
import { cn } from '@/lib/utils';
import { Printer } from 'lucide-react';
import type { PosTill } from '@/types/pos';
import { formatMoney } from './money';

function Line({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex items-baseline justify-between gap-3',
                strong && 'font-semibold',
            )}
        >
            <span className="receipt-muted">{label}</span>
            <span>{value}</span>
        </div>
    );
}

export function TillReportDialog({
    open,
    onOpenChange,
    report,
    mode,
    branchName,
    currency,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    report: PosTill | null;
    mode: 'x' | 'z';
    branchName: string;
    currency: string;
}) {
    const { contrast } = useTerminalTheme();

    if (!report) {
        return null;
    }

    const isZ = mode === 'z';
    const variance = report.variance ?? 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    'terminal sm:max-w-sm',
                    contrast !== 'daylight' && 'dark',
                )}
                data-contrast={contrast === 'normal' ? undefined : contrast}
            >
                <DialogHeader>
                    <DialogTitle>{isZ ? 'Z report' : 'X report'}</DialogTitle>
                    <DialogDescription>
                        {isZ
                            ? 'Closed shift summary for the till.'
                            : 'Mid-shift snapshot. Selling can continue.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="receipt receipt-edge receipt-print px-5 py-4 text-[13px]">
                    <div className="text-center">
                        <div className="text-base font-semibold">
                            {branchName}
                        </div>
                        <div className="receipt-muted text-[11px] tracking-[0.16em] uppercase">
                            {isZ ? 'Z report' : 'X report'}
                        </div>
                    </div>

                    <hr className="receipt-rule my-3" />

                    <div className="space-y-1">
                        <Line label="Cashier" value={report.cashier} />
                        <Line
                            label="Opened"
                            value={report.opened_at_label ?? '—'}
                        />
                        {isZ && (
                            <Line
                                label="Closed"
                                value={report.closed_at_label ?? '—'}
                            />
                        )}
                    </div>

                    <hr className="receipt-rule my-3" />

                    <div className="space-y-1">
                        <Line
                            label="Sales"
                            value={String(report.sales_count)}
                        />
                        <Line
                            label="Gross"
                            value={`${currency} ${formatMoney(report.gross)}`}
                        />
                        <Line
                            label="Cash sales"
                            value={`${currency} ${formatMoney(report.cash)}`}
                        />
                    </div>

                    <hr className="receipt-rule my-3" />

                    <div className="space-y-1">
                        <Line
                            label="Opening float"
                            value={formatMoney(report.opening_cash)}
                        />
                        {isZ && (
                            <Line
                                label="Counted"
                                value={formatMoney(report.closing_cash)}
                            />
                        )}
                        <Line
                            label="Expected"
                            value={`${currency} ${formatMoney(report.expected_cash)}`}
                            strong
                        />
                        {isZ && (
                            <Line
                                label="Variance"
                                value={
                                    Math.abs(variance) < 0.01
                                        ? 'Balanced'
                                        : `${variance > 0 ? 'Over' : 'Short'} ${formatMoney(Math.abs(variance))}`
                                }
                            />
                        )}
                    </div>

                    {isZ && report.variance_reason && (
                        <>
                            <hr className="receipt-rule my-3" />
                            <p className="text-[11px] leading-relaxed">
                                <span className="receipt-muted">Reason: </span>
                                {report.variance_reason}
                            </p>
                        </>
                    )}

                    <div className="mt-4 text-center text-[10px] text-[color:var(--paper-ink-muted)]">
                        {isZ
                            ? 'Shift closed · keep this with the cash count'
                            : 'Snapshot only · till remains open'}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.print()}
                    >
                        <Printer className="size-4" />
                        Print
                    </Button>
                    <Button type="button" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
