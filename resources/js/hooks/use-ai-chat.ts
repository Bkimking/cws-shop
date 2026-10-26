import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';

type AiChatContext = {
    type: 'order' | 'product' | 'stock_level';
    id: number;
};

type UseAiChatOptions = {
    conversationId?: string | null;
    initialMessages?: UIMessage[];
    context?: AiChatContext | null;
    onConversationCreated?: (conversation: {
        id: string;
        title: string;
    }) => void;
};

function hasToolState(messages: UIMessage[], state: string): boolean {
    return messages.some((message) =>
        message.parts.some(
            (part) =>
                (part.type.startsWith('tool-') ||
                    part.type === 'dynamic-tool') &&
                (part as { state?: string }).state === state,
        ),
    );
}

function csrfToken(): string {
    if (typeof document === 'undefined') {
        return '';
    }

    return (
        document
            .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? ''
    );
}

export function useAiChat({
    conversationId: initialConversationId = null,
    initialMessages = [],
    context = null,
    onConversationCreated,
}: UseAiChatOptions = {}) {
    const conversationRef = useRef<string | null>(initialConversationId);
    const [conversationId, setConversationId] = useState<string | null>(
        initialConversationId,
    );
    const [creating, setCreating] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        conversationRef.current = initialConversationId;
        setConversationId(initialConversationId);
    }, [initialConversationId]);

    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: '/admin/ai/chat',
                credentials: 'same-origin',
                headers: {
                    Accept: 'text/event-stream',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                prepareSendMessagesRequest: ({ messages, body }) => ({
                    body: {
                        ...(body ?? {}),
                        conversation_id: conversationRef.current,
                        messages,
                        surface: 'admin_chat',
                        ...(context ? { context } : {}),
                    },
                    headers: {
                        Accept: 'text/event-stream',
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                }),
            }),
        [context],
    );

    const chat = useChat({
        messages: initialMessages,
        transport,
        onError: (error) => setLocalError(error.message),
        sendAutomaticallyWhen: ({ messages }) =>
            hasToolState(messages, 'approval-responded') &&
            !hasToolState(messages, 'approval-requested'),
    });

    const sendMessage = useCallback(
        async (text: string) => {
            const message = text.trim();

            if (
                message === '' ||
                creating ||
                chat.status === 'submitted' ||
                chat.status === 'streaming'
            ) {
                return;
            }

            setLocalError(null);
            setCreating(true);

            try {
                if (!conversationRef.current) {
                    const response = await fetch('/admin/ai/conversations', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken(),
                        },
                        body: JSON.stringify({ message }),
                    });

                    const payload = (await response
                        .json()
                        .catch(() => ({}))) as {
                        id?: string;
                        title?: string;
                        message?: string;
                    };

                    if (!response.ok || !payload.id) {
                        throw new Error(
                            payload.message ??
                                'Could not start a conversation.',
                        );
                    }

                    conversationRef.current = payload.id;
                    setConversationId(payload.id);
                    onConversationCreated?.({
                        id: payload.id,
                        title: payload.title ?? 'New chat',
                    });

                    window.history.replaceState(
                        {},
                        '',
                        `/admin/ai/${payload.id}`,
                    );
                }

                await chat.sendMessage({ text: message });
            } catch (error) {
                setLocalError(
                    error instanceof Error
                        ? error.message
                        : 'That did not work. Try again.',
                );
            } finally {
                setCreating(false);
            }
        },
        [chat, creating, onConversationCreated],
    );

    const stop = useCallback(() => {
        void chat.stop();
    }, [chat]);

    const isBusy =
        creating || chat.status === 'submitted' || chat.status === 'streaming';

    return {
        messages: chat.messages,
        sendMessage,
        stop,
        addToolApprovalResponse: chat.addToolApprovalResponse,
        status: chat.status,
        isBusy,
        error: localError ?? chat.error?.message ?? null,
        clearError: () => {
            setLocalError(null);
            chat.clearError();
        },
        conversationId,
    };
}
