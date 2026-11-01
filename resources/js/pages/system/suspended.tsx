import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * SCAFFOLD ONLY — not routed yet.
 *
 * The entitlement middleware should redirect here when the signed snapshot
 * is outside the paid period + 14-day grace window.
 *
 * Allowed for Superadmin:
 * - dashboard (read-only)
 * - support
 * - announcements
 * - billing instructions
 * - data export
 *
 * Blocked:
 * - POS sales
 * - public ordering
 * - normal write actions
 */
export default function SuspendedSystemPage() {
    return (
        <>
            <Head title="System suspended" />
            <div className="flex min-h-[70vh] items-center justify-center p-6">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">CWSPOS</p>
                        <CardTitle className="text-2xl">System suspended</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground">
                        <p>
                            This installation is outside its active subscription period and grace window.
                            New POS sales and public orders are paused. Your data remains safe.
                        </p>
                        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-xs">
                            <p><span className="font-medium text-foreground">Reason:</span> subscription outstanding</p>
                            <p className="mt-1"><span className="font-medium text-foreground">Grace:</span> 14 days after period end</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button>View billing instructions</Button>
                            <Button variant="outline">Contact support</Button>
                        </div>
                        <p className="text-[11px]">
                            Superadmin retains access to the dashboard, support, announcements and billing.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
