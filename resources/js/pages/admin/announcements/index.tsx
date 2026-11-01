import { Head, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Announcement = {
    id: number;
    title: string;
    body: string;
    type: string;
    pinned: boolean;
    download_url: string | null;
    published_at: string | null;
    read_at: string | null;
};

export default function AnnouncementsPage({
    announcements,
}: {
    announcements: Announcement[];
}) {
    return (
        <>
            <Head title="Announcements" />
            <div className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
                <div>
                    <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                        Office
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold">
                        Announcements
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Updates and releases from the developer portal.
                    </p>
                </div>

                {announcements.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-sm text-muted-foreground">
                            No announcements yet.
                        </CardContent>
                    </Card>
                ) : (
                    announcements.map((item) => (
                        <Card
                            key={item.id}
                            className={item.pinned ? 'border-primary/40' : ''}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    {item.pinned && <Badge>Pinned</Badge>}
                                    <Badge variant="outline">{item.type}</Badge>
                                    <CardTitle className="text-base">
                                        {item.title}
                                    </CardTitle>
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        {item.published_at?.slice(0, 10)}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                                    {item.body}
                                </p>
                                <div className="flex gap-2">
                                    {item.download_url && (
                                        <Button asChild size="sm">
                                            <a
                                                href={item.download_url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Download
                                            </a>
                                        </Button>
                                    )}
                                    {item.read_at === null && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                router.post(
                                                    `/admin/announcements/${item.id}/read`,
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            Mark read
                                        </Button>
                                    )}
                                    {item.read_at !== null && (
                                        <span className="text-xs text-muted-foreground">
                                            Read
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </>
    );
}

AnnouncementsPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/admin' },
        { title: 'Announcements', href: '/admin/announcements' },
    ],
};
