import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { AiProviderStatus } from '@/types/ai';

type AiSettingRow = {
    surface: 'admin_chat' | 'admin_insights' | 'shop_chat';
    label: string;
    enabled: boolean;
    daily_token_cap: number | null;
    daily_cost_cap: number | string | null;
};

export default function AiSettings({
    settings,
    aiEnabled,
    providers,
}: {
    settings: AiSettingRow[];
    aiEnabled: boolean;
    providers: AiProviderStatus[];
}) {
    const { data, setData, put, processing, errors } = useForm({
        settings: settings.map((row) => ({
            ...row,
            daily_token_cap: row.daily_token_cap ?? '',
            daily_cost_cap: row.daily_cost_cap ?? '',
        })),
    });

    const updateRow = (
        index: number,
        values: Partial<(typeof data.settings)[number]>,
    ) => {
        setData(
            'settings',
            data.settings.map((row, rowIndex) =>
                rowIndex === index ? { ...row, ...values } : row,
            ),
        );
    };

    return (
        <>
            <Head title="AI settings" />
            <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-6 overflow-y-auto p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <Link
                            href="/admin/ai"
                            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="size-3" />
                            AI Center
                        </Link>
                        <h1 className="flex items-center gap-2 text-2xl font-semibold">
                            <Sparkles className="size-5 text-ai" />
                            AI settings
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Controls are global for now. Region overrides can be
                            added without changing the chat.
                        </p>
                    </div>

                    <Button
                        type="button"
                        onClick={() => put('/admin/ai/settings')}
                        disabled={processing}
                    >
                        <Save className="mr-2 size-4" />
                        {processing ? 'Saving…' : 'Save settings'}
                    </Button>
                </div>

                {!aiEnabled && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                        AI is disabled at the environment level. Set{' '}
                        <code>AI_ENABLED=true</code> to allow these surfaces to
                        run.
                    </div>
                )}

                {errors.settings && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {errors.settings}
                    </p>
                )}

                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="text-base">Surfaces</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {data.settings.map((row, index) => (
                            <div
                                key={row.surface}
                                className="grid gap-4 border-b border-border/50 pb-6 last:border-0 last:pb-0 md:grid-cols-[1fr_140px_140px]"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-medium">
                                            {row.label}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {row.surface}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={Boolean(row.enabled)}
                                        onCheckedChange={(checked) =>
                                            updateRow(index, {
                                                enabled: checked,
                                            })
                                        }
                                        aria-label={`Enable ${row.label}`}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor={`tokens-${row.surface}`}
                                        className="text-xs"
                                    >
                                        Daily token cap
                                    </Label>
                                    <Input
                                        id={`tokens-${row.surface}`}
                                        type="number"
                                        min={1000}
                                        value={row.daily_token_cap}
                                        onChange={(event) =>
                                            updateRow(index, {
                                                daily_token_cap:
                                                    event.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor={`cost-${row.surface}`}
                                        className="text-xs"
                                    >
                                        Daily cost cap
                                    </Label>
                                    <Input
                                        id={`cost-${row.surface}`}
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={row.daily_cost_cap}
                                        onChange={(event) =>
                                            updateRow(index, {
                                                daily_cost_cap:
                                                    event.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="text-base">
                            Provider failover
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            Requests try the primary provider first, then each
                            configured fallback in order. Providers without a
                            key are skipped, so adding a key later is enough to
                            bring one into the loop.
                        </p>

                        <div className="divide-y divide-border/50 rounded-lg border border-border/60">
                            {providers.map((provider, index) => (
                                <div
                                    key={provider.provider}
                                    className="flex flex-wrap items-center gap-2 px-3 py-2.5"
                                >
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span className="text-sm font-medium capitalize">
                                        {provider.provider}
                                    </span>
                                    {provider.primary && (
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px]"
                                        >
                                            Primary
                                        </Badge>
                                    )}
                                    <span className="ml-auto text-[11px] text-muted-foreground">
                                        {provider.configured
                                            ? (provider.model ??
                                              'Provider default model')
                                            : 'API key missing'}
                                    </span>
                                    <span
                                        className={`size-2 rounded-full ${
                                            provider.configured
                                                ? 'bg-success'
                                                : 'bg-warning'
                                        }`}
                                        title={
                                            provider.configured
                                                ? 'Configured'
                                                : 'Not configured'
                                        }
                                    />
                                </div>
                            ))}
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                            {
                                providers.filter(
                                    (provider) => provider.configured,
                                ).length
                            }{' '}
                            of {providers.length} providers configured. Edit
                            AI_FAILOVER_PROVIDERS in .env to change the order.
                        </p>
                    </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground">
                    Chat is read-only. Approvals and proposals will use the
                    normal forms, policies and activity log.
                </p>
            </div>
        </>
    );
}
