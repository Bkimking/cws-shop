import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { TourDialog } from '@/components/tour/tour-dialog';
import type { TourShared } from '@/types/tour';

export function GuidedTour() {
    const page = usePage<{ tour: TourShared }>();
    const { tour } = page.props;
    const [open, setOpen] = useState(false);
    const resumeIndex = Math.max(
        0,
        tour?.steps?.findIndex((step) => step.key === tour.resume_step) ?? 0,
    );

    useEffect(() => {
        const path = page.url.split('?')[0];
        setOpen(Boolean(tour?.should_prompt) && path !== '/admin/guide');
    }, [page.url, tour?.should_prompt]);

    if (!tour?.steps?.length || page.url.split('?')[0] === '/admin/guide') {
        return null;
    }

    const complete = () => {
        router.post(
            '/admin/guide/complete',
            {},
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
            },
        );
    };

    const skip = () => {
        router.post(
            '/admin/guide/skip',
            {},
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
            },
        );
    };

    const progress = (
        stepKey: string,
        completed: boolean,
        nextStepKey?: string,
    ) => {
        router.post(
            '/admin/guide/step',
            {
                step_key: stepKey,
                completed,
                next_step_key: nextStepKey,
            },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['tour'],
            },
        );
    };

    return (
        <TourDialog
            open={open}
            onOpenChange={setOpen}
            steps={tour.steps}
            startAt={resumeIndex}
            showIntro
            started={tour.started}
            onComplete={complete}
            onSkip={skip}
            onStepChange={progress}
        />
    );
}
