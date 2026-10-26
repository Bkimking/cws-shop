import { Head, Link } from '@inertiajs/react';
import type { UIMessage } from 'ai';
import { ArrowLeft, Sparkles, ShoppingBag } from 'lucide-react';
import { ChatThread } from '@/components/ai/chat-thread';
import { Composer } from '@/components/ai/composer';
import { formatAiError } from '@/lib/ai-error';
import { useShopChat } from '@/hooks/use-shop-chat';

const suggestions = [
    'I need milk and bread',
    'What is in stock today?',
    'Show me something for breakfast',
];

export default function ShopAssistant({
    branch,
    conversationId,
    initialMessages,
    latestOrder,
    aiEnabled,
    providerConfigured,
}: {
    branch: { id: number; name: string; currency: string };
    conversationId: string;
    initialMessages: UIMessage[];
    latestOrder: {
        number: string;
        public_token: string;
        status: string;
        pickup_status: string;
        payment_status: string | null;
        pickup: string | null;
        ready: boolean;
    } | null;
    aiEnabled: boolean;
    providerConfigured: boolean;
}) {
    const { messages, sendMessage, stop, status, isBusy, error } = useShopChat({
        conversationId,
        initialMessages,
    });
    const disabled = !aiEnabled || !providerConfigured;

    return (
        <>
            <Head title="Shop assistant" />
            <div className="mx-auto flex min-h-[calc(100dvh-16rem)] w-full max-w-4xl flex-col px-4 py-8 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <Link
                            href="/shop"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="size-3.5" /> Shop
                        </Link>
                        <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold tracking-tight">
                            <Sparkles className="size-5 text-primary" />
                            Shop assistant
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {branch.name} pickup · {branch.currency}
                        </p>
                    </div>
                    <Link
                        href="/shop/cart"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <ShoppingBag className="size-3.5" /> Cart
                    </Link>
                </div>

                {latestOrder && (
                    <Link
                        href={`/shop/orders/${latestOrder.public_token}`}
                        className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 transition-colors hover:border-primary/40"
                    >
                        <div>
                            <p className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                                Your latest order
                            </p>
                            <p className="mt-0.5 text-sm font-medium">
                                {latestOrder.number} ·{' '}
                                {latestOrder.ready
                                    ? 'Ready for pickup'
                                    : latestOrder.status === 'pending'
                                      ? 'Payment pending'
                                      : latestOrder.status}
                            </p>
                            {latestOrder.pickup && (
                                <p className="text-[11px] text-muted-foreground">
                                    {latestOrder.pickup}
                                </p>
                            )}
                        </div>
                        <span className="text-xs text-primary">
                            View order →
                        </span>
                    </Link>
                )}

                <div className="mt-8 flex-1 rounded-3xl border border-border/70 bg-card p-4 sm:p-6">
                    {messages.length === 0 ? (
                        <div className="flex min-h-[24rem] flex-col items-center justify-center gap-5 text-center">
                            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Sparkles className="size-7" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-semibold">
                                    What can I help you find?
                                </h2>
                                <p className="max-w-md text-sm text-muted-foreground">
                                    Ask for products, build a cart, and I will
                                    take you to checkout for M-Pesa payment.
                                </p>
                            </div>
                            <div className="flex max-w-xl flex-wrap justify-center gap-2">
                                {suggestions.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() =>
                                            void sendMessage(suggestion)
                                        }
                                        className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                            {!aiEnabled && (
                                <p className="text-xs text-destructive">
                                    The shop assistant is turned off.
                                </p>
                            )}
                            {!providerConfigured && (
                                <p className="text-xs text-destructive">
                                    Add an AI provider key to start chatting.
                                </p>
                            )}
                        </div>
                    ) : (
                        <ChatThread messages={messages} status={status} />
                    )}
                </div>

                <div className="mt-3">
                    {error && (
                        <p className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            {formatAiError(error)}
                        </p>
                    )}
                    <Composer
                        onSend={(message) => void sendMessage(message)}
                        onStop={stop}
                        isBusy={isBusy}
                        disabled={disabled}
                        placeholder="Ask for a product, or say what you need…"
                    />
                    <p className="mt-2 text-center text-[10px] text-muted-foreground">
                        Payment happens on the checkout page. The assistant
                        cannot charge your phone directly.
                    </p>
                </div>
            </div>
        </>
    );
}
