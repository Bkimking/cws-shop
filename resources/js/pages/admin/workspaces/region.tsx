import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    Building2,
    CircleDot,
    Globe2,
    Receipt,
    Store,
    TrendingUp,
    Users,
} from 'lucide-react';
import {
    EmptyPanel,
    MetricCard,
    Panel,
    WorkspaceHeader,
} from '@/components/admin/workspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type BranchRow = {
    id: number;
    name: string;
    address: string;
    is_open: boolean;
    cashier: string | null;
    sales_today: number;
    orders_today: number;
    low_stock: number;
    staff: number;
};

type OrderRow = {
    id: number;
    number: string;
    branch: string | null;
    total: number;
    currency: string;
    status: string;
    payment: string | null;
    time: string | null;
};

type StockRow = {
    id: number;
    product: string | null;
    variant: string | null;
    warehouse: string | null;
    quantity: number;
    reorder_point: number;
};

export default function RegionWorkspace({
    region,
    metrics,
    branches,
    recent_orders,
    low_stock,
    currency,
}: {
    region: { id: number; name: string; currency: string; is_active: boolean };
    metrics: {
        sales_today: number;
        orders_today: number;
        branches: number;
        open_tills: number;
        low_stock: number;
        staff: number;
    };
    branches: BranchRow[];
    recent_orders: OrderRow[];
    low_stock: StockRow[];
    currency: string;
}) {
    return (
        <>
            <Head title={`Region desk · ${region.name}`} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <WorkspaceHeader
                    eyebrow="Region administration"
                    title={`${region.name} region`}
                    description="Branch performance, tills, staffing and stock across your region."
                    icon={Globe2}
                    badge={region.is_active ? 'Active' : 'Inactive'}
                    actions={
                        <>
                            <Link href="/admin/branches">
                                <Button size="sm" variant="outline">
                                    <Building2 className="mr-1.5 size-3.5" />
                                    Branches
                                </Button>
                            </Link>
                            <Link href="/admin/reports">
                                <Button size="sm">
                                    <TrendingUp className="mr-1.5 size-3.5" />
                                    Region report
                                </Button>
                            </Link>
                        </>
                    }
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Sales today"
                        value={`${currency} ${metrics.sales_today.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        icon={TrendingUp}
                        tone="success"
                    />
                    <MetricCard
                        label="Orders today"
                        value={metrics.orders_today}
                        icon={Receipt}
                    />
                    <MetricCard
                        label="Branches"
                        value={metrics.branches}
                        hint={`${metrics.open_tills} open till${metrics.open_tills === 1 ? '' : 's'}`}
                        icon={Store}
                    />
                    <MetricCard
                        label="Low stock"
                        value={metrics.low_stock}
                        hint={`${metrics.staff} active staff`}
                        icon={AlertTriangle}
                        tone="warning"
                    />
                </div>

                <Panel
                    title="Branch performance"
                    description="Live tills and today’s activity by branch."
                    action={{
                        label: 'Manage branches',
                        href: '/admin/branches',
                    }}
                >
                    {branches.length === 0 ? (
                        <EmptyPanel>No branches in this region yet.</EmptyPanel>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {branches.map((branch) => (
                                <div
                                    key={branch.id}
                                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                                >
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <CircleDot
                                            className={`size-4 shrink-0 ${branch.is_open ? 'text-emerald-500' : 'text-muted-foreground/40'}`}
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">
                                                {branch.name}
                                            </p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {branch.is_open
                                                    ? `${branch.cashier ?? 'Open till'} · collected today`
                                                    : 'Till closed'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-right">
                                        <div>
                                            <p className="font-mono text-xs font-semibold">
                                                {currency}{' '}
                                                {branch.sales_today.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {branch.orders_today} orders
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-mono text-xs font-semibold">
                                                {branch.staff}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                staff
                                            </p>
                                        </div>
                                        <div>
                                            <p
                                                className={`font-mono text-xs font-semibold ${branch.low_stock > 0 ? 'text-amber-500' : ''}`}
                                            >
                                                {branch.low_stock}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                low stock
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={
                                            branch.is_open
                                                ? 'default'
                                                : 'secondary'
                                        }
                                        className={
                                            branch.is_open
                                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                : ''
                                        }
                                    >
                                        {branch.is_open ? 'Open' : 'Closed'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>

                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <Panel
                        title="Recent orders"
                        description="Latest activity across the region."
                        action={{ label: 'All orders', href: '/admin/orders' }}
                    >
                        {recent_orders.length === 0 ? (
                            <EmptyPanel>No orders yet.</EmptyPanel>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {recent_orders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-mono text-xs font-medium">
                                                {order.number}
                                            </p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {order.branch} · {order.time}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono text-xs font-semibold">
                                                {order.currency}{' '}
                                                {order.total.toLocaleString(
                                                    undefined,
                                                    {
                                                        minimumFractionDigits: 2,
                                                    },
                                                )}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {order.payment ?? '—'} ·{' '}
                                                {order.status}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>

                    <Panel
                        title="Low stock"
                        description="Items needing replenishment."
                        action={{ label: 'Open stock', href: '/admin/stock' }}
                    >
                        {low_stock.length === 0 ? (
                            <EmptyPanel>Stock levels are healthy.</EmptyPanel>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {low_stock.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium">
                                                {item.product}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {item.variant} ·{' '}
                                                {item.warehouse}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="border-amber-500/40 text-amber-600 dark:text-amber-400"
                                        >
                                            {item.quantity} /{' '}
                                            {item.reorder_point}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link href="/admin/payment-gateways">
                        <Button variant="outline" size="sm">
                            Payment gateways
                        </Button>
                    </Link>
                    <Link href="/admin/activity">
                        <Button variant="outline" size="sm">
                            <Activity className="mr-1.5 size-3.5" />
                            Activity log
                        </Button>
                    </Link>
                    <Link href="/admin/users">
                        <Button variant="outline" size="sm">
                            <Users className="mr-1.5 size-3.5" />
                            People
                        </Button>
                    </Link>
                    <Link href="/admin/reports">
                        <Button variant="outline" size="sm">
                            Region reports{' '}
                            <ArrowRight className="ml-1.5 size-3.5" />
                        </Button>
                    </Link>
                </div>
            </div>
        </>
    );
}

RegionWorkspace.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/admin' },
        { title: 'Region desk', href: '/admin/region' },
    ],
};
