import { Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    Box,
    Boxes,
    Building2,
    Check,
    Compass,
    CreditCard,
    Globe2,
    History,
    LayoutDashboard,
    Receipt,
    ScanBarcode,
    Sparkles,
    Store,
    Users,
    Warehouse,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { TourStep } from '@/types/tour';

export const tourIconMap: Record<string, LucideIcon> = {
    'layout-dashboard': LayoutDashboard,
    globe: Globe2,
    store: Store,
    warehouse: Warehouse,
    scan: ScanBarcode,
    box: Box,
    boxes: Boxes,
    building: Building2,
    receipt: Receipt,
    'credit-card': CreditCard,
    users: Users,
    chart: BarChart3,
    history: History,
    sparkles: Sparkles,
};

export function TourDialog({
    open,
    onOpenChange,
    steps,
    startAt = 0,
    showIntro = false,
    onComplete,
    onSkip,
    onStepChange,
    started = false,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    steps: TourStep[];
    startAt?: number;
    showIntro?: boolean;
    started?: boolean;
    onComplete: () => void;
    onSkip: () => void;
    onStepChange?: (
        stepKey: string,
        completed: boolean,
        nextStepKey?: string,
    ) => void;
}) {
    const [index, setIndex] = useState(startAt);
    const [intro, setIntro] = useState(showIntro);

    useEffect(() => {
        if (open) {
            setIndex(
                Math.min(Math.max(startAt, 0), Math.max(steps.length - 1, 0)),
            );
            setIntro(showIntro);
        }
    }, [open, startAt, showIntro, steps.length]);

    if (steps.length === 0) return null;

    const step = steps[index];
    const Icon = tourIconMap[step.icon] ?? Compass;
    const isLast = index === steps.length - 1;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                {intro ? (
                    <>
                        <DialogHeader>
                            <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Compass className="size-6" />
                            </div>
                            <DialogTitle className="text-xl">
                                Want a quick guided tour?
                            </DialogTitle>
                            <DialogDescription className="text-sm leading-relaxed">
                                We will walk through the sections available to
                                your role. It takes less than two minutes, and
                                you can skip or replay any part later from the
                                Guide link.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                            {steps.length} section
                            {steps.length === 1 ? '' : 's'} tailored to your
                            access.
                        </div>
                        <DialogFooter className="gap-2 sm:justify-between">
                            <Button variant="ghost" onClick={onSkip}>
                                Skip for now
                            </Button>
                            <Button onClick={() => setIntro(false)}>
                                Start tour{' '}
                                <ArrowRight className="ml-1.5 size-4" />
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <div className="mb-1 flex items-center justify-between gap-3">
                                <span className="text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                                    Step {index + 1} of {steps.length}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    {step.title}
                                </span>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Icon className="size-5" />
                                </span>
                                <div>
                                    <DialogTitle className="text-lg">
                                        {step.title}
                                    </DialogTitle>
                                    <DialogDescription className="mt-1 text-sm leading-relaxed">
                                        {step.description}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{
                                    width: `${((index + 1) / steps.length) * 100}%`,
                                }}
                            />
                        </div>

                        <Link
                            href={step.href}
                            onClick={() => onOpenChange(false)}
                            className="text-xs font-medium text-primary hover:underline"
                        >
                            Open this section →
                        </Link>

                        <DialogFooter className="gap-2 sm:justify-between">
                            <Button variant="ghost" onClick={onSkip}>
                                Skip tour
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    disabled={index === 0}
                                    onClick={() =>
                                        setIndex((current) =>
                                            Math.max(0, current - 1),
                                        )
                                    }
                                >
                                    <ArrowLeft className="size-4" />
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (isLast) {
                                            onComplete();
                                        } else {
                                            const next = steps[index + 1];
                                            onStepChange?.(
                                                step.key,
                                                true,
                                                next.key,
                                            );
                                            setIndex((current) => current + 1);
                                        }
                                    }}
                                >
                                    {isLast ? (
                                        <>
                                            Finish{' '}
                                            <Check className="ml-1.5 size-4" />
                                        </>
                                    ) : (
                                        <>
                                            Next{' '}
                                            <ArrowRight className="ml-1.5 size-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
