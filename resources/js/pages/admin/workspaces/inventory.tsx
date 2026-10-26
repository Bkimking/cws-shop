import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Boxes,
    Package,
    PackageCheck,
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

type StockRow = {
    id: number;
    product: string | null;
    variant: string | null;
    warehouse: string | null;
    branch: string | null;
    quantity: number;
    reorder_point: number;
};
type Movement = {
    id: number;
    type: string;
    quantity: number;
    product: string | null;
    variant: string | null;
    warehouse: string | null;
    by: string;
    notes: string | null;
    time: string | null;
};
type WarehouseRow = {
    id: number;
    name: string;
    branch: string | null;
    units: number;
    low_stock: number;
};

export default function InventoryWorkspace({
    scope,
    metrics,
    low_stock,
    movements,
    warehouses,
}: {
    scope: string;
    metrics: {
        products: number;
        warehouses: number;
        units: number;
        low_stock: number;
        out_of_stock: number;
    };
    low_stock: StockRow[];
    movements: Movement[];
    warehouses: WarehouseRow[];
}) {
    return (
        <>
            <Head title="Inventory desk" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <WorkspaceHeader
                    eyebrow="Inventory management"
                    title="Inventory desk"
                    description={`${scope} — stock health, movements and replenishment across your warehouses.`}
                    icon={Warehouse}
                    badge="Stock scoped"
                    actions={
                        <>
                            <Link href="/admin/stock">
                                <Button size="sm" variant="outline">
                                    <Package className="mr-1.5 size-3.5" />
                                    Stock
                                </Button>
                            </Link>
                            <Link href="/admin/warehouses">
                                <Button size="sm">
                                    <Boxes className="mr-1.5 size-3.5" />
                                    Warehouses
                                </Button>
                            </Link>
                        </>
                    }
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <MetricCard
                        label="Variants tracked"
                        value={metrics.products}
                        icon={Package}
                    />
                    <MetricCard
                        label="Warehouses"
                        value={metrics.warehouses}
                        icon={Warehouse}
                    />
                    <MetricCard
                        label="Units on hand"
                        value={metrics.units.toLocaleString()}
                        icon={Boxes}
                        tone="primary"
                    />
                    <MetricCard
                        label="Low stock"
                        value={metrics.low_stock}
                        icon={AlertTriangle}
                        tone="warning"
                    />
                    <MetricCard
                        label="Out of stock"
                        value={metrics.out_of_stock}
                        icon={PackageCheck}
                        tone="warning"
                    />
                </div>

                <Panel
                    title="Replenishment queue"
                    description="Items at or below their reorder point."
                    action={{ label: 'Manage stock', href: '/admin/stock' }}
                >
                    {low_stock.length === 0 ? (
                        <EmptyPanel>
                            Everything is above its reorder point.
                        </EmptyPanel>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-border/50 text-[10px] tracking-wider text-muted-foreground uppercase">
                                    <tr>
                                        <th className="px-4 py-2.5 font-medium">
                                            Product
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            Warehouse
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            On hand
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            Reorder at
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {low_stock.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-muted/30"
                                        >
                                            <td className="px-4 py-2.5">
                                                <p className="font-medium">
                                                    {item.product}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {item.variant}
                                                </p>
                                            </td>
                                            <td className="px-4 py-2.5 text-muted-foreground">
                                                {item.warehouse} · {item.branch}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <Badge
                                                    variant="outline"
                                                    className="border-amber-500/40 text-amber-600 dark:text-amber-400"
                                                >
                                                    {item.quantity}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                                                {item.reorder_point}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <Panel
                        title="Recent stock movements"
                        description="Latest receiving, sales and adjustments."
                    >
                        {movements.length === 0 ? (
                            <EmptyPanel>No stock movements yet.</EmptyPanel>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {movements.map((movement) => (
                                    <div
                                        key={movement.id}
                                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                                    >
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <span
                                                className={`flex size-6 shrink-0 items-center justify-center rounded-md ${movement.quantity >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}
                                            >
                                                {movement.quantity >= 0 ? (
                                                    <ArrowUpRight className="size-3.5" />
                                                ) : (
                                                    <ArrowDownRight className="size-3.5" />
                                                )}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-medium">
                                                    {movement.product}{' '}
                                                    {movement.variant
                                                        ? `· ${movement.variant}`
                                                        : ''}
                                                </p>
                                                <p className="truncate text-[11px] text-muted-foreground">
                                                    {movement.warehouse} ·{' '}
                                                    {movement.by} ·{' '}
                                                    {movement.time}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p
                                                className={`font-mono text-xs font-semibold ${movement.quantity >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
                                            >
                                                {movement.quantity > 0
                                                    ? '+'
                                                    : ''}
                                                {movement.quantity}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {movement.type}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>

                    <Panel
                        title="Warehouses"
                        description="Units and low-stock counts by location."
                        action={{ label: 'Manage', href: '/admin/warehouses' }}
                    >
                        {warehouses.length === 0 ? (
                            <EmptyPanel>No warehouses in scope.</EmptyPanel>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {warehouses.map((warehouse) => (
                                    <div
                                        key={warehouse.id}
                                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                                    >
                                        <div>
                                            <p className="text-xs font-medium">
                                                {warehouse.name}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {warehouse.branch}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono text-xs font-semibold">
                                                {warehouse.units.toLocaleString()}{' '}
                                                units
                                            </p>
                                            <p
                                                className={`text-[10px] ${warehouse.low_stock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}
                                            >
                                                {warehouse.low_stock} low
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link href="/admin/products">
                        <Button variant="outline" size="sm">
                            Products
                        </Button>
                    </Link>
                    <Link href="/admin/categories">
                        <Button variant="outline" size="sm">
                            Categories
                        </Button>
                    </Link>
                    <Link href="/admin/stock">
                        <Button variant="outline" size="sm">
                            Stock adjustments
                        </Button>
                    </Link>
                </div>
            </div>
        </>
    );
}

InventoryWorkspace.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/admin' },
        { title: 'Inventory desk', href: '/admin/inventory' },
    ],
};
