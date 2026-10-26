import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpRight,
    CheckCircle2,
    Compass,
    Play,
    RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { TourDialog, tourIconMap } from '@/components/tour/tour-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { TourStep } from '@/types/tour';

export default function GuidePage({
    steps,
    completedAt,
    skippedAt,
    completedSteps = [],
    currentStep = null,
}: {
    steps: TourStep[];
    completedAt: string | null;
    skippedAt: string | null;
    completedSteps?: string[];
    currentStep?: string | null;
}) {
    const [open, setOpen] = useState(false);
    const [startAt, setStartAt] = useState(0);
    const [showIntro, setShowIntro] = useState(true);

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

    const start = (index = 0, intro = false) => {
        if (steps[index]) {
            progress(steps[index].key, false);
        }

        setStartAt(index);
        setShowIntro(intro);
        setOpen(true);
    };

    const post = (url: string) => {
        router.post(
            url,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
            },
        );
    };

    return (
        <>
            <Head title="Guided tour" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Compass className="size-5" />
                        </span>
                        <div>
                            <p className="text-[10px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                                Guide
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                                Guided tour
                            </h1>
                            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                Walk through the sections you can use. Replay
                                any process at any time — the tour adapts to
                                your role and permissions.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => start(0, true)}>
                            <Play className="mr-1.5 size-3.5" />
                            {completedAt || skippedAt
                                ? 'Replay full tour'
                                : 'Start full tour'}
                        </Button>
                        {(completedAt || skippedAt) && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => post('/admin/guide/reset')}
                            >
                                <RotateCcw className="mr-1.5 size-3.5" />
                                Reset onboarding
                            </Button>
                        )}
                    </div>
                </div>

                {steps.length === 0 ? (
                    <div className="rounded-2xl border border-border/60 bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                        There is no guided tour available for this account.
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {steps.map((step, index) => {
                            const Icon = tourIconMap[step.icon] ?? Compass;

                            return (
                                <Card
                                    key={step.key}
                                    className="border-border/60"
                                >
                                    <CardContent className="flex h-full flex-col gap-3 py-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <Icon className="size-4" />
                                            </span>
                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                {String(index + 1).padStart(
                                                    2,
                                                    '0',
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-sm font-semibold">
                                                {step.title}
                                            </h2>
                                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                                {step.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                                            <Link
                                                href={step.href}
                                                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                            >
                                                Open section{' '}
                                                <ArrowUpRight className="size-3" />
                                            </Link>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => start(index)}
                                            >
                                                Replay
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <TourDialog
                open={open}
                onOpenChange={setOpen}
                steps={steps}
                startAt={startAt}
                showIntro={showIntro}
                onComplete={() => post('/admin/guide/complete')}
                onSkip={() => post('/admin/guide/skip')}
                onStepChange={progress}
            />
        </>
    );
}

GuidePage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/admin' },
        { title: 'Guided tour', href: '/admin/guide' },
    ],
};
