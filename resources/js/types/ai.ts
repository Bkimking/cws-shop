import type { UIMessage } from 'ai';

export type AiConversation = {
    id: string;
    title: string;
    updated_at: string | null;
};

export type AiScope = {
    label: string;
    region_id: number | null;
    branch_id: number | null;
    currency: string;
    timezone: string;
};

export type AiShared = {
    enabled: boolean;
    can_use: boolean;
    can_view_insights: boolean;
    can_manage: boolean;
    provider_configured: boolean;
};

export type AiProviderStatus = {
    provider: string;
    model: string | null;
    configured: boolean;
    primary: boolean;
};

export type AiUsage = {
    tokens_used: number;
    token_cap: number | null;
    cost_used: number;
    cost_cap: number | null;
};

export type AiCenterProps = {
    conversations: AiConversation[];
    activeConversation: { id: string; title: string | null } | null;
    messages: UIMessage[];
    scope: AiScope;
    regions: Array<{
        id: number;
        name: string;
        currency_code: string;
        branches: Array<{ id: number; name: string; region_id: number }>;
    }>;
    can: {
        use: boolean;
        manage: boolean;
        insights: boolean;
    };
    aiEnabled: boolean;
    providerConfigured: boolean;
    providers: AiProviderStatus[];
    usage: AiUsage;
};
