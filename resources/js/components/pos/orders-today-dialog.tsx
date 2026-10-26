import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTerminalTheme } from '@/layouts/app/app-terminal-layout';
import { cn } from '@/lib/utils';
import { ReceiptText } from 'lucide-react';
import type { PosOrderSummary } from '@/types/pos';
import { Money } from './money';

export function OrdersTodayDialog({
    open,
    onOpenChange,
    orders,
    currency,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orders: PosOrderSummary[];
    currency: string;
}) {
    const { contrast } = useTerminalTheme();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    'terminal sm:max-w-lg',
                    contrast !== 'daylight' && 'dark',
                )}
                data-contrast={contrast === 'normal' ? undefined : contrast}
            >
                <DialogHeader>
                    <DialogTitle>Orders today</DialogTitle>
                    <DialogDescription>
                        {orders.length} sale{orders.length === 1 ? '' : 's'} at
                        this branch today.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] scrollbar-thin overflow-y-auto">
                    {orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <ReceiptText className="size-7 text-muted-foreground/60" />
                            <p className="text-sm font-medium">No sales yet</p>
                            <p className="text-xs text-muted-foreground">
                                Completed cash sales will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/60">
                            {orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between gap-3 py-2.5"
                                >
                                    <div className="min-w-0">
                                        <div className="font-mono text-sm">
                                            #{order.number}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                            {order.time} · {order.items_count}{' '}
                                            item
                                            {order.items_count === 1 ? '' : 's'}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <span className="font-mono text-sm">
                                            <Money
                                                amount={order.total}
                                                currency={currency}
                                            />
                                        </span>
                                        <Badge
                                            variant={
                                                order.status === 'completed'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                            className="px-1.5 py-0 text-[10px] capitalize"
                                        >
                                            {order.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
