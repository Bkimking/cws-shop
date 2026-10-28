import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';
import { FlashMessageObserver } from '@/hooks/use-flash-toast';
import { AiPanelProvider } from '@/components/ai/ai-panel-provider';
import { GuidedTour } from '@/components/tour/guided-tour';
import { TwoFactorReminder } from '@/components/two-factor-reminder';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs}>
            <AiPanelProvider>
                <FlashMessageObserver />
                <TwoFactorReminder />
                <GuidedTour />
                {children}
            </AiPanelProvider>
        </AppLayoutTemplate>
    );
}
