import { Link, router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
    AppNotification,
    NotificationShared,
} from '@/types/notifications';

function timeAgo(value: string | null): string {
    if (!value) return '';
    const seconds = Math.max(
        1,
        Math.floor((Date.now() - new Date(value).getTime()) / 1000),
    );
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function NotificationItem({ notification }: { notification: AppNotification }) {
    const unread = notification.read_at === null;
    const title = notification.data.title ?? 'Notification';
    const message = notification.data.message ?? '';

    return (
        <DropdownMenuItem
            className="flex cursor-pointer items-start gap-3 p-3"
            onSelect={() => {
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
        >
            <span
                className={`mt-1 size-1.5 shrink-0 rounded-full ${unread ? 'bg-primary' : 'bg-transparent'}`}
            />
            <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium">
                        {title}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                        {timeAgo(notification.created_at)}
                    </span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[11px] text-muted-foreground">
                    {message}
                </span>
            </span>
        </DropdownMenuItem>
    );
}

export function NotificationBell() {
    const { notifications } = usePage<{ notifications: NotificationShared }>()
        .props;
    const unread = notifications?.unread ?? 0;
    const recent = notifications?.recent ?? [];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Notifications"
                    className="relative flex size-9 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                    <Bell className="size-4" />
                    {unread > 0 && (
                        <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                    <div>
                        <p className="text-xs font-semibold">Notifications</p>
                        <p className="text-[10px] text-muted-foreground">
                            {unread} unread
                        </p>
                    </div>
                    {unread > 0 && (
                        <button
                            type="button"
                            onClick={() =>
                                router.post(
                                    '/admin/notifications/read-all',
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                        >
                            <CheckCheck className="size-3" />
                            Mark all read
                        </button>
                    )}
                </div>
                {recent.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-10 text-muted-foreground">
                        <Inbox className="size-6 opacity-40" />
                        <p className="text-xs">No notifications yet.</p>
                    </div>
                ) : (
                    <div className="max-h-80 overflow-y-auto">
                        {recent.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                            />
                        ))}
                    </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    asChild
                    className="justify-center text-xs text-primary"
                >
                    <Link href="/admin/notifications">
                        View all notifications
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
