import { usePage } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AiShared } from '@/types/ai';

export function AiPanelTrigger() {
    const page = usePage();
    const ai = (page.props as { ai?: AiShared }).ai;

    if (!ai?.enabled || !ai?.can_use) {
        return null;
    }

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-ai hover:bg-ai/10 hover:text-ai"
            aria-label="Open AI assistant (Command J)"
            title="AI assistant (⌘J)"
            onClick={() => window.dispatchEvent(new Event('ai-panel:open'))}
        >
            <Sparkles className="size-4" />
        </Button>
    );
}
