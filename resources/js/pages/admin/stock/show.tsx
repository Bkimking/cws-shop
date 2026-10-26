import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import adminstock from '@/routes/admin/stock';
import {
    Package,
    Warehouse,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    History,
    ArrowUpRight,
    ArrowDownRight,
    User,
    Clock,
    Pencil,
} from 'lucide-react';

interface Warehouse {
    id: number;
    name: string;
    branch: {
        id: number;
        name: string;
        region_id: number;
    };
}

interface ProductVariant {
    id: number;
    variant_name: string;
    sku_suffix: string | null;
    price_delta: number;
    product: {
        id: number;
        name: string;
        sku: string;
        category: {
            id: number;
            name: string;
        };
    };
}

interface StockLevel {
    id: number;
    warehouse_id: number;
    product_variant_id: number;
    quantity_on_hand: number;
    reorder_point: number;
    warehouse: Warehouse;
    product_variant: ProductVariant;
}

interface Movement {
    id: number;
    warehouse_id: number;
    product_variant_id: number;
    quantity: number;
    type: string;
    reference_id: string;
    notes: string | null;
    created_at: string;
    warehouse: {
        id: number;
        name: string;
    };
    product_variant: {
        id: number;
        variant_name: string;
    };
    created_by: {
        id: number;
        name: string;
    } | null;
}

interface StockShowProps {
    stockLevel: StockLevel;
    movements: Movement[];
}

function StockBadge({ quantity, reorderPoint }: { quantity: number; reorderPoint: number }) {
    if (quantity <= 0) {
        return (
            <Badge variant="destructive" className="border-red-500/30 bg-red-500/20 text-red-400">
                <XCircle className="mr-1 size-3" />
                Out
            </Badge>
        );
    }

    if (quantity <= reorderPoint) {
        return (
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/20 text-amber-400">
                <AlertTriangle className="mr-1 size-3" />
                Low
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="border-green-500/30 bg-green-500/20 text-green-400">
            <CheckCircle2 className="mr-1 size-3" />
            OK
        </Badge>
    );
}

function MovementIcon({ type, quantity }: { type: string; quantity: number }) {
    if (quantity > 0) {
        return <ArrowUpRight className="size-4 text-green-500" />;
    }
    return <ArrowDownRight className="size-4 text-red-500" />;
}

function MovementTypeBadge({ type }: { type: string }) {
    const colors: Record<string, string> = {
        ADJUSTMENT: 'border-blue-500/30 bg-blue-500/20 text-blue-400',
        TRANSFER_IN: 'border-green-500/30 bg-green-500/20 text-green-400',
        TRANSFER_OUT: 'border-orange-500/30 bg-orange-500/20 text-orange-400',
        PURCHASE: 'border-purple-500/30 bg-purple-500/20 text-purple-400',
        RETURN: 'border-pink-500/30 bg-pink-500/20 text-pink-400',
        WASTAGE: 'border-red-500/30 bg-red-500/20 text-red-400',
    };

    return (
        <Badge variant="outline" className={colors[type] || 'border-border/60'}>
            {type.replace('_', ' ')}
        </Badge>
    );
}

export default function StockShow({ stockLevel, movements }: StockShowProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        quantity_change: 0,
        reason: '',
        notes: '',
    });

    const { data: reorderData, setData: setReorderData, post: reorderPost, processing: reorderProcessing, errors: reorderErrors } = useForm({
        reorder_point: stockLevel.reorder_point,
    });

    const submitAdjust = (e: FormEvent) => {
        e.preventDefault();
        post(adminstock.adjust({ stockLevel: stockLevel.id }).url, {
            onSuccess: () => reset(),
        });
    };

    const submitReorderPoint = (e: FormEvent) => {
        e.preventDefault();
        reorderPost(adminstock.updateReorderPoint({ stockLevel: stockLevel.id }).url, {
            onSuccess: () => {
                setReorderData('reorder_point', reorderData.reorder_point);
            },
        });
    };

    return (
        <>
            <Head title={`Stock - ${stockLevel.product_variant?.product?.name || 'Unknown Product'}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href={adminstock.index().url}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="size-5" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl font-semibold">
                            {stockLevel.product_variant?.product?.name || 'Unknown Product'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            SKU: {stockLevel.product_variant?.product?.sku || 'N/A'}
                            {stockLevel.product_variant?.variant_name && (
                                <span> · {stockLevel.product_variant.variant_name}</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Stock Overview */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-border/60">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                On Hand
                            </CardTitle>
                            <Package className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-mono text-2xl font-semibold tabular-nums">
                                {stockLevel.quantity_on_hand}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Reorder Point
                            </CardTitle>
                            <AlertTriangle className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <div className="font-mono text-2xl font-semibold tabular-nums">
                                    {stockLevel.reorder_point}
                                </div>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="size-8">
                                            <Pencil className="size-3.5" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Update Reorder Point</DialogTitle>
                                            <DialogDescription>
                                                Set the stock level at which this item should be reordered.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={submitReorderPoint}>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="reorder_point">Reorder Point</Label>
                                                    <Input
                                                        id="reorder_point"
                                                        type="number"
                                                        step="1"
                                                        value={reorderData.reorder_point}
                                                        onChange={(e) => setReorderData('reorder_point', parseInt(e.target.value) || 0)}
                                                    />
                                                    {reorderErrors.reorder_point && (
                                                        <p className="text-xs text-destructive">{reorderErrors.reorder_point}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="submit" disabled={reorderProcessing}>
                                                    {reorderProcessing ? 'Updating...' : 'Update'}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Warehouse
                            </CardTitle>
                            <Warehouse className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-semibold">{stockLevel.warehouse?.name || 'Unknown Warehouse'}</div>
                            <div className="text-xs text-muted-foreground">
                                {stockLevel.warehouse?.branch?.name || 'Unknown Branch'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <StockBadge
                                quantity={stockLevel.quantity_on_hand}
                                reorderPoint={stockLevel.reorder_point}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>Adjust Stock</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adjust Stock</DialogTitle>
                                <DialogDescription>
                                    Manually adjust the stock level for this item.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={submitAdjust}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="quantity_change">Quantity Change</Label>
                                        <Input
                                            id="quantity_change"
                                            type="number"
                                            step="1"
                                            value={data.quantity_change}
                                            onChange={(e) => setData('quantity_change', parseInt(e.target.value) || 0)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Positive to add, negative to remove
                                        </p>
                                        {errors.quantity_change && (
                                            <p className="text-xs text-destructive">{errors.quantity_change}</p>
                                        )}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="reason">Reason *</Label>
                                        <Input
                                            id="reason"
                                            placeholder="e.g., Damaged goods, Count correction"
                                            value={data.reason}
                                            onChange={(e) => setData('reason', e.target.value)}
                                        />
                                        {errors.reason && (
                                            <p className="text-xs text-destructive">{errors.reason}</p>
                                        )}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="notes">Notes</Label>
                                        <Input
                                            id="notes"
                                            placeholder="Additional details..."
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                        />
                                        {errors.notes && (
                                            <p className="text-xs text-destructive">{errors.notes}</p>
                                        )}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Adjusting...' : 'Adjust Stock'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">Transfer Stock</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Transfer Stock</DialogTitle>
                                <DialogDescription>
                                    Move stock between warehouses.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button type="button" disabled>
                                    Transfer (Coming Soon)
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Movement Timeline */}
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="size-5" />
                            Movement Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {movements.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                No movements recorded yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {movements.map((movement) => (
                                    <div
                                        key={movement.id}
                                        className="flex items-start gap-4 rounded-lg border border-border/60 bg-muted/20 p-4"
                                    >
                                        <div className="mt-1">
                                            <MovementIcon type={movement.type} quantity={movement.quantity} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <MovementTypeBadge type={movement.type} />
                                                <span className="font-mono font-semibold tabular-nums">
                                                    {movement.quantity > 0 ? '+' : ''}
                                                    {movement.quantity}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-sm text-muted-foreground">
                                                {movement.notes || movement.reference_id}
                                            </div>
                                            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <User className="size-3" />
                                                    {movement.created_by?.name ?? '—'}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="size-3" />
                                                    {new Date(movement.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

StockShow.layout = (props: StockShowProps) => ({
    breadcrumbs: [
        {
            title: 'Stock',
            href: adminstock.index().url,
        },
        {
            title: props.stockLevel?.product_variant?.product?.name || 'Details',
        },
    ],
});
