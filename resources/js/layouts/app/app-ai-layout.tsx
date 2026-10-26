import { Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ChevronDown,
    LogOut,
    Settings,
    Sparkles,
    UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { FlashMessageObserver } from '@/hooks/use-flash-toast';
import { cn } from '@/lib/utils';
import type { Auth } from '@/types';

function RailLink({
    href,
    label,
    active = false,
    children,
}: {
    href: string;
    label: string;
    active?: boolean;
    children: ReactNode;
}) {
    return (
        <Link
            href={href}
            aria-label={label}
            title={label}
            className={cn(
                'group relative flex size-10 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground',
                active &&
                    'border-ai-border/50 bg-ai/15 text-ai shadow-[0_0_18px_-8px_var(--ai)]',
            )}
        >
            {children}
            <span className="pointer-events-none absolute left-full z-50 ml-2 hidden rounded-md border border-border/70 bg-popover px-2 py-1 text-[11px] whitespace-nowrap text-popover-foreground shadow-md group-hover:block">
                {label}
            </span>
        </Link>
    );
}

export default function AppAiLayout({ children }: { children: ReactNode }) {
    const page = usePage();
    const { auth } = page.props as { auth: Auth };
    const isSettings = page.component === 'admin/ai/settings';
    const canManage = auth.permissions.includes('manage ai settings');
    const initials = auth.user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="ai-workspace dark flex h-dvh max-h-dvh overflow-hidden bg-background text-foreground">
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_-10%,var(--ai),transparent_38%)] opacity-[0.12]" />
            <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_80%)] bg-[size:72px_72px]" />

            <aside className="relative z-10 flex w-14 shrink-0 flex-col items-center border-r border-border/60 bg-card/40 py-3 sm:w-16">
                <Link
                    href="/admin/ai"
                    aria-label="AI workspace home"
                    className="flex size-10 items-center justify-center rounded-xl bg-ai text-ai-foreground shadow-[0_0_24px_-4px_var(--ai)]"
                >
                    <Sparkles className="size-5" />
                </Link>
                <span className="mt-2 font-mono text-[9px] tracking-[0.3em] text-ai">
                    AI
                </span>

                <nav
                    className="mt-8 flex flex-col gap-2"
                    aria-label="AI workspace"
                >
                    <RailLink
                        href="/admin/ai"
                        label="Assistant"
                        active={!isSettings}
                    >
                        <Sparkles className="size-4" />
                    </RailLink>
                    {canManage && (
                        <RailLink
                            href="/admin/ai/settings"
                            label="AI settings"
                            active={isSettings}
                        >
                            <Settings className="size-4" />
                        </RailLink>
                    )}
                </nav>

                <div className="mt-auto flex flex-col gap-2">
                    <RailLink href="/admin" label="Back to back-office">
                        <ArrowLeft className="size-4" />
                    </RailLink>

                    <Link
                        href="/settings/profile"
                        aria-label="Profile"
                        title="Profile"
                        className="flex size-10 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground"
                    >
                        <UserRound className="size-4" />
                    </Link>
                </div>
            </aside>

            <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-card/30 px-4 backdrop-blur sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="hidden font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase sm:inline">
                            AI workspace
                        </span>
                        <span className="hidden h-3 w-px bg-border sm:block" />
                        <span className="truncate text-sm font-medium">
                            {isSettings ? 'Settings' : 'Assistant'}
                        </span>
                        <span className="hidden rounded-full border border-ai-border/30 bg-ai/15 px-2 py-0.5 text-[10px] text-ai md:inline">
                            Read-only
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {!isSettings && (
                            <Link
                                href="/admin/ai"
                                className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                            >
                                New chat
                            </Link>
                        )}
                        <Link
                            href="/admin"
                            className="hidden rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:block"
                        >
                            Back to admin
                        </Link>

                        <div className="ml-1 flex items-center gap-2 border-l border-border/60 pl-2">
                            <span className="flex size-7 items-center justify-center rounded-full bg-ai/15 font-mono text-[10px] font-medium text-ai">
                                {initials}
                            </span>
                            <details className="group relative">
                                <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground [&::-webkit-details-marker]:hidden">
                                    <span className="hidden max-w-28 truncate sm:block">
                                        {auth.user.name}
                                    </span>
                                    <ChevronDown className="size-3" />
                                </summary>
                                <div className="absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border/70 bg-popover p-1 text-popover-foreground shadow-xl">
                                    <div className="px-2.5 py-2">
                                        <p className="truncate text-xs font-medium">
                                            {auth.user.name}
                                        </p>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                            {auth.user.email}
                                        </p>
                                    </div>
                                    <Link
                                        href="/settings/profile"
                                        className="block rounded-md px-2.5 py-2 text-xs hover:bg-muted"
                                    >
                                        Profile
                                    </Link>
                                    <Link
                                        href="/logout"
                                        method="post"
                                        as="button"
                                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-destructive hover:bg-destructive/10"
                                    >
                                        <LogOut className="size-3.5" />
                                        Sign out
                                    </Link>
                                </div>
                            </details>
                        </div>
                    </div>
                </header>

                <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <FlashMessageObserver />
                    {children}
                </main>
            </div>
        </div>
    );
}
