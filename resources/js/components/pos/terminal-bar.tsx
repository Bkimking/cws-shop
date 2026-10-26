import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TerminalContrast } from '@/layouts/app/app-terminal-layout';
import { router } from '@inertiajs/react';
import {
    Check,
    ChevronDown,
    History,
    LogOut,
    Menu,
    Monitor,
    Receipt,
    Store,
    Sun,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PosTill } from '@/types/pos';

const contrasts: {
    value: TerminalContrast;
    label: string;
    icon: typeof Sun;
}[] = [
    { value: 'normal', label: 'Normal contrast', icon: Monitor },
    { value: 'high', label: 'High contrast', icon: XCircle },
    { value: 'daylight', label: 'Daylight', icon: Sun },
];

export function TerminalBar({
    branchName,
    cashierName,
    till,
    online,
    contrast,
    onContrast,
    onOpenOrders,
    onOpenXReport,
    onOpenCloseTill,
    canAccessAdmin,
    orderCount,
}: {
    branchName: string;
    cashierName: string;
    till: PosTill | null;
    online: boolean;
    contrast: TerminalContrast;
    onContrast: (contrast: TerminalContrast) => void;
    onOpenOrders: () => void;
    onOpenXReport: () => void;
    onOpenCloseTill: () => void;
    canAccessAdmin: boolean;
    orderCount: number;
}) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 1000);

        return () => window.clearInterval(timer);
    }, []);

    return (
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-card/60 px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Store className="size-5" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                            {branchName}
                        </span>
                        <span
                            className={cn(
                                'size-1.5 shrink-0 rounded-full',
                                till ? 'bg-pay' : 'bg-hold',
                            )}
                        />
                        <span className="truncate text-[11px] text-muted-foreground">
                            {till
                                ? `Till open ${till.opened_at_label ?? ''}`
                                : 'Till closed'}
                        </span>
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                        {cashierName} ·{' '}
                        {now.toLocaleDateString(undefined, {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                        })}{' '}
                        ·{' '}
                        {now.toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </div>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
                <span
                    className={cn(
                        'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] sm:flex',
                        online
                            ? 'border-pay/30 bg-pay/10 text-pay'
                            : 'border-hold/40 bg-hold/10 text-hold',
                    )}
                >
                    <span
                        className={cn(
                            'size-1.5 rounded-full',
                            online ? 'bg-pay' : 'bg-hold',
                        )}
                    />
                    {online ? 'Online' : 'Offline'}
                </span>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={onOpenOrders}
                >
                    <Receipt className="size-4" />
                    <span className="hidden md:inline">Orders</span>
                    <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                        {orderCount}
                    </span>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1"
                        >
                            <Menu className="size-4" />
                            <ChevronDown className="size-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Terminal</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={onOpenOrders}>
                            <Receipt className="size-4" />
                            Orders today
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            disabled={!till}
                            onSelect={onOpenXReport}
                        >
                            <History className="size-4" />
                            X report
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            disabled={!till}
                            onSelect={onOpenCloseTill}
                        >
                            <XCircle className="size-4" />
                            Close till
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Contrast</DropdownMenuLabel>
                        {contrasts.map((option) => {
                            const Icon = option.icon;

                            return (
                                <DropdownMenuItem
                                    key={option.value}
                                    onSelect={() => onContrast(option.value)}
                                >
                                    <Icon className="size-4" />
                                    {option.label}
                                    {contrast === option.value && (
                                        <Check className="ml-auto size-4 text-primary" />
                                    )}
                                </DropdownMenuItem>
                            );
                        })}

                        <DropdownMenuSeparator />
                        {canAccessAdmin && (
                            <DropdownMenuItem
                                onSelect={() => router.visit('/admin')}
                            >
                                <Monitor className="size-4" />
                                Back-office
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                            onSelect={() => router.post('/logout')}
                        >
                            <LogOut className="size-4" />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
