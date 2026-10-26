import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { router } from '@inertiajs/react';
import { Banknote, LogOut, Monitor, Store } from 'lucide-react';
import type { FormEvent } from 'react';
import { formatMoney } from './money';

const quickOpenAmounts = [500, 1000, 2000, 5000, 10000];

export function OpenTillScreen({
    branchName,
    cashierName,
    openingCash,
    onOpeningCashChange,
    onSubmit,
    processing,
    error,
    canAccessAdmin,
}: {
    branchName: string;
    cashierName: string;
    openingCash: string;
    onOpeningCashChange: (value: string) => void;
    onSubmit: (event: FormEvent) => void;
    processing: boolean;
    error?: string;
    canAccessAdmin: boolean;
}) {
    return (
        <div className="flex min-h-dvh flex-col">
            <header className="flex h-14 items-center justify-between gap-3 border-b border-border/70 bg-card/60 px-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Store className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                            {branchName}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                            {cashierName} · till closed
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {canAccessAdmin && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => router.visit('/admin')}
                        >
                            <Monitor className="size-4" />
                            <span className="hidden sm:inline">
                                Back-office
                            </span>
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => router.post('/logout')}
                    >
                        <LogOut className="size-4" />
                        <span className="hidden sm:inline">Sign out</span>
                    </Button>
                </div>
            </header>

            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 shadow-lg">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-pay/15 text-pay">
                        <Banknote className="size-6" />
                    </div>

                    <h1 className="mt-5 text-xl font-semibold tracking-tight">
                        Open the till
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Count the cash in the drawer, then open the shift. No
                        selling until the till is open.
                    </p>

                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="opening_cash"
                                className="text-xs font-medium"
                            >
                                Opening cash
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                                    KES
                                </span>
                                <Input
                                    id="opening_cash"
                                    value={openingCash}
                                    onChange={(event) =>
                                        onOpeningCashChange(
                                            event.target.value.replace(
                                                /[^0-9.]/g,
                                                '',
                                            ),
                                        )
                                    }
                                    inputMode="decimal"
                                    autoFocus
                                    className="h-14 bg-background pl-14 font-mono text-2xl"
                                    placeholder="0.00"
                                />
                            </div>
                            {error && (
                                <p className="text-xs text-destructive">
                                    {error}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {quickOpenAmounts.map((amount) => (
                                <Button
                                    key={amount}
                                    type="button"
                                    variant="outline"
                                    className="h-10 font-mono text-xs"
                                    onClick={() =>
                                        onOpeningCashChange(String(amount))
                                    }
                                >
                                    {amount}
                                </Button>
                            ))}
                        </div>

                        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                    Counted
                                </span>
                                <span className="font-mono font-semibold">
                                    KES {formatMoney(Number(openingCash || 0))}
                                </span>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={processing}
                            className="h-14 w-full rounded-xl bg-pay text-base font-semibold text-pay-foreground shadow-none hover:opacity-90 disabled:opacity-40"
                        >
                            {processing ? 'Opening…' : 'Open till'}
                        </Button>
                    </form>

                    <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
                        Cash and the payment methods enabled for this region are
                        available after opening the till.
                    </p>
                </div>
            </div>
        </div>
    );
}
