import { Head, router } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppNotification } from '@/types/notifications';

type Paginated<T> = {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

const timeAgo = (value: string | null) => {
    if (!value) return '';
    const seconds = Math.max(
        1,
        Math.floor((Date.now() - new Date(value).getTime()) / 1000),
    );
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

export default function NotificationsPage({
    notifications,
}: {
    notifications: Paginated<AppNotification>;
}) {
    const unread = notifications.data.filter(
        (notification) => notification.read_at === null,
    ).length;

    return (
        <>
            <Head title="Notifications" />
            <div className="mx-auto w-full max-w-4xl p-6">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-5">
                    <div className="flex items-start gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Bell className="size-5" />
                        </span>
                        <div>
                            <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                                Inbox
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                                Notifications
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {unread} unread · new orders, tills and system
                                activity.
                            </p>
                        </div>
                    </div>
                    {unread > 0 && (
                        <Button
                            size="sm"
                            onClick={() =>
                                router.post(
                                    '/admin/notifications/read-all',
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            <CheckCheck className="mr-1.5 size-4" />
                            Mark all read
                        </Button>
                    )}
                </div>

                <div className="mt-5 space-y-2">
                    {notifications.data.length === 0 ? (
                        <div className="rounded-2xl border border-border/60 bg-card px-4 py-16 text-center text-sm text-muted-foreground">
                            No notifications yet.
                        </div>
                    ) : (
                        notifications.data.map((notification) => {
                            const unread = notification.read_at === null;
                            const title =
                                notification.data.title ?? 'Notification';
                            const message = notification.data.message ?? '';

                            return (
                                <button
                                    key={notification.id}
                                    type="button"
                                    onClick={() => {
                                        if (unread) {
                                            router.post(
                                                `/admin/notifications/${notification.id}/read`,
                                                {},
                                                { preserveScroll: true },
                                            );
                                        }
                                        if (notification.data.url) {
                                            router.visit(notification.data.url);
                                        }
                                    }}
                                    className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${unread ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-card'}`}
                                >
                                    <span
                                        className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? 'bg-primary' : 'bg-border'}`}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-sm font-medium">
                                                {title}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {timeAgo(
                                                    notification.created_at,
                                                )}
                                            </span>
                                        </span>
                                        <span className="mt-1 block text-xs text-muted-foreground">
                                            {message}
                                        </span>
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                {notifications.links.length > 3 && (
                    <div className="mt-6 flex flex-wrap justify-center gap-1">
                        {notifications.links.map((link, index) =>
                            link.url ? (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => router.visit(link.url!)}
                                    className={`rounded-md px-2.5 py-1 text-xs ${link.active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            ) : (
                                <span
                                    key={index}
                                    className="px-2.5 py-1 text-xs text-muted-foreground/50"
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            ),
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

NotificationsPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/admin' },
        { title: 'Notifications', href: '/admin/notifications' },
    ],
};
