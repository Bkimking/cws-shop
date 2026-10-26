import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ChevronRight,
    ChevronDown,
    Plus,
    Pencil,
    Trash2,
    CircleDot,
    User as UserIcon,
    Globe,
    Store,
    X,
    ArrowRight,
} from 'lucide-react';

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

interface ActivityTimelineProps {
    fetchUrl: string;
    subjectLabel?: string;
}

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
        default: return CircleDot;
    }
}

function formatChanges(changes: { old: Record<string, unknown>; attributes: Record<string, unknown> }) {
    const diff: Array<{ field: string; old: unknown; new: unknown }> = [];
    
    for (const key in changes.attributes) {
        if (key in changes.old) {
            if (changes.old[key] !== changes.attributes[key]) {
                diff.push({ field: key, old: changes.old[key], new: changes.attributes[key] });
            }
        } else {
            diff.push({ field: key, old: null, new: changes.attributes[key] });
        }
    }
    
    return diff;
}

export default function ActivityTimeline({ fetchUrl, subjectLabel }: ActivityTimelineProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    useEffect(() => {
        let mounted = true;
        
        fetch(fetchUrl)
            .then((res) => {
                if (!res.ok) throw new Error('Failed to load activity');
                return res.json();
            })
            .then((data: { activities: PaginatedActivities }) => {
                if (mounted) {
                    setActivities(data.activities.data);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (mounted) {
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => { mounted = false; };
    }, [fetchUrl]);

    const toggleRow = (id: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                <X className="mx-auto mb-2 size-6 text-destructive/50" />
                <p className="font-medium text-destructive">Failed to load activity</p>
                <p className="mt-1">{error}</p>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                <CircleDot className="mx-auto mb-2 size-6 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No activity recorded yet</p>
                <p className="mt-1">
                    {subjectLabel ? `No changes or audit events for ${subjectLabel}.` : 'No recent changes or audit events.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {activities.map((activity) => {
                const isExpanded = expanded.has(activity.id);
                const { icon: EventIcon, classes, label } = eventMeta(activity.event);
                const SubjectIcon = subjectIcon(activity.subject?.type);
                const changes = formatChanges(activity.changes);

                return (
                    <Card key={activity.id} className="border shadow-xs">
                        <CardContent className="p-4">
                            <div className="flex gap-3">
                                {/* Causer Avatar */}
                                {activity.causer ? (
                                    <Avatar className="size-8 shrink-0">
                                        <AvatarFallback className="text-xs bg-muted">
                                            {initials(activity.causer.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                        <CircleDot className="size-4 text-muted-foreground" />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium">
                                                    {activity.causer?.name ?? 'System'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {activity.description}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className={`gap-1 text-[10px] ${classes}`}>
                                                    <EventIcon className="size-3" />
                                                    {label}
                                                </Badge>
                                                {activity.subject?.label && (
                                                    <Badge variant="secondary" className="gap-1 text-[10px]">
                                                        <SubjectIcon className="size-3" />
                                                        {activity.subject.label}
                                                    </Badge>
                                                )}
                                                <span className="text-[11px] text-muted-foreground">
                                                    {activity.created_at_human}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Expand Button */}
                                        {changes.length > 0 && (
                                            <button
                                                onClick={() => toggleRow(activity.id)}
                                                className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="size-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="size-4 text-muted-foreground" />
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* Expanded Changes */}
                                    {isExpanded && changes.length > 0 && (
                                        <div className="mt-3 space-y-2 rounded-md border bg-muted/20 p-3">
                                            {changes.map((change, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs">
                                                    <span className="font-medium text-muted-foreground min-w-0 truncate">
                                                        {change.field}:
                                                    </span>
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        {change.old !== null && (
                                                            <>
                                                                <span className="text-muted-foreground line-through truncate">
                                                                    {String(change.old)}
                                                                </span>
                                                                <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                                                            </>
                                                        )}
                                                        <span className="font-medium text-foreground truncate">
                                                            {String(change.new)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
