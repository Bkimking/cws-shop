import { Button } from '@/components/ui/button';
import { CheckCircle2, Pause, Play, Printer, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PosReceipt } from '@/types/pos';
import { Money } from './money';
import { Receipt } from './receipt';

export function SaleSuccess({
    receipt,
    onNewSale,
}: {
    receipt: PosReceipt;
    onNewSale: () => void;
}) {
    const [remaining, setRemaining] = useState(20);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        setRemaining(20);
        setPaused(false);
    }, [receipt.id]);

    useEffect(() => {
        if (paused) {
            return;
        }

        if (remaining <= 0) {
            onNewSale();

            return;
        }

        const timer = window.setTimeout(
            () => setRemaining((value) => value - 1),
            1000,
        );

        return () => window.clearTimeout(timer);
    }, [remaining, paused, onNewSale]);

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background/95 backdrop-blur-sm">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-4">
                <div className="flex items-center gap-2 text-sm font-medium text-pay">
                    <CheckCircle2 className="size-5" />
                    Sale complete
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={onNewSale}
                >
                    <X className="size-4" />
                    Close
                </Button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden p-4 lg:grid-cols-[1fr_380px] lg:p-6">
                <div className="flex min-h-0 flex-col items-center justify-center gap-4 text-center">
                    <span className="stamp stamp-paid animate-stamp text-2xl">
                        Paid
                    </span>

                    <div>
                        <div className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                            Change due
                        </div>
                        <div className="mt-1 font-mono text-4xl font-semibold sm:text-5xl">
                            <Money
                                amount={receipt.payment.change}
                                currency={receipt.currency}
                            />
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                        Order #{receipt.number} · Cash ·{' '}
                        {receipt.created_at_label}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                        <Button
                            type="button"
                            size="lg"
                            className="h-12 rounded-xl bg-pay text-pay-foreground hover:opacity-90"
                            onClick={() => window.print()}
                        >
                            <Printer className="size-4" />
                            Print receipt
                        </Button>
                        <Button
                            type="button"
                            size="lg"
                            variant="outline"
                            className="h-12 rounded-xl"
                            onClick={onNewSale}
                        >
                            New sale
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Starting a new sale in {remaining}s</span>
                        <button
                            type="button"
                            onClick={() => setPaused((value) => !value)}
                            className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-0.5 hover:text-foreground"
                        >
                            {paused ? (
                                <Play className="size-3" />
                            ) : (
                                <Pause className="size-3" />
                            )}
                            {paused ? 'Resume' : 'Pause'}
                        </button>
                    </div>
                </div>

                <div className="min-h-0 scrollbar-thin overflow-y-auto">
                    <Receipt receipt={receipt} printable />
                </div>
            </div>
        </div>
    );
}
