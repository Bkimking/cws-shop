import { Link, usePage } from '@inertiajs/react';
import { AlertTriangle, CreditCard } from 'lucide-react';

type PortalEntitlement = {
    status?: string;
    allows_sales?: boolean;
    plan?: string | null;
    period_end?: string | null;
    grace_until?: string | null;
};

export function PortalEntitlementBanner() {
    const { portal } = usePage<{
        portal?: {
            enabled?: boolean;
            url?: string;
            entitlement?: PortalEntitlement | null;
        };
    }>().props;

    const entitlement = portal?.entitlement;
    if (
        !entitlement ||
        entitlement.status === 'active' ||
        entitlement.status === 'lifetime'
    ) {
        return null;
    }

    const suspended =
        entitlement.status === 'suspended' ||
        entitlement.status === 'maintenance';
    const billingUrl = `${portal?.url ?? 'https://portal.codewithsky.co.ke'}/billing`;

    return (
        <div
            className={`flex flex-wrap items-center gap-3 border-b px-6 py-2.5 text-xs print:hidden ${suspended ? 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300' : 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}
        >
            <AlertTriangle className="size-4 shrink-0" />
            <p className="flex-1">
                {suspended
                    ? 'This installation is suspended. New POS sales and public orders are blocked.'
                    : `This installation is in its grace period${entitlement.grace_until ? ` until ${entitlement.grace_until.slice(0, 10)}` : ''}. Please renew.`}
            </p>
            <Link
                href={billingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 font-medium underline underline-offset-2"
            >
                <CreditCard className="size-3.5" /> Billing
            </Link>
        </div>
    );
}
