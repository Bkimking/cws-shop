import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTerminalTheme } from '@/layouts/app/app-terminal-layout';
import { cn } from '@/lib/utils';
import { Banknote, TriangleAlert } from 'lucide-react';
import type { FormEvent } from 'react';
import { formatMoney, Money } from './money';
import type { PosTill } from '@/types/pos';

function varianceTone(variance: number): string {
    if (Math.abs(variance) < 0.01) {
        return 'text-pay';
    }

    return variance < 0 ? 'text-hold' : 'text-info';
}

export function CloseTillDialog({
    open,
    onOpenChange,
    till,
    closingCash,
    onClosingCashChange,
    reason,
    onReasonChange,
    onSubmit,
    processing,
    error,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    till: PosTill | null;
    closingCash: string;
    onClosingCashChange: (value: string) => void;
    reason: string;
    onReasonChange: (value: string) => void;
    onSubmit: (event: FormEvent) => void;
    processing: boolean;
    error?: string;
}) {
    const { contrast } = useTerminalTheme();
    const expected = till?.expected_cash ?? 0;
    const counted = Number(closingCash || 0);
    const variance = Math.round((counted - expected) * 100) / 100;
    const needsReason = Math.abs(variance) >= 0.01;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    'terminal sm:max-w-md',
                    contrast !== 'daylight' && 'dark',
                )}
                data-contrast={contrast === 'normal' ? undefined : contrast}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Banknote className="size-4 text-pay" />
                        Close the till
                    </DialogTitle>
                    <DialogDescription>
                        Count the cash in the drawer. The expected amount comes
                        from the opening float plus cash sales in this session.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-1 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Opening float
                            </span>
                            <span className="font-mono">
                                <Money amount={till?.opening_cash ?? 0} />
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Cash sales ({till?.sales_count ?? 0})
                            </span>
                            <span className="font-mono">
                                <Money amount={till?.cash ?? 0} />
                            </span>
                        </div>
                        <div className="mt-1 flex justify-between border-t border-dashed border-border/70 pt-2 font-semibold">
                            <span>Expected</span>
                            <span className="font-mono">
                                <Money amount={expected} />
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label
                                htmlFor="closing_cash"
                                className="text-xs font-medium"
                            >
                                Counted cash
                            </label>
                            <button
                                type="button"
                                onClick={() =>
                                    onClosingCashChange(expected.toFixed(2))
                                }
                                className="text-[11px] text-primary hover:underline"
                            >
                                Use expected
                            </button>
                        </div>
                        <Input
                            id="closing_cash"
                            value={closingCash}
                            onChange={(event) =>
                                onClosingCashChange(
                                    event.target.value.replace(/[^0-9.]/g, ''),
                                )
                            }
                            inputMode="decimal"
                            autoFocus
                            className="h-12 bg-background font-mono text-lg"
                            placeholder="0.00"
                        />
                        {error && (
                            <p className="text-xs text-destructive">{error}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                            Variance
                        </span>
                        <span
                            className={cn(
                                'font-mono text-sm font-semibold',
                                varianceTone(variance),
                            )}
                        >
                            {Math.abs(variance) < 0.01
                                ? 'Balanced'
                                : variance < 0
                                  ? `Short by ${formatMoney(Math.abs(variance))}`
                                  : `Over by ${formatMoney(variance)}`}
                        </span>
                    </div>

                    {needsReason && (
                        <div className="space-y-2">
                            <label
                                htmlFor="variance_reason"
                                className="flex items-center gap-1.5 text-xs font-medium"
                            >
                                <TriangleAlert className="size-3.5 text-hold" />
                                Reason for the variance
                            </label>
                            <Input
                                id="variance_reason"
                                value={reason}
                                onChange={(event) =>
                                    onReasonChange(event.target.value)
                                }
                                className="bg-background"
                                placeholder="e.g. change for a 1,000 note"
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="bg-pay text-pay-foreground hover:opacity-90"
                        >
                            {processing ? 'Closing…' : 'Close till'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
