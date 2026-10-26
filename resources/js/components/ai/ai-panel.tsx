import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Maximize2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Composer } from '@/components/ai/composer';
import { ChatThread } from '@/components/ai/chat-thread';
import { formatAiError } from '@/lib/ai-error';
import { useAiChat } from '@/hooks/use-ai-chat';
import type { AiShared } from '@/types/ai';

const panelSuggestions = [
    'How did today go?',
    'What is low on stock?',
    'Show unpaid orders',
];

export function AiPanel({ onClose }: { onClose: () => void }) {
    const page = usePage();
    const ai = (page.props as { ai?: AiShared }).ai;
    const [centerHref, setCenterHref] = useState('/admin/ai');
    const {
        messages,
        sendMessage,
        stop,
        addToolApprovalResponse,
        status,
        isBusy,
        error,
        conversationId,
    } = useAiChat({
        onConversationCreated: (conversation) => {
            setCenterHref(`/admin/ai/${conversation.id}`);
        },
    });

    return (
        <>
            <button
                type="button"
                aria-label="Close AI panel"
                className="fixed inset-0 z-40 bg-black/30"
                onClick={onClose}
            />
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="AI assistant"
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-border/60 bg-background shadow-2xl"
            >
                <header className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-ai" />
                        <div>
                            <p className="text-sm font-semibold">AI Panel</p>
                            <p className="text-[10px] text-muted-foreground">
                                ⌘J to toggle
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" asChild>
                            <Link
                                href={centerHref}
                                aria-label="Open in AI Center"
                            >
                                <Maximize2 className="size-4" />
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            aria-label="Close AI panel"
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                            <div className="ai-glow flex size-10 items-center justify-center rounded-xl bg-ai/10">
                                <Sparkles className="size-5 text-ai" />
                            </div>
                            <p className="max-w-[18rem] text-sm text-muted-foreground">
                                Ask about the page you are on, or anything in
                                your scope.
                            </p>
                            <div className="flex flex-wrap justify-center gap-1.5">
                                {panelSuggestions.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() =>
                                            void sendMessage(suggestion)
                                        }
                                        className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-ai-border hover:text-foreground"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <ChatThread
                            messages={messages}
                            status={status}
                            onApproval={(id, approved) =>
                                void addToolApprovalResponse({
                                    id,
                                    approved,
                                })
                            }
                        />
                    )}
                </div>

                <div className="border-t border-border/60 p-3">
                    {!ai?.provider_configured && (
                        <p className="mb-2 rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                            Add a provider API key to start chatting.
                        </p>
                    )}
                    {error && (
                        <p className="mb-2 rounded-md bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
                            {formatAiError(error)}
                        </p>
                    )}
                    <Composer
                        onSend={(message) => void sendMessage(message)}
                        onStop={stop}
                        isBusy={isBusy}
                        disabled={!ai?.provider_configured}
                        placeholder="Ask the assistant…"
                    />
                    {conversationId && (
                        <p className="mt-1 text-center text-[10px] text-muted-foreground">
                            Conversation saved ·{' '}
                            <Link href={centerHref} className="underline">
                                open full page
                            </Link>
                        </p>
                    )}
                </div>
            </aside>
        </>
    );
}
