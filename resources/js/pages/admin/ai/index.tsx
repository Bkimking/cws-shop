import { Head } from '@inertiajs/react';
import { AiChatShell } from '@/components/ai/ai-chat-shell';
import type { AiCenterProps } from '@/types/ai';

export default function AiCenter({
    conversations,
    activeConversation,
    messages,
    scope,
    can,
    aiEnabled,
    providerConfigured,
    providers,
    usage,
}: AiCenterProps) {
    return (
        <>
            <Head title="AI assistant" />
            <div className="h-full min-h-0">
                <AiChatShell
                    key={activeConversation?.id ?? 'new'}
                    conversations={conversations}
                    activeId={activeConversation?.id ?? null}
                    initialMessages={messages}
                    scope={scope}
                    canUse={can.use}
                    aiEnabled={aiEnabled}
                    providerConfigured={providerConfigured}
                    providers={providers}
                    usage={usage}
                    canManage={can.manage}
                />
            </div>
        </>
    );
}
