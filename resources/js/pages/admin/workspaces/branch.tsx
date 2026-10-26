import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    BarChart3,
    Box,
    CircleDot,
    Package,
    Receipt,
    Store,
    TrendingUp,
    UserCog,
    Warehouse,
} from 'lucide-react';
import {
    EmptyPanel,
    MetricCard,
    Panel,
    WorkspaceHeader,
} from '@/components/admin/workspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Till = {
    id: number;
    cashier: string | null;
    opened_at: string | null;
    opening_cash: number;
};
type Staff = { id: number; name: string; email: string; roles: string[] };
type OrderRow = {
    id: number;
    number: string;
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

export default function BranchWorkspace({
    branch,
    metrics,
    tills,
    staff,
    recent_orders,
    low_stock,
    currency,
}: {
    branch: {
        id: number;
        name: string;
        address: string;
        phone: string | null;
        region: string | null;
        currency: string;
    };
    metrics: {
        sales_today: number;
        orders_today: number;
        open_tills: number;
        staff: number;
        low_stock: number;
        warehouses: number;
    };
    tills: Till[];
    staff: Staff[];
    recent_orders: OrderRow[];
    low_stock: StockRow[];
    currency: string;
}) {
    return (
        <>
            <Head title={`Branch desk · ${branch.name}`} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <WorkspaceHeader
                    eyebrow="Branch administration"
                    title={`${branch.name} branch`}
                    description={`${branch.address}${branch.region ? ` · ${branch.region}` : ''} — tills, people, stock and orders for this branch.`}
                    icon={Store}
                    badge="Branch scoped"
                    actions={
                        <>
                            <Link href="/pos">
                                <Button size="sm" variant="outline">
                                    <ScanIcon />
                                    Sell
                                </Button>
                            </Link>
                            <Link href="/admin/orders">
                                <Button size="sm">Open orders</Button>
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
                        label="Open tills"
                        value={metrics.open_tills}
                        hint={`${metrics.staff} active staff`}
                        icon={CircleDot}
                        tone="primary"
                    />
                    <MetricCard
                        label="Low stock"
                        value={metrics.low_stock}
                        hint={`${metrics.warehouses} warehouse${metrics.warehouses === 1 ? '' : 's'}`}
                        icon={AlertTriangle}
                        tone="warning"
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <Panel
                        title="Recent orders"
                        description="Latest sales and order activity."
                        action={{ label: 'All orders', href: '/admin/orders' }}
                    >
                        {recent_orders.length === 0 ? (
                            <EmptyPanel>
                                No orders yet. Open the terminal to start
                                selling.
                            </EmptyPanel>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {recent_orders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                                    >
                                        <div>
                                            <p className="font-mono text-xs font-medium">
                                                {order.number}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {order.payment ?? '—'} ·{' '}
                                                {order.time}
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
                                            <Badge
                                                variant="outline"
                                                className="mt-0.5 text-[10px]"
                                            >
                                                {order.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>

                    <Panel
                        title="Open tills"
                        description="Cash drawers currently open."
                        action={{ label: 'Till report', href: '/pos' }}
                    >
                        {tills.length === 0 ? (
                            <EmptyPanel>No till is open.</EmptyPanel>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {tills.map((till) => (
                                    <div
                                        key={till.id}
                                        className="flex items-center justify-between px-4 py-3"
                                    >
                                        <div className="flex items-center gap-2">
                                            <CircleDot className="size-4 text-emerald-500" />
                                            <div>
                                                <p className="text-xs font-medium">
                                                    {till.cashier ?? 'Cashier'}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {till.opened_at
                                                        ? new Date(
                                                              till.opened_at,
                                                          ).toLocaleString()
                                                        : 'Open'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-mono text-xs font-semibold">
                                            {currency}{' '}
                                            {till.opening_cash.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                </div>

                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    <Panel
                        title="Team"
                        description="Active people assigned to this branch."
                        action={{ label: 'Manage users', href: '/admin/users' }}
                    >
                        {staff.length === 0 ? (
                            <EmptyPanel>No staff assigned.</EmptyPanel>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {staff.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center gap-3 px-4 py-2.5"
                                    >
                                        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                                            {member.name.slice(0, 1)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-medium">
                                                {member.name}
                                            </p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {member.email}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-1">
                                            {member.roles.map((role) => (
                                                <Badge
                                                    key={role}
                                                    variant="secondary"
                                                    className="text-[9px]"
                                                >
                                                    {role}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>

                    <Panel
                        title="Low stock"
                        description="Replenish before the next rush."
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
                    <Link href="/admin/products">
                        <Button variant="outline" size="sm">
                            <Box className="mr-1.5 size-3.5" />
                            Products
                        </Button>
                    </Link>
                    <Link href="/admin/stock">
                        <Button variant="outline" size="sm">
                            <Warehouse className="mr-1.5 size-3.5" />
                            Stock
                        </Button>
                    </Link>
                    <Link href="/admin/reports">
                        <Button variant="outline" size="sm">
                            <BarChart3 className="mr-1.5 size-3.5" />
                            Reports
                        </Button>
                    </Link>
                    <Link href="/admin/users">
                        <Button variant="outline" size="sm">
                            <UserCog className="mr-1.5 size-3.5" />
                            Users
                        </Button>
                    </Link>
                </div>
            </div>
        </>
    );
}

function ScanIcon() {
    return <Package className="mr-1.5 size-3.5" />;
}

BranchWorkspace.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/admin' },
        { title: 'Branch desk', href: '/admin/branch' },
    ],
};
