import { useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';

function csrfToken(): string {
    if (typeof document === 'undefined') return '';
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
}

export function useShopChat({
    conversationId,
    initialMessages = [],
}: {
    conversationId: string;
    initialMessages?: UIMessage[];
}) {
    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: '/shop/assistant/chat',
                credentials: 'same-origin',
                headers: {
                    Accept: 'text/event-stream',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                prepareSendMessagesRequest: ({ messages }) => ({
                    body: { conversation_id: conversationId, messages },
                    headers: {
                        Accept: 'text/event-stream',
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                }),
            }),
        [conversationId],
    );

    const chat = useChat({ messages: initialMessages, transport });

    return {
        messages: chat.messages,
        sendMessage: (text: string) => chat.sendMessage({ text }),
        stop: () => void chat.stop(),
        status: chat.status,
        isBusy: chat.status === 'submitted' || chat.status === 'streaming',
        error: chat.error?.message ?? null,
    };
}
