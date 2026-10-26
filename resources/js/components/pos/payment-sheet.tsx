import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useTerminalTheme } from '@/layouts/app/app-terminal-layout';
import { cn } from '@/lib/utils';
import { Banknote, CreditCard, Delete, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatMoney, Money } from './money';

const quickAmounts = [50, 100, 200, 500, 1000];
const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function MethodTile({
    label,
    hint,
    icon: Icon,
    selected,
    disabled,
    onClick,
}: {
    label: string;
    hint?: string;
    icon: typeof Banknote;
    selected?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'flex h-14 items-center gap-2.5 rounded-2xl border px-3 text-left transition-colors',
                selected
                    ? 'border-pay/60 bg-pay/10 text-foreground'
                    : 'border-border/70 bg-card text-muted-foreground',
                !disabled &&
                    !selected &&
                    'hover:border-primary/40 hover:text-foreground',
                disabled && 'cursor-not-allowed opacity-45',
            )}
        >
            <span
                className={cn(
                    'flex size-8 items-center justify-center rounded-xl',
                    selected
                        ? 'bg-pay/15 text-pay'
                        : 'bg-muted text-muted-foreground',
                )}
            >
                <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                    {label}
                </span>
                {hint && (
                    <span className="block text-[10px] text-muted-foreground">
                        {hint}
                    </span>
                )}
            </span>
            {selected && <span className="size-2 rounded-full bg-pay" />}
        </button>
    );
}

export type PosPaymentConfirmation = {
    method: 'cash' | 'mpesa';
    tendered: number;
    phone?: string;
};

export function PaymentSheet({
    open,
    onOpenChange,
    total,
    currency,
    processing,
    error,
    mpesaEnabled,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    total: number;
    currency: string;
    processing: boolean;
    error: string | null;
    mpesaEnabled: boolean;
    onConfirm: (payment: PosPaymentConfirmation) => void;
}) {
    const { contrast } = useTerminalTheme();
    const [method, setMethod] = useState<'cash' | 'mpesa'>('cash');
    const [tendered, setTendered] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        if (open) {
            setMethod('cash');
            setTendered('');
            setPhone('');
        }
    }, [open]);

    const tenderedValue = Number(tendered || 0);
    const change = roundMoney(tenderedValue - total);
    const phoneValid = phone.replace(/\D/g, '').length >= 9;
    const canConfirm =
        !processing &&
        (method === 'cash'
            ? tenderedValue + 0.001 >= total
            : mpesaEnabled && phoneValid);

    const press = (key: string) => {
        setTendered((current) => {
            if (key === 'back') return current.slice(0, -1);
            if (key === '.') {
                if (current.includes('.')) return current;
                return current === '' ? '0.' : `${current}.`;
            }
            if (current === '0') return key;
            if (current.length >= 9) return current;
            return `${current}${key}`;
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className={cn(
                    'terminal flex w-full flex-col gap-0 p-0 sm:max-w-md',
                    contrast !== 'daylight' && 'dark',
                )}
                data-contrast={contrast === 'normal' ? undefined : contrast}
            >
                <SheetHeader className="border-b border-border/70 px-5 py-4">
                    <div className="flex items-baseline justify-between gap-4">
                        <div>
                            <SheetTitle className="text-base">
                                Charge
                            </SheetTitle>
                            <SheetDescription className="text-xs">
                                {method === 'cash'
                                    ? 'Cash payment'
                                    : 'M-Pesa STK push'}
                            </SheetDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                                Total
                            </div>
                            <div className="font-mono text-xl font-semibold">
                                {currency} {formatMoney(total)}
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 scrollbar-thin space-y-5 overflow-y-auto px-5 py-4">
                    <div className="grid grid-cols-2 gap-2">
                        <MethodTile
                            label="Cash"
                            icon={Banknote}
                            selected={method === 'cash'}
                            hint="Notes & change"
                            onClick={() => setMethod('cash')}
                        />
                        <MethodTile
                            label="M-Pesa"
                            icon={Smartphone}
                            selected={method === 'mpesa'}
                            disabled={!mpesaEnabled}
                            hint={
                                mpesaEnabled
                                    ? 'STK to customer phone'
                                    : 'Not configured'
                            }
                            onClick={() => setMethod('mpesa')}
                        />
                        <MethodTile
                            label="Airtel Money"
                            icon={Smartphone}
                            disabled
                            hint="Coming next"
                        />
                        <MethodTile
                            label="Card"
                            icon={CreditCard}
                            disabled
                            hint="Coming next"
                        />
                    </div>

                    {method === 'cash' ? (
                        <>
                            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
                                <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                                    Amount tendered
                                </div>
                                <div className="mt-1 font-mono text-4xl font-semibold">
                                    {formatMoney(tenderedValue)}
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                        Change due
                                    </span>
                                    <span
                                        className={cn(
                                            'font-mono text-sm font-semibold',
                                            change >= 0
                                                ? 'text-pay'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        <Money
                                            amount={Math.max(change, 0)}
                                            currency={currency}
                                        />
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                {quickAmounts.map((amount) => (
                                    <Button
                                        key={amount}
                                        type="button"
                                        variant="outline"
                                        className="h-10 font-mono text-xs"
                                        onClick={() =>
                                            setTendered(String(amount))
                                        }
                                    >
                                        {amount}
                                    </Button>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 text-xs"
                                    onClick={() =>
                                        setTendered(total.toFixed(2))
                                    }
                                >
                                    Exact
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 text-xs"
                                    onClick={() => setTendered('')}
                                >
                                    Clear
                                </Button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {keypad.map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => press(key)}
                                        className="flex h-14 items-center justify-center rounded-xl border border-border/60 bg-key font-mono text-xl transition-colors hover:bg-key-hover active:bg-tile-active"
                                        aria-label={
                                            key === 'back'
                                                ? 'Backspace'
                                                : `Key ${key}`
                                        }
                                    >
                                        {key === 'back' ? (
                                            <Delete className="size-5" />
                                        ) : (
                                            key
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-4">
                            <div>
                                <p className="text-sm font-medium">
                                    Send an STK prompt
                                </p>
                                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                    Enter the customer’s M-Pesa number. They
                                    approve on their phone; the sale completes
                                    after Safaricom confirms.
                                </p>
                            </div>
                            <label className="block space-y-1.5 text-xs">
                                <span className="font-medium">
                                    Customer phone
                                </span>
                                <input
                                    value={phone}
                                    onChange={(event) =>
                                        setPhone(event.target.value)
                                    }
                                    inputMode="tel"
                                    autoFocus
                                    placeholder="0712 345 678"
                                    className="w-full rounded-xl border border-border/70 bg-background px-3 py-3 font-mono text-base outline-none focus:border-pay"
                                />
                            </label>
                            <div className="rounded-xl bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
                                Amount:{' '}
                                <span className="font-mono text-foreground">
                                    {currency} {formatMoney(total)}
                                </span>
                            </div>
                        </div>
                    )}

                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                        M-Pesa uses the configured STK sandbox. PayPal is muted
                        for now.
                    </p>

                    {error && (
                        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            {error}
                        </p>
                    )}
                </div>

                <SheetFooter className="border-t border-border/70 px-5 py-4">
                    <Button
                        type="button"
                        disabled={!canConfirm}
                        onClick={() =>
                            onConfirm({
                                method,
                                tendered:
                                    method === 'cash' ? tenderedValue : total,
                                phone: method === 'mpesa' ? phone : undefined,
                            })
                        }
                        className="h-14 w-full rounded-xl bg-pay text-base font-semibold text-pay-foreground shadow-none hover:opacity-90 disabled:opacity-40"
                    >
                        {processing
                            ? method === 'cash'
                                ? 'Taking cash…'
                                : 'Sending STK…'
                            : method === 'cash'
                              ? `Take cash ${currency} ${formatMoney(tenderedValue)}`
                              : `Send STK ${currency} ${formatMoney(total)}`}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
