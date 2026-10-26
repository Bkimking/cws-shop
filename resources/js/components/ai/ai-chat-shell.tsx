import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Settings, ShieldCheck, Sparkles } from 'lucide-react';
import { Composer } from '@/components/ai/composer';
import { ChatThread } from '@/components/ai/chat-thread';
import { formatAiError } from '@/lib/ai-error';
import { useAiChat } from '@/hooks/use-ai-chat';
import type {
    AiConversation,
    AiProviderStatus,
    AiScope,
    AiUsage,
} from '@/types/ai';
import type { UIMessage } from 'ai';

const suggestions = [
    {
        label: 'Sales check',
        prompt: 'How did we do this week?',
    },
    {
        label: 'Stock risk',
        prompt: 'What is almost out of stock?',
    },
    {
        label: 'Refund review',
        prompt: 'Show refunds from the last 7 days',
    },
    {
        label: 'Order attention',
        prompt: 'Which orders need attention?',
    },
];

function ScopeChip({ scope }: { scope: AiScope }) {
    return (
        <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-ai-border/40 bg-ai/10 px-3 py-1.5 text-[11px] text-foreground">
            <Sparkles className="size-3 shrink-0 text-ai" />
            <span className="shrink-0 text-muted-foreground">Scope</span>
            <span className="truncate font-medium">{scope.label}</span>
        </div>
    );
}

export function AiChatShell({
    conversations: initialConversations,
    activeId,
    initialMessages,
    scope,
    canUse,
    aiEnabled,
    providerConfigured,
    providers,
    usage,
    canManage,
}: {
    conversations: AiConversation[];
    activeId: string | null;
    initialMessages: UIMessage[];
    scope: AiScope;
    canUse: boolean;
    aiEnabled: boolean;
    providerConfigured: boolean;
    providers: AiProviderStatus[];
    usage: AiUsage;
    canManage: boolean;
}) {
    const [conversations, setConversations] = useState(initialConversations);
    const [currentId, setCurrentId] = useState(activeId);

    const {
        messages,
        sendMessage,
        stop,
        addToolApprovalResponse,
        status,
        isBusy,
        error,
    } = useAiChat({
        conversationId: activeId,
        initialMessages,
        onConversationCreated: (conversation) => {
            setCurrentId(conversation.id);
            setConversations((items) => [
                {
                    ...conversation,
                    updated_at: new Date().toISOString(),
                },
                ...items,
            ]);
        },
    });

    const disabled = !canUse || !aiEnabled || !providerConfigured;
    const usagePercent =
        usage.token_cap && usage.token_cap > 0
            ? Math.min(
                  100,
                  Math.round((usage.tokens_used / usage.token_cap) * 100),
              )
            : 0;
    const configuredProviders = providers.filter(
        (provider) => provider.configured,
    );
    const providerLabel =
        configuredProviders.length > 1
            ? `${configuredProviders.length} providers`
            : (configuredProviders[0]?.provider ?? 'No provider');
    const providerChain = providers
        .map(
            (provider) =>
                `${provider.provider}${provider.configured ? '' : ' (key missing)'}`,
        )
        .join(' → ');

    return (
        <div className="flex h-full min-h-0 overflow-hidden">
            <aside className="hidden min-h-0 w-72 shrink-0 flex-col border-r border-border/60 bg-card/20 lg:flex">
                <div className="border-b border-border/60 px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-ai/15 text-ai">
                                <Sparkles className="size-3.5" />
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-foreground">
                                    Conversations
                                </p>
                                <p className="font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
                                    {conversations.length} saved
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/admin/ai"
                            className="shrink-0 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:border-ai-border hover:bg-ai/10"
                        >
                            New
                        </Link>
                    </div>
                </div>

                <div className="flex-1 scrollbar-thin overflow-y-auto p-2">
                    {conversations.length === 0 ? (
                        <div className="px-3 py-8 text-center">
                            <p className="text-xs font-medium text-foreground">
                                No conversations yet
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                Start with a question below.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {conversations.map((conversation) => (
                                <Link
                                    key={conversation.id}
                                    href={`/admin/ai/${conversation.id}`}
                                    className={`block truncate border-l-2 py-2 pr-2 pl-2.5 text-xs transition-colors ${
                                        conversation.id === currentId
                                            ? 'border-ai bg-ai/10 text-foreground'
                                            : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                    }`}
                                >
                                    {conversation.title}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-border/60 px-3 py-2.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Daily usage</span>
                        <span className="font-mono text-foreground">
                            {usage.tokens_used.toLocaleString()}
                            {usage.token_cap
                                ? ` / ${usage.token_cap.toLocaleString()}`
                                : ''}
                        </span>
                    </div>
                    {usage.token_cap ? (
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-ai transition-[width]"
                                style={{ width: `${usagePercent}%` }}
                            />
                        </div>
                    ) : null}
                </div>
            </aside>

            <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
                    <div className="min-w-0">
                        <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                            Assistant
                        </p>
                        <h1 className="mt-0.5 truncate text-sm font-semibold text-foreground">
                            {messages.length > 0
                                ? 'Conversation'
                                : 'Ask your live data'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <span
                            title={providerChain}
                            className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[10px] text-muted-foreground md:inline-flex"
                        >
                            <span
                                className={`size-1.5 rounded-full ${
                                    configuredProviders.length > 0
                                        ? 'bg-success'
                                        : 'bg-warning'
                                }`}
                            />
                            {providerLabel}
                        </span>
                        <span className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[10px] text-muted-foreground sm:inline-flex">
                            <span className="size-1.5 rounded-full bg-ai" />
                            Live records
                        </span>
                        {canManage && (
                            <Link
                                href="/admin/ai/settings"
                                aria-label="AI settings"
                                className="rounded-lg border border-border/60 p-1.5 text-muted-foreground transition-colors hover:border-ai-border hover:bg-ai/10 hover:text-foreground"
                            >
                                <Settings className="size-4" />
                            </Link>
                        )}
                    </div>
                </header>

                {!aiEnabled && (
                    <div className="border-b border-border/60 bg-muted/30 px-5 py-2 text-xs text-muted-foreground">
                        AI assistant is turned off for this surface.
                    </div>
                )}

                {aiEnabled && !providerConfigured && (
                    <div className="border-b border-border/60 bg-amber-500/10 px-5 py-2 text-xs text-amber-700 dark:text-amber-300">
                        Add a provider API key to start chatting.
                    </div>
                )}

                {aiEnabled && providerConfigured && !canUse && (
                    <div className="border-b border-border/60 bg-muted/30 px-5 py-2 text-xs text-muted-foreground">
                        You do not have access to an AI specialist. Ask an
                        administrator for reports, stock, orders or insights
                        access.
                    </div>
                )}

                <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto px-5 py-8">
                    {messages.length === 0 ? (
                        <div className="mx-auto flex h-full max-w-[42rem] flex-col items-center justify-center gap-6 text-center">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-3xl bg-ai/25 blur-2xl" />
                                <div className="relative flex size-14 items-center justify-center rounded-2xl border border-ai-border/40 bg-ai/15 text-ai">
                                    <Sparkles className="size-7" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="font-mono text-[10px] tracking-[0.26em] text-ai uppercase">
                                    AI workspace
                                </p>
                                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                                    What should we look at?
                                </h2>
                                <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                                    I can check sales, stock, orders, refunds
                                    and till activity in {scope.label}.
                                </p>
                            </div>

                            <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={suggestion.prompt}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() =>
                                            void sendMessage(suggestion.prompt)
                                        }
                                        className="group rounded-xl border border-border/70 bg-card/70 px-4 py-3 text-left transition-colors hover:border-ai-border hover:bg-ai/10 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <span className="mb-1 block font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
                                            0{index + 1} · {suggestion.label}
                                        </span>
                                        <span className="text-sm text-foreground">
                                            {suggestion.prompt}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <p className="text-[11px] text-muted-foreground">
                                Scope: {scope.label} · Read-only tools
                            </p>
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

                <div className="shrink-0 border-t border-border/60 bg-background/50 px-4 pt-3 pb-4 backdrop-blur">
                    {error && (
                        <div className="mx-auto mb-2 max-w-[46rem] rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
                            {formatAiError(error)}
                        </div>
                    )}

                    <div className="mx-auto mb-2 flex max-w-[46rem] items-center justify-between gap-2">
                        <ScopeChip scope={scope} />
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[10px] text-muted-foreground">
                            <ShieldCheck className="size-3 text-ai" />
                            Read-only tools
                        </span>
                    </div>

                    <Composer
                        onSend={(message) => void sendMessage(message)}
                        onStop={stop}
                        isBusy={isBusy}
                        disabled={disabled}
                    />
                </div>
            </section>
        </div>
    );
}
