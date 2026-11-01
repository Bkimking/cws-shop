import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

type Ticket = {
    id: number;
    portal_ticket_id: number | null;
    subject: string;
    status: string;
    last_message_at: string | null;
    messages: Array<{
        id: number;
        sender_type: string;
        sender_name: string | null;
        body: string;
        created_at: string | null;
    }>;
};

export default function SupportPage({ tickets }: { tickets: Ticket[] }) {
    const [selected, setSelected] = useState<Ticket | null>(tickets[0] ?? null);
    const [body, setBody] = useState('');
    const [subject, setSubject] = useState('');
    const [newBody, setNewBody] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const timer = window.setInterval(() => {
            router.reload({ only: ['tickets'] });
        }, 15000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        if (selected === null && tickets.length > 0) setSelected(tickets[0]);
    }, [tickets, selected]);

    const send = () => {
        if (!selected || !body.trim()) return;
        router.post(
            `/admin/support/${selected.id}/reply`,
            { body },
            {
                preserveScroll: true,
                onSuccess: () => setBody(''),
            },
        );
    };

    const create = () => {
        if (!subject.trim() || !newBody.trim()) return;
        router.post(
            '/admin/support',
            { subject, body: newBody },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSubject('');
                    setNewBody('');
                    setCreating(false);
                },
            },
        );
    };

    return (
        <>
            <Head title="Support" />
            <div className="grid min-h-[calc(100vh-4rem)] gap-4 p-4 md:grid-cols-[300px_1fr]">
                <Card className="overflow-hidden">
                    <CardHeader className="border-b border-border/60 p-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Support</CardTitle>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCreating((value) => !value)}
                            >
                                New
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Only Superadmin can see this page.
                        </p>
                    </CardHeader>
                    {creating && (
                        <div className="space-y-2 border-b border-border/60 p-3">
                            <Input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Subject"
                            />
                            <Textarea
                                value={newBody}
                                onChange={(e) => setNewBody(e.target.value)}
                                placeholder="Describe the issue…"
                                rows={3}
                            />
                            <Button
                                size="sm"
                                className="w-full"
                                onClick={create}
                            >
                                Create ticket
                            </Button>
                        </div>
                    )}
                    <div className="max-h-[60vh] overflow-y-auto">
                        {tickets.length === 0 ? (
                            <p className="p-6 text-sm text-muted-foreground">
                                No tickets. Create one or wait for the portal
                                sync.
                            </p>
                        ) : (
                            tickets.map((ticket) => (
                                <button
                                    key={ticket.id}
                                    type="button"
                                    onClick={() => setSelected(ticket)}
                                    className={`block w-full border-b border-border/50 p-3 text-left hover:bg-muted/50 ${selected?.id === ticket.id ? 'bg-muted' : ''}`}
                                >
                                    <span className="flex items-center justify-between gap-2 text-sm font-medium">
                                        <span className="truncate">
                                            #{ticket.id} {ticket.subject}
                                        </span>
                                        <Badge variant="outline">
                                            {ticket.status}
                                        </Badge>
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </Card>

                <Card className="flex min-h-[60vh] flex-col">
                    {selected === null ? (
                        <CardContent className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                            Select a ticket.
                        </CardContent>
                    ) : (
                        <>
                            <CardHeader className="border-b border-border/60 p-4">
                                <CardTitle className="text-base">
                                    #{selected.id} {selected.subject}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    Thread synced with the developer portal.
                                </p>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-3 overflow-y-auto p-4">
                                {selected.messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`max-w-[85%] rounded-xl p-3 text-sm ${message.sender_type === 'cws' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'}`}
                                    >
                                        <p className="mb-1 text-[10px] opacity-70">
                                            {message.sender_name ??
                                                message.sender_type}
                                        </p>
                                        <p className="whitespace-pre-wrap">
                                            {message.body}
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                            <div className="border-t border-border/60 p-3">
                                <Textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Reply to the developer…"
                                    rows={3}
                                />
                                <div className="mt-2 flex justify-end">
                                    <Button
                                        size="sm"
                                        onClick={send}
                                        disabled={!body.trim()}
                                    >
                                        Send reply
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </Card>
            </div>
        </>
    );
}

SupportPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/admin' },
        { title: 'Support', href: '/admin/support' },
    ],
};
