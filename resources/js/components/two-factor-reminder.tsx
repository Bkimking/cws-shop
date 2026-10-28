import { Link, usePage } from '@inertiajs/react';
import { ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';

export function TwoFactorReminder() {
    const { security } = usePage<{
        security: { two_factor_enabled: boolean; security_url: string | null };
    }>().props;
    const [dismissed, setDismissed] = useState(false);

    if (
        dismissed ||
        !security ||
        security.two_factor_enabled ||
        !security.security_url
    ) {
        return null;
    }

    return (
        <div className="flex items-center gap-3 border-b border-amber-500/25 bg-amber-500/10 px-6 py-2.5 text-xs text-amber-700 dark:text-amber-300 print:hidden">
            <ShieldAlert className="size-4 shrink-0" />
            <p className="flex-1">
                Your account does not have two-factor authentication enabled.
                Add a second step to protect POS and back-office access.
            </p>
            <Link
                href={security.security_url}
                className="shrink-0 font-medium underline underline-offset-2"
            >
                Enable 2FA
            </Link>
            <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Dismiss"
                className="shrink-0 opacity-60 hover:opacity-100"
            >
                <X className="size-3.5" />
            </button>
        </div>
    );
}
