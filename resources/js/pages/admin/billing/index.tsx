import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Entitlement = {
    status: string;
    allows_sales: boolean;
    plan: string | null;
    period_end: string | null;
    grace_until: string | null;
};
type Invoice = {
    id: number;
    number: string;
    amount: string | number;
    currency: string;
    status: string;
    due_at: string | null;
    paid_at: string | null;
};

export default function BillingPage({
    entitlement,
    invoices,
}: {
    entitlement: Entitlement;
    invoices: Invoice[];
}) {
    const suspended = !entitlement.allows_sales;

    return (
        <>
            <Head title="Billing" />
            <div className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
                <div>
                    <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                        Office
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold">Billing</h1>
                    <p className="text-sm text-muted-foreground">
                        Subscription status for this installation.
                    </p>
                </div>

                <Card className={suspended ? 'border-red-500/40' : ''}>
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="text-base">
                            Subscription
                        </CardTitle>
                        <Badge variant={suspended ? 'destructive' : 'outline'}>
                            {entitlement.status}
                        </Badge>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                        <p>
                            <span className="text-muted-foreground">Plan:</span>{' '}
                            {entitlement.plan ?? 'Free / legacy'}
                        </p>
                        <p>
                            <span className="text-muted-foreground">
                                Period end:
                            </span>{' '}
                            {entitlement.period_end?.slice(0, 10) ?? '—'}
                        </p>
                        <p>
                            <span className="text-muted-foreground">
                                Grace until:
                            </span>{' '}
                            {entitlement.grace_until?.slice(0, 10) ?? '—'}
                        </p>
                        <p>
                            <span className="text-muted-foreground">
                                POS sales:
                            </span>{' '}
                            {entitlement.allows_sales ? 'Allowed' : 'Blocked'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Invoices</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {invoices.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                No invoices are currently visible.
                            </p>
                        ) : (
                            <div className="divide-y divide-border/60">
                                {invoices.map((invoice) => (
                                    <div
                                        key={invoice.id}
                                        className="flex flex-wrap items-center gap-2 py-2 text-sm"
                                    >
                                        <span className="font-mono text-xs">
                                            {invoice.number}
                                        </span>
                                        <span className="font-medium">
                                            {invoice.currency}{' '}
                                            {Number(
                                                invoice.amount,
                                            ).toLocaleString()}
                                        </span>
                                        <Badge variant="outline">
                                            {invoice.status}
                                        </Badge>
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            Due{' '}
                                            {invoice.due_at?.slice(0, 10) ??
                                                '—'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline">
                        <Link href="/admin/support">Contact support</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/admin/announcements">Announcements</Link>
                    </Button>
                </div>
            </div>
        </>
    );
}

BillingPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/admin' },
        { title: 'Billing', href: '/admin/billing' },
    ],
};
