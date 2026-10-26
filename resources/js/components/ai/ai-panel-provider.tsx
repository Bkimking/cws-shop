import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { AiPanel } from '@/components/ai/ai-panel';
import type { AiShared } from '@/types/ai';

export function AiPanelProvider({ children }: { children: React.ReactNode }) {
    const page = usePage();
    const ai = (page.props as { ai?: AiShared }).ai;
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!ai?.enabled || !ai?.can_use) {
            return;
        }

        const openPanel = () => setOpen(true);
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j') {
                event.preventDefault();
                setOpen((value) => !value);
            }

            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        window.addEventListener('ai-panel:open', openPanel);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('ai-panel:open', openPanel);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [ai?.enabled, ai?.can_use]);

    return (
        <>
            {children}
            {open && <AiPanel onClose={() => setOpen(false)} />}
        </>
    );
}
