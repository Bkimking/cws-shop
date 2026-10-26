import { cn } from '@/lib/utils';

const formatter = new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function formatMoney(
    amount: number | string | null | undefined,
): string {
    return formatter.format(Number(amount ?? 0));
}

export function Money({
    amount,
    currency = 'KES',
    withCurrency = true,
    className,
}: {
    amount: number | string | null | undefined;
    currency?: string;
    withCurrency?: boolean;
    className?: string;
}) {
    return (
        <span className={cn('tabular-nums', className)}>
            {withCurrency ? `${currency} ` : ''}
            {formatMoney(amount)}
        </span>
    );
}
