import { useState } from 'react';
import {
    Check,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    ShieldCheck,
    Sparkles,
    X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ToolEnvelope = {
    summary?: string;
    scope?: { label?: string };
    columns?: Array<{ key: string; label: string }>;
    rows?: Array<Record<string, unknown>>;
    sources?: Array<{ label: string; url: string }>;
    meta?: { row_count?: number; truncated?: boolean };
};

type ToolApproval = {
    id: string;
    approved?: boolean;
    requestReason?: string;
    reason?: string;
};

const toolLabels: Record<string, string> = {
    reports_agent: 'Reports',
    inventory_agent: 'Inventory',
    orders_agent: 'Orders',
    insights_agent: 'Insights',
    security_agent: 'Security',
    sales_summary: 'Sales summary',
    sales_trend: 'Sales trend',
    top_products: 'Top products',
    payment_breakdown: 'Payments',
    refund_summary: 'Refunds',
    till_summary: 'Tills',
    low_stock: 'Low stock',
    stock_on_hand: 'Stock on hand',
    order_lookup: 'Order lookup',
    order_search: 'Order search',
    create_category: 'Create category',
    create_product: 'Create product',
    update_product: 'Update product',
    adjust_stock: 'Adjust stock',
    list_users: 'Users',
    user_access: 'User access',
    security_overview: 'Security overview',
    security_events: 'Security events',
    failed_logins: 'Failed sign-ins',
    shop_list_pickups: 'Pickup points',
    shop_select_pickup: 'Pickup point',
    shop_search_products: 'Product search',
    shop_add_to_cart: 'Add to cart',
    shop_view_cart: 'Cart',
    shop_checkout: 'Checkout',
    shop_order_status: 'Order status',
    list_categories: 'Categories',
};

function parseOutput(output: unknown): ToolEnvelope | null {
    let value = output;

    if (typeof value === 'string') {
        try {
            value = JSON.parse(value);
        } catch {
            return null;
        }
    }

    if (value && typeof value === 'object' && 'result' in value) {
        return parseOutput((value as { result: unknown }).result);
    }

    if (value && typeof value === 'object' && 'summary' in value) {
        return value as ToolEnvelope;
    }

    return null;
}

function displayValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '—';
    }

    if (typeof value === 'number') {
        return new Intl.NumberFormat().format(value);
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

export function ToolCallCard({
    name,
    input,
    output,
    state,
    approval,
    onApproval,
}: {
    name: string;
    input?: unknown;
    output?: unknown;
    state?: string;
    approval?: ToolApproval;
    onApproval?: (id: string, approved: boolean) => void;
}) {
    const [open, setOpen] = useState(false);
    const envelope = parseOutput(output);
    const label = toolLabels[name] ?? name.replaceAll('_', ' ');
    const summary =
        envelope?.summary ?? (typeof output === 'string' ? output : null);
    const isPendingApproval =
        approval !== undefined && approval.approved === undefined;
    const isApproved = approval?.approved === true;
    const isRejected = approval?.approved === false;

    return (
        <div
            className={cn(
                'rounded-lg border border-border/60 bg-card/50',
                isPendingApproval && 'ai-glow border-ai-border/60',
            )}
        >
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
                {open ? (
                    <ChevronDown className="size-3.5 shrink-0" />
                ) : (
                    <ChevronRight className="size-3.5 shrink-0" />
                )}
                <Sparkles className="size-3.5 shrink-0 text-ai" />
                <span className="font-medium text-foreground">{label}</span>
                {summary && <span className="truncate">· {summary}</span>}
                {envelope?.meta?.row_count !== undefined && (
                    <Badge
                        variant="secondary"
                        className="ml-auto shrink-0 text-[10px]"
                    >
                        {envelope.meta.row_count} rows
                    </Badge>
                )}
                {state === 'input-streaming' && (
                    <span className="ml-auto shrink-0 text-[10px]">
                        running…
                    </span>
                )}
                {isApproved && (
                    <Badge
                        variant="secondary"
                        className="ml-auto shrink-0 text-[10px]"
                    >
                        Approved
                    </Badge>
                )}
                {isRejected && (
                    <Badge
                        variant="secondary"
                        className="ml-auto shrink-0 text-[10px]"
                    >
                        Rejected
                    </Badge>
                )}
            </button>

            {isPendingApproval && (
                <div className="border-t border-ai-border/30 bg-ai/5 px-3 py-3">
                    <div className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ai" />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground">
                                Approval required
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                {approval.requestReason ??
                                    'This action changes live data. Review the details and approve or reject it.'}
                            </p>
                            {input !== undefined && input !== null && (
                                <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-muted/40 p-2 text-[10px] text-muted-foreground">
                                    {JSON.stringify(input, null, 2)}
                                </pre>
                            )}
                            <div className="mt-2.5 flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 bg-ai text-ai-foreground hover:bg-ai/90"
                                    onClick={() =>
                                        onApproval?.(approval.id, true)
                                    }
                                >
                                    <Check className="mr-1.5 size-3.5" />
                                    Approve
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    onClick={() =>
                                        onApproval?.(approval.id, false)
                                    }
                                >
                                    <X className="mr-1.5 size-3.5" />
                                    Reject
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {open && (
                <div className="space-y-3 border-t border-border/50 px-3 py-3">
                    {envelope?.scope?.label && (
                        <p className="text-[11px] text-muted-foreground">
                            {envelope.scope.label}
                        </p>
                    )}

                    {envelope && (envelope.rows?.length ?? 0) > 0 ? (
                        <div className="overflow-x-auto rounded-md border border-border/50">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-muted/40 text-muted-foreground">
                                    <tr>
                                        {(envelope.columns ?? []).map(
                                            (column) => (
                                                <th
                                                    key={column.key}
                                                    className="px-2.5 py-2 font-medium whitespace-nowrap"
                                                >
                                                    {column.label}
                                                </th>
                                            ),
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {envelope.rows
                                        ?.slice(0, 25)
                                        .map((row, index) => (
                                            <tr
                                                key={index}
                                                className="border-t border-border/40"
                                            >
                                                {(envelope.columns ?? []).map(
                                                    (column) => (
                                                        <td
                                                            key={column.key}
                                                            className="px-2.5 py-2 font-mono text-[11px] whitespace-nowrap"
                                                        >
                                                            {displayValue(
                                                                row[column.key],
                                                            )}
                                                        </td>
                                                    ),
                                                )}
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="max-h-60 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {envelope?.summary ??
                                (typeof output === 'string' && output.trim()
                                    ? output
                                    : 'No rows returned.')}
                        </p>
                    )}

                    {envelope?.meta?.truncated && (
                        <p className="text-[11px] text-muted-foreground">
                            Results were truncated. Narrow the date range for
                            more detail.
                        </p>
                    )}

                    {(envelope?.sources?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {envelope?.sources?.map((source) => (
                                <a
                                    key={source.url}
                                    href={source.url}
                                    className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground hover:border-ai-border hover:text-foreground"
                                >
                                    {source.label}
                                    <ExternalLink className="size-3" />
                                </a>
                            ))}
                        </div>
                    )}

                    {input !== undefined && input !== null && (
                        <details className="text-[11px] text-muted-foreground">
                            <summary className="cursor-pointer">
                                Filters used
                            </summary>
                            <pre className="mt-1 overflow-x-auto rounded bg-muted/50 p-2 text-[10px]">
                                {JSON.stringify(input, null, 2)}
                            </pre>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
}
