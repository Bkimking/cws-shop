import { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import adminactivity from '@/routes/admin/activity';
import {
    History,
    Filter,
    ChevronDown,
    ChevronRight,
    List,
    GitBranch,
    BarChart3,
    Plus,
    Pencil,
    Trash2,
    User as UserIcon,
    Globe,
    Store,
    X,
    CircleDot,
    ArrowRight,
    Calendar,
    Tag,
    Package,
    Receipt,
    CreditCard,
    Building,
} from 'lucide-react';

/* ---------- types ---------- */

interface ActivityItem {
    id: number;
    log_name: string | null;
    description: string;
    event: string | null;
    subject: {
        type: string | null;
        type_full: string | null;
        id: string | null;
        label: string | null;
    };
    causer: { id: number; name: string; email: string } | null;
    changes: {
        old: Record<string, unknown>;
        attributes: Record<string, unknown>;
    };
    created_at: string | null;
    created_at_human: string;
    created_at_date: string | null;
}

interface PaginatedActivities {
    data: ActivityItem[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    meta: { current_page: number; last_page: number; total: number; per_page: number };
}

interface Props {
    activities: PaginatedActivities;
    filters: {
        causer_id: number | null;
        subject_type: string | null;
        event: string | null;
        from: string | null;
        to: string | null;
    };
    filterOptions: {
        users: Array<{ id: number; name: string; email: string }>;
        subject_types: Array<{ value: string; label: string }>;
        events: string[];
    };
    chart: Array<{ day: string; total: number }>;
    counts: { today: number; week: number; total: number };
}

/* ---------- helpers ---------- */

const selectClass =
    'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function initials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function eventMeta(event: string | null) {
    switch (event) {
        case 'created':
            return { icon: Plus, classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Created' };
        case 'updated':
            return { icon: Pencil, classes: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400', label: 'Updated' };
        case 'deleted':
            return { icon: Trash2, classes: 'border-destructive/30 bg-destructive/10 text-destructive', label: 'Deleted' };
        default:
            return { icon: CircleDot, classes: 'border-muted-foreground/30 bg-muted text-muted-foreground', label: event ?? 'Event' };
    }
}

function subjectIcon(type: string | null) {
    switch (type) {
        case 'Region': return Globe;
        case 'Branch': return Store;
        case 'User': return UserIcon;
        case 'Category': return Tag;
        case 'Product': return Package;
        case 'Order': return Receipt;
        case 'Payment Gateway': return CreditCard;
        case 'Warehouse': return Package;
        default: return CircleDot;
    }
}

/* ---------- page ---------- */

export default function AdminActivityIndex({ activities, filters, filterOptions, chart, counts }: Props) {
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    const toggleRow = (id: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const submitFilters = (patch: Partial<Props['filters']>) => {
        const next = { ...filters, ...patch };
        const params: Record<string, string> = {};
        if (next.causer_id) params.causer_id = String(next.causer_id);
        if (next.subject_type) params.subject_type = next.subject_type;
        if (next.event) params.event = next.event;
        if (next.from) params.from = next.from;
        if (next.to) params.to = next.to;

        router.get(adminactivity.index().url, params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        router.get(adminactivity.index().url, {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const hasActiveFilters = Boolean(
        filters.causer_id || filters.subject_type || filters.event || filters.from || filters.to
    );

    const maxChartTotal = useMemo(
        () => Math.max(1, ...chart.map((d) => d.total)),
        [chart]
    );

    // Group activities by date for the timeline view
    const groupedByDate = useMemo(() => {
        const groups: Record<string, ActivityItem[]> = {};
        activities.data.forEach((a) => {
            const key = a.created_at_date ?? 'unknown';
            (groups[key] ??= []).push(a);
        });
        return groups;
    }, [activities.data]);

    return (
        <>
            <Head title="Activity Log" />

            <div className="flex h-full flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <History className="size-5 text-primary" />
                            <h1 className="text-2xl font-semibold tracking-tight">Activity Log</h1>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Who changed what, when. Scoped to your region and branch.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Card className="border shadow-xs">
                            <CardContent className="px-3 py-2">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Today</div>
                                <div className="font-mono text-lg font-semibold">{counts.today}</div>
                            </CardContent>
                        </Card>
                        <Card className="border shadow-xs">
                            <CardContent className="px-3 py-2">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">7 days</div>
                                <div className="font-mono text-lg font-semibold">{counts.week}</div>
                            </CardContent>
                        </Card>
                        <Card className="border shadow-xs">
                            <CardContent className="px-3 py-2">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">All time</div>
                                <div className="font-mono text-lg font-semibold">{counts.total}</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Filter bar */}
                <Card className="border">
                    <CardContent className="p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                <Filter className="size-3.5" />
                                Filters
                            </div>
                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                                    <X className="mr-1 size-3" />
                                    Clear filters
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-muted-foreground">User</label>
                                <select
                                    className={selectClass}
                                    value={filters.causer_id ?? ''}
                                    onChange={(e) =>
                                        submitFilters({ causer_id: e.target.value ? Number(e.target.value) : null })
                                    }
                                >
                                    <option value="">All users</option>
                                    {filterOptions.users.map((u) => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-muted-foreground">Model</label>
                                <select
                                    className={selectClass}
                                    value={filters.subject_type ?? ''}
                                    onChange={(e) => submitFilters({ subject_type: e.target.value || null })}
                                >
                                    <option value="">All models</option>
                                    {filterOptions.subject_types.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-muted-foreground">Action</label>
                                <select
                                    className={selectClass}
                                    value={filters.event ?? ''}
                                    onChange={(e) => submitFilters({ event: e.target.value || null })}
                                >
                                    <option value="">All actions</option>
                                    {filterOptions.events.map((e) => (
                                        <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-muted-foreground">From</label>
                                <Input
                                    type="date"
                                    className="h-9"
                                    value={filters.from ?? ''}
                                    onChange={(e) => submitFilters({ from: e.target.value || null })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-muted-foreground">To</label>
                                <Input
                                    type="date"
                                    className="h-9"
                                    value={filters.to ?? ''}
                                    onChange={(e) => submitFilters({ to: e.target.value || null })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* View modes */}
                <Tabs defaultValue="table" className="space-y-4">
                    <TabsList className="bg-muted/60 p-1">
                        <TabsTrigger value="table" className="gap-1.5 text-xs">
                            <List className="size-3.5" />
                            Table
                        </TabsTrigger>
                        <TabsTrigger value="timeline" className="gap-1.5 text-xs">
                            <GitBranch className="size-3.5" />
                            Timeline
                        </TabsTrigger>
                        <TabsTrigger value="chart" className="gap-1.5 text-xs">
                            <BarChart3 className="size-3.5" />
                            Chart
                        </TabsTrigger>
                    </TabsList>

                    {/* -------- TABLE VIEW -------- */}
                    <TabsContent value="table" className="space-y-3">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-8" />
                                        <TableHead>When</TableHead>
                                        <TableHead>Who</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Description</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activities.data.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                                                <History className="mx-auto mb-2 size-6 text-muted-foreground/40" />
                                                {hasActiveFilters
                                                    ? 'No activity matches these filters.'
                                                    : 'No activity recorded yet.'}
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {activities.data.map((a) => {
                                        const meta = eventMeta(a.event);
                                        const Icon = meta.icon;
                                        const SubjectIcon = subjectIcon(a.subject.type);
                                        const isOpen = expanded.has(a.id);
                                        const hasChanges =
                                            Object.keys(a.changes.attributes).length > 0 ||
                                            Object.keys(a.changes.old).length > 0;

                                        return (
                                            <>
                                                <TableRow
                                                    key={a.id}
                                                    className={`cursor-pointer transition-colors ${isOpen ? 'bg-muted/40' : ''}`}
                                                    onClick={() => toggleRow(a.id)}
                                                >
                                                    <TableCell className="py-2 pl-3">
                                                        {hasChanges ? (
                                                            isOpen ? <ChevronDown className="size-4 text-muted-foreground" /> :
                                                                <ChevronRight className="size-4 text-muted-foreground" />
                                                        ) : (
                                                            <span className="inline-block size-4" />
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="size-3" />
                                                            <span title={a.created_at ?? ''}>{a.created_at_human}</span>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        {a.causer ? (
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="size-6">
                                                                    <AvatarFallback className="text-[10px] font-bold bg-muted">
                                                                        {initials(a.causer.name)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-sm">{a.causer.name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">System</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        <Badge variant="outline" className={`gap-1 text-[11px] ${meta.classes}`}>
                                                            <Icon className="size-3" />
                                                            {meta.label}
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center gap-1.5">
                                                            <SubjectIcon className="size-3.5 text-muted-foreground" />
                                                            <span className="text-sm font-medium">
                                                                {a.subject.label ?? a.subject.type ?? '—'}
                                                            </span>
                                                            {a.subject.label && a.subject.type && (
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    ({a.subject.type})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                                                        {a.description}
                                                    </TableCell>
                                                </TableRow>

                                                {isOpen && hasChanges && (
                                                    <TableRow key={`${a.id}-details`} className="bg-muted/20 hover:bg-muted/20">
                                                        <TableCell colSpan={6} className="p-4">
                                                            <ChangeDiff old={a.changes.old} next={a.changes.attributes} />
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <Pagination links={activities.links} meta={activities.meta} />
                    </TabsContent>

                    {/* -------- TIMELINE VIEW -------- */}
                    <TabsContent value="timeline" className="space-y-6">
                        {Object.keys(groupedByDate).length === 0 && (
                            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                                <History className="mx-auto mb-2 size-6 text-muted-foreground/40" />
                                {hasActiveFilters ? 'No activity matches these filters.' : 'No activity recorded yet.'}
                            </div>
                        )}

                        {Object.entries(groupedByDate).map(([date, items]) => (
                            <div key={date} className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {formatDateHeading(date)}
                                    </div>
                                    <div className="h-px flex-1 bg-border" />
                                    <Badge variant="outline" className="text-[10px]">
                                        {items.length} {items.length === 1 ? 'event' : 'events'}
                                    </Badge>
                                </div>

                                <div className="relative pl-6">
                                    <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
                                    <div className="space-y-3">
                                        {items.map((a) => {
                                            const meta = eventMeta(a.event);
                                            const Icon = meta.icon;
                                            const SubjectIcon = subjectIcon(a.subject.type);

                                            return (
                                                <div key={a.id} className="relative">
                                                    <div className={`absolute -left-[22px] top-2 flex size-4 items-center justify-center rounded-full border-2 border-background ${meta.classes}`}>
                                                        <Icon className="size-2" />
                                                    </div>

                                                    <Card className="border shadow-xs">
                                                        <CardContent className="p-3 space-y-1">
                                                            <div className="flex items-center gap-2 text-sm">
                                                                {a.causer ? (
                                                                    <span className="font-medium">{a.causer.name}</span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">System</span>
                                                                )}
                                                                <span className="text-muted-foreground">{meta.label.toLowerCase()}</span>
                                                                <SubjectIcon className="size-3 text-muted-foreground" />
                                                                <span className="font-medium">
                                                                    {a.subject.label ?? a.subject.type ?? '—'}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {a.description} · {a.created_at_human}
                                                            </div>
                                                            {(Object.keys(a.changes.attributes).length > 0) && (
                                                                <ChangeInline old={a.changes.old} next={a.changes.attributes} compact />
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </TabsContent>

                    {/* -------- CHART VIEW -------- */}
                    <TabsContent value="chart">
                        <Card className="border">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold">Activity per day</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Range: {chart[0]?.day ?? '—'} → {chart[chart.length - 1]?.day ?? '—'}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px]">
                                        {chart.reduce((s, d) => s + d.total, 0)} total
                                    </Badge>
                                </div>

                                <div className="flex items-end gap-1.5 h-56 border-b border-border pb-1">
                                    {chart.map((d) => (
                                        <div key={d.day} className="group flex flex-1 flex-col items-center justify-end h-full">
                                            <div className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100">
                                                {d.total}
                                            </div>
                                            <div
                                                className="w-full rounded-t bg-primary/50 group-hover:bg-primary transition-colors min-h-[2px]"
                                                style={{ height: `${(d.total / maxChartTotal) * 100}%` }}
                                                title={`${d.day}: ${d.total}`}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-2 flex gap-1.5">
                                    {chart.map((d) => (
                                        <div key={d.day} className="flex-1 text-center text-[10px] text-muted-foreground font-mono">
                                            {d.day.slice(5).replace('-', '/')}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

/* ---------- subcomponents ---------- */

function ChangeDiff({ old, next }: { old: Record<string, unknown>; next: Record<string, unknown> }) {
    const keys = Array.from(new Set([...Object.keys(old), ...Object.keys(next)])).sort();
    if (keys.length === 0) {
        return <div className="text-xs text-muted-foreground">No field-level changes recorded.</div>;
    }

    return (
        <div className="rounded-md border bg-background">
            <div className="grid grid-cols-12 gap-0 border-b bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <div className="col-span-3">Field</div>
                <div className="col-span-4">Before</div>
                <div className="col-span-1" />
                <div className="col-span-4">After</div>
            </div>
            <div className="divide-y">
                {keys.map((key) => (
                    <div key={key} className="grid grid-cols-12 gap-0 items-center px-3 py-2 text-xs">
                        <div className="col-span-3 font-mono text-muted-foreground truncate" title={key}>{key}</div>
                        <div className="col-span-4 font-mono text-destructive/80 truncate" title={stringify(old[key])}>
                            {renderValue(old[key])}
                        </div>
                        <div className="col-span-1 flex justify-center text-muted-foreground">
                            <ArrowRight className="size-3" />
                        </div>
                        <div className="col-span-4 font-mono text-emerald-600 dark:text-emerald-400 truncate" title={stringify(next[key])}>
                            {renderValue(next[key])}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ChangeInline({ old, next, compact }: { old: Record<string, unknown>; next: Record<string, unknown>; compact?: boolean }) {
    const keys = Array.from(new Set([...Object.keys(old), ...Object.keys(next)])).sort().slice(0, compact ? 3 : undefined);
    return (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
            {keys.map((key) => (
                <span key={key} className="inline-flex items-center gap-1">
                    <span className="font-mono text-muted-foreground">{key}:</span>
                    <span className="font-mono line-through text-destructive/70">{stringify(old[key])}</span>
                    <ArrowRight className="size-2.5 text-muted-foreground" />
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{stringify(next[key])}</span>
                </span>
            ))}
        </div>
    );
}

function Pagination({ links, meta }: { links: PaginatedActivities['links']; meta: PaginatedActivities['meta'] }) {
    if (meta.last_page <= 1) return null;
    return (
        <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
                Page {meta.current_page} of {meta.last_page} · {meta.total} total
            </div>
            <div className="flex items-center gap-1">
                {links.map((link, i) =>
                    link.url ? (
                        <Link
                            key={i}
                            href={link.url}
                            preserveState
                            preserveScroll
                            className={`rounded-md px-2.5 py-1 text-xs ${link.active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ) : (
                        <span key={i} className="rounded-md px-2.5 py-1 text-xs text-muted-foreground/50" dangerouslySetInnerHTML={{ __html: link.label }} />
                    )
                )}
            </div>
        </div>
    );
}

/* ---------- small utils ---------- */

function renderValue(v: unknown): string {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
}

function stringify(v: unknown): string {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

function formatDateHeading(iso: string): string {
    if (iso === 'unknown') return 'Unknown date';
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

AdminActivityIndex.layout = {
    breadcrumbs: [
        { title: 'Activity Log', href: adminactivity.index().url },
    ],
};