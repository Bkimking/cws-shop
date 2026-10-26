import { Link } from '@inertiajs/react';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function WorkspaceHeader({
    eyebrow,
    title,
    description,
    icon: Icon,
    badge,
    actions,
}: {
    eyebrow: string;
    title: string;
    description: string;
    icon: LucideIcon;
    badge?: string;
    actions?: ReactNode;
}) {
    return (
        <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                </span>
                <div>
                    <p className="text-[10px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                        {eyebrow}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {title}
                        </h1>
                        {badge && <Badge variant="outline">{badge}</Badge>}
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
            {actions && (
                <div className="flex flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}

export function MetricCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'default',
}: {
    label: string;
    value: string | number;
    hint?: string;
    icon: LucideIcon;
    tone?: 'default' | 'success' | 'warning' | 'primary';
}) {
    const toneClass = {
        default: 'text-muted-foreground bg-muted/50',
        success: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
        warning: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
        primary: 'text-primary bg-primary/10',
    }[tone];

    return (
        <Card className="border-border/60">
            <CardContent className="flex items-start justify-between gap-3 py-4">
                <div>
                    <p className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                        {label}
                    </p>
                    <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
                        {value}
                    </p>
                    {hint && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            {hint}
                        </p>
                    )}
                </div>
                <span
                    className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg',
                        toneClass,
                    )}
                >
                    <Icon className="size-4" />
                </span>
            </CardContent>
        </Card>
    );
}

export function Panel({
    title,
    description,
    action,
    children,
    className,
}: {
    title: string;
    description?: string;
    action?: { label: string; href: string };
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'rounded-2xl border border-border/60 bg-card',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3 border-b border-border/50 px-4 py-3">
                <div>
                    <h2 className="text-sm font-semibold">{title}</h2>
                    {description && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
                {action && (
                    <Link
                        href={action.href}
                        className="inline-flex shrink-0 items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                        {action.label}
                        <ArrowUpRight className="size-3" />
                    </Link>
                )}
            </div>
            {children}
        </section>
    );
}

export function EmptyPanel({ children }: { children: ReactNode }) {
    return (
        <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            {children}
        </div>
    );
}
