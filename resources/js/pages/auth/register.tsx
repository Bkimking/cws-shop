import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

export default function Register() {
    return (
        <>
            <Head title="Registration unavailable" />
            <div className="mx-auto flex max-w-md flex-col gap-4 rounded-xl border border-border/60 bg-card p-6 text-center">
                <h1 className="text-xl font-semibold">
                    Registration is closed
                </h1>
                <p className="text-sm text-muted-foreground">
                    CWSPOS accounts are created by a Superadmin. Contact your
                    administrator if you need access.
                </p>
                <Button asChild>
                    <Link href="/login">Back to login</Link>
                </Button>
            </div>
        </>
    );
}
