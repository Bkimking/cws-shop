import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { dashboard } from '@/routes/admin';
import adminbranches from '@/routes/admin/branches';
import {
    ScanBarcode,
    Receipt,
    Package,
    BarChart3,
    Globe,
    Store,
    Users,
    ShieldCheck,
    ShoppingCart,
    TrendingUp,
    AlertTriangle,
    CircleDot,
    Clock,
    ArrowUpRight,
    Globe2,
    Store as StoreIcon,
    Boxes,
} from 'lucide-react';

interface Region {
    id: number;
    name: string;
    currency_code: string;
    is_active: boolean;
    branches_count: number;
    sales_today?: number;
}

interface Branch {
    id: number;
    name: string;
    is_open: boolean;
    cashier?: string;
    cash_in_till?: number;
    currency_code: string;
}

interface RecentSale {
    id: number;
    order_number: string;
    total: number;
    currency_code: string;
    payment_method: string;
    time: string;
    cashier: string;
}

interface DashboardProps {
    regions?: Region[];
    branches?: Branch[];
    recent_sales?: RecentSale[];
    metrics: {
        total_sales_today: number;
        total_orders_today: number;
        active_branches: number;
        active_users: number;
        low_stock_items: number;
        currency_code?: string;
    };
    permissions?: string[];
    is_superadmin?: boolean;
}

function StatCard({
    title,
    value,
    icon: Icon,
    mono,
}: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    mono?: boolean;
}) {
    return (
        <Card className="border-border/60 transition-colors hover:border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    {title}
                </CardTitle>
                <div className="rounded-md bg-muted/50 p-1.5">
                    <Icon className="size-3.5 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent>
                <div
                    className={`text-2xl font-semibold tabular-nums ${mono ? 'font-mono' : ''}`}
                >
                    {value}
                </div>
            </CardContent>
        </Card>
    );
}

function LauncherTile({
    label,
    icon: Icon,
    href,
    color = 'text-[#5bbfe6]',
}: {
    label: string;
    icon: React.ElementType;
    href: string;
    color?: string;
}) {
    return (
        <Link href={href}>
            <div className="group flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-border/60 bg-card p-5 transition-all duration-150 hover:border-[#5bbfe6]/40 hover:bg-muted/40">
                <div className="rounded-lg bg-muted/60 p-3 transition-colors group-hover:bg-muted">
                    <Icon className={`size-6 ${color}`} />
                </div>
                <span className="text-sm font-medium">{label}</span>
            </div>
        </Link>
    );
}

function TillStatusCard({ branch }: { branch: Branch }) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3">
            <div className="flex items-center gap-3">
                <CircleDot
                    className={`size-4 ${branch.is_open ? 'text-[#4fce8a]' : 'text-muted-foreground'}`}
                />
                <div>
                    <div className="text-sm font-medium">{branch.name}</div>
                    <div className="text-xs text-muted-foreground">
                        {branch.is_open
                            ? branch.cashier
                                ? `${branch.cashier} · ${branch.currency_code} ${(branch.cash_in_till ?? 0).toLocaleString()}`
                                : 'Open'
                            : 'Closed'}
                    </div>
                </div>
            </div>
            <Badge
                variant={branch.is_open ? 'default' : 'secondary'}
                className={
                    branch.is_open
                        ? 'border-[#4fce8a]/30 bg-[#4fce8a]/20 text-[#4fce8a]'
                        : ''
                }
            >
                {branch.is_open ? 'Open' : 'Closed'}
            </Badge>
        </div>
    );
}

export default function AdminDashboard({
    regions = [],
    branches = [],
    recent_sales = [],
    metrics,
    permissions = [],
    is_superadmin = false,
}: DashboardProps) {
    const can = (p: string) => permissions.includes(p);
    const currency = metrics.currency_code ?? 'KES';

    const launcherTiles = [
        {
            label: 'Sell',
            icon: ScanBarcode,
            href: '/pos',
            permission: 'use pos terminal',
            color: 'text-[#4fce8a]',
        },
        {
            label: 'Region desk',
            icon: Globe2,
            href: '/admin/region',
            permission: 'view region reports',
        },
        {
            label: 'Branch desk',
            icon: StoreIcon,
            href: '/admin/branch',
            permission: 'view branch reports',
        },
        {
            label: 'Inventory desk',
            icon: Boxes,
            href: '/admin/inventory',
            permission: 'view stock',
        },
        {
            label: 'Orders',
            icon: Receipt,
            href: '/admin/orders',
            permission: 'view orders',
        },
        {
            label: 'Products',
            icon: Package,
            href: '/admin/products',
            permission: 'view products',
        },
        {
            label: 'Reports',
            icon: BarChart3,
            href: '/admin/reports',
            permission: 'view branch reports',
        },
        {
            label: 'Regions',
            icon: Globe,
            href: '/admin/regions',
            permission: 'manage regions',
        },
        {
            label: 'Branches',
            icon: Store,
            href: '/admin/branches',
            permission: 'manage branches',
        },
        {
            label: 'Users',
            icon: Users,
            href: '/admin/users',
            permission: 'view users',
        },
        {
            label: 'Roles',
            icon: ShieldCheck,
            href: '/admin/roles',
            permission: 'manage roles',
        },
    ].filter((t) => can(t.permission));

    const noSalesToday = metrics.total_orders_today === 0;

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-8 p-6">
                {/* Row 1 — Launcher tiles */}
                {launcherTiles.length > 0 && (
                    <section>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {launcherTiles.map((t) => (
                                <LauncherTile
                                    key={t.label}
                                    label={t.label}
                                    icon={t.icon}
                                    href={t.href}
                                    color={t.color}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Superadmin region cards */}
                {is_superadmin && regions.length > 0 && (
                    <section>
                        <h2 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Regions
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {regions.map((r) => (
                                <Card key={r.id} className="border-border/60">
                                    <CardContent className="flex items-center justify-between py-4">
                                        <div className="flex items-center gap-3">
                                            <Globe className="size-4 text-[#5bbfe6]" />
                                            <div>
                                                <div className="text-sm font-medium">
                                                    {r.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {r.branches_count} branch
                                                    {r.branches_count !== 1
                                                        ? 'es'
                                                        : ''}{' '}
                                                    · {r.currency_code}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-sm font-medium tabular-nums">
                                                {r.currency_code}{' '}
                                                {(
                                                    r.sales_today ?? 0
                                                ).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                today
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>
                )}

                {/* Row 2 — KPI row */}
                <section>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Sales today"
                            value={`${currency} ${metrics.total_sales_today.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                            icon={TrendingUp}
                            mono
                        />
                        <StatCard
                            title="Orders today"
                            value={metrics.total_orders_today}
                            icon={ShoppingCart}
                        />
                        <StatCard
                            title="Active branches"
                            value={metrics.active_branches}
                            icon={Store}
                        />
                        <StatCard
                            title="Low-stock items"
                            value={metrics.low_stock_items}
                            icon={AlertTriangle}
                        />
                    </div>
                </section>

                {/* Row 3 — Tills + Live feed */}
                <section className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
                    {/* Till status */}
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Till status
                            </h2>
                            <Link
                                href={adminbranches.index().url}
                                className="text-xs text-[#5bbfe6] hover:underline"
                            >
                                All branches
                            </Link>
                        </div>
                        {branches.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
                                <Store className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">
                                    No branches yet. Add the first one.
                                </p>
                                <Link href={adminbranches.create().url}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-3"
                                    >
                                        Add branch
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {branches.map((b) => (
                                    <TillStatusCard key={b.id} branch={b} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Live sales feed */}
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Recent sales
                            </h2>
                            <div className="flex items-center gap-1.5 text-xs text-[#4fce8a]">
                                <span className="inline-block size-1.5 animate-pulse rounded-full bg-[#4fce8a]" />
                                Live
                            </div>
                        </div>
                        <Card className="border-border/60">
                            {noSalesToday ? (
                                <CardContent className="flex flex-col items-center justify-center py-10">
                                    <Receipt className="mb-2 size-8 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                        No sales today. Open a till to start
                                        selling.
                                    </p>
                                </CardContent>
                            ) : recent_sales.length === 0 ? (
                                <CardContent className="space-y-3 pt-4">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between"
                                        >
                                            <div className="space-y-1.5">
                                                <Skeleton className="h-3.5 w-24" />
                                                <Skeleton className="h-3 w-16" />
                                            </div>
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                    ))}
                                </CardContent>
                            ) : (
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border/60">
                                        {recent_sales
                                            .slice(0, 8)
                                            .map((sale) => (
                                                <div
                                                    key={sale.id}
                                                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Receipt className="size-3.5 shrink-0 text-muted-foreground" />
                                                        <div>
                                                            <div className="font-mono text-sm font-medium tabular-nums">
                                                                #
                                                                {
                                                                    sale.order_number
                                                                }
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Clock className="size-3" />
                                                                {sale.time} ·{' '}
                                                                {sale.cashier}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-mono text-sm font-semibold tabular-nums">
                                                            {sale.currency_code}{' '}
                                                            {sale.total.toLocaleString(
                                                                undefined,
                                                                {
                                                                    minimumFractionDigits: 2,
                                                                },
                                                            )}
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="mt-0.5 text-[10px]"
                                                        >
                                                            {
                                                                sale.payment_method
                                                            }
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    </div>
                </section>

                {/* Low stock strip */}
                {metrics.low_stock_items > 0 && (
                    <section>
                        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                            <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                            <p className="text-sm text-amber-300">
                                <span className="font-semibold">
                                    {metrics.low_stock_items} items
                                </span>{' '}
                                are low on stock or out of stock.
                            </p>
                            <Link
                                href="/admin/stock"
                                className="ml-auto text-xs whitespace-nowrap text-amber-400 hover:underline"
                            >
                                View stock →
                            </Link>
                        </div>
                    </section>
                )}
            </div>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard().url,
        },
    ],
};
