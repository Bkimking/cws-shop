import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import adminwarehouses from '@/routes/admin/warehouses';
import type { Auth } from '@/types';
import {
    Warehouse,
    Building2,
    MapPin,
    Plus,
    Search,
    Pencil,
    Trash2,
    Package,
    AlertTriangle,
} from 'lucide-react';

interface Branch {
    id: number;
    name: string;
    region: {
        id: number;
        name: string;
    };
}

interface StockLevel {
    id: number;
    warehouse_id: number;
    product_variant_id: number;
}

interface WarehouseData {
    id: number;
    name: string;
    branch: Branch;
    stock_levels_count?: number;
    stock_levels?: StockLevel[];
}

interface WarehousesIndexProps {
    warehouses: {
        data: WarehouseData[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    branches: Branch[];
}

export default function WarehousesIndex({
    warehouses,
    branches,
}: WarehousesIndexProps) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const permissions = auth.permissions ?? [];
    const can = (permission: string) => permissions.includes(permission);
    const canCreate = can('create warehouses');
    const canEdit = can('edit warehouses');
    const canDelete = can('delete warehouses');
    const warehouseList = warehouses.data || [];
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(
        warehouseList[0]?.id ?? 1,
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBranchFilter, setSelectedBranchFilter] =
        useState<string>('all');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [warehouseToDelete, setWarehouseToDelete] =
        useState<WarehouseData | null>(null);
    const [confirmWarehouseName, setConfirmWarehouseName] = useState('');

    const selectedWarehouse =
        warehouseList.find((w) => w.id === selectedWarehouseId) ||
        warehouseList[0];

    const filteredWarehouses = warehouseList.filter((w) => {
        const matchesSearch =
            w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.branch.region.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
        const matchesBranch =
            selectedBranchFilter === 'all' ||
            w.branch.id.toString() === selectedBranchFilter;
        return matchesSearch && matchesBranch;
    });

    const handleDelete = () => {
        if (
            warehouseToDelete &&
            confirmWarehouseName === warehouseToDelete.name
        ) {
            router.delete(adminwarehouses.destroy(warehouseToDelete.id).url, {
                onSuccess: () => {
                    setDeleteModalOpen(false);
                    setWarehouseToDelete(null);
                    setConfirmWarehouseName('');
                },
            });
        }
    };

    return (
        <>
            <Head title="Warehouses" />

            <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
                {/* Header */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b px-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <Warehouse className="size-5 text-primary" />
                            <h1 className="text-xl font-semibold tracking-tight">
                                Warehouses
                            </h1>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Manage warehouse locations and their stock levels
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {canCreate && (
                            <Link href={adminwarehouses.create().url}>
                                <Button size="sm">
                                    <Plus className="mr-1.5 size-4" />
                                    Add Warehouse
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Master-Detail Layout */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    {/* Left Pane: Warehouse List */}
                    <div className="flex w-96 shrink-0 flex-col border-r bg-muted/20">
                        {/* Search & Branch Filter */}
                        <div className="space-y-2 border-b p-3">
                            <div className="relative">
                                <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search warehouses..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="h-9 pl-8 text-sm"
                                />
                            </div>

                            {/* Branch Filter */}
                            <div className="flex flex-wrap gap-1 pt-1">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedBranchFilter('all')
                                    }
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                        selectedBranchFilter === 'all'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                >
                                    All Branches
                                </button>
                                {branches.map((branch) => (
                                    <button
                                        key={branch.id}
                                        type="button"
                                        onClick={() =>
                                            setSelectedBranchFilter(
                                                branch.id.toString(),
                                            )
                                        }
                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                            selectedBranchFilter ===
                                            branch.id.toString()
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        {branch.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List Items */}
                        <div className="flex-1 space-y-1 overflow-y-auto p-2">
                            {filteredWarehouses.map((warehouse) => {
                                const isSelected =
                                    warehouse.id === selectedWarehouse?.id;

                                return (
                                    <div
                                        key={warehouse.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                            setSelectedWarehouseId(warehouse.id)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === 'Enter' ||
                                                e.key === ' '
                                            ) {
                                                setSelectedWarehouseId(
                                                    warehouse.id,
                                                );
                                            }
                                        }}
                                        className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-left transition-all outline-none ${
                                            isSelected
                                                ? 'border-primary/50 bg-primary/5 shadow-xs'
                                                : 'border-transparent hover:border-border hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Warehouse className="size-4 text-muted-foreground group-hover:text-foreground" />
                                                <span className="text-sm font-semibold tracking-tight">
                                                    {warehouse.name}
                                                </span>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px]"
                                            >
                                                {warehouse.branch.region.name}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Building2 className="size-3" />
                                                {warehouse.branch.name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Package className="size-3" />
                                                {warehouse.stock_levels_count ??
                                                    warehouse.stock_levels
                                                        ?.length ??
                                                    0}{' '}
                                                items
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredWarehouses.length === 0 && (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    No warehouses found matching filter.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Warehouse Details */}
                    <div className="flex flex-1 flex-col overflow-hidden bg-background">
                        {selectedWarehouse ? (
                            <>
                                {/* Header / Hero */}
                                <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40 shadow-xs">
                                            <Warehouse className="size-6 text-primary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <h2 className="text-lg font-bold tracking-tight">
                                                    {selectedWarehouse.name}
                                                </h2>
                                                <Badge
                                                    variant="secondary"
                                                    className="gap-1 text-xs"
                                                >
                                                    <Building2 className="size-3" />
                                                    {
                                                        selectedWarehouse.branch
                                                            .name
                                                    }
                                                </Badge>
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {
                                                    selectedWarehouse.branch
                                                        .region.name
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Toolbar */}
                                    <div className="flex items-center gap-2">
                                        {canEdit && (
                                            <Link
                                                href={
                                                    adminwarehouses.edit(
                                                        selectedWarehouse.id,
                                                    ).url
                                                }
                                            >
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    <Pencil className="mr-1.5 size-3.5" />
                                                    Edit
                                                </Button>
                                            </Link>
                                        )}
                                        {canDelete && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    setWarehouseToDelete(
                                                        selectedWarehouse,
                                                    );
                                                    setConfirmWarehouseName('');
                                                    setDeleteModalOpen(true);
                                                }}
                                            >
                                                <Trash2 className="mr-1.5 size-3.5" />
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <Card className="border-border/60">
                                        <CardContent className="space-y-6 p-6">
                                            <div>
                                                <h3 className="mb-4 text-sm font-semibold">
                                                    Warehouse Information
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="mb-1 text-xs text-muted-foreground">
                                                            Name
                                                        </p>
                                                        <p className="text-sm font-medium">
                                                            {
                                                                selectedWarehouse.name
                                                            }
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="mb-1 text-xs text-muted-foreground">
                                                            Branch
                                                        </p>
                                                        <p className="text-sm font-medium">
                                                            {
                                                                selectedWarehouse
                                                                    .branch.name
                                                            }
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="mb-1 text-xs text-muted-foreground">
                                                            Region
                                                        </p>
                                                        <p className="text-sm font-medium">
                                                            {
                                                                selectedWarehouse
                                                                    .branch
                                                                    .region.name
                                                            }
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="mb-1 text-xs text-muted-foreground">
                                                            Stock Items
                                                        </p>
                                                        <p className="text-sm font-medium">
                                                            {selectedWarehouse.stock_levels_count ??
                                                                selectedWarehouse
                                                                    .stock_levels
                                                                    ?.length ??
                                                                0}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedWarehouse.stock_levels_count ===
                                                0 && (
                                                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                                                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
                                                    <div>
                                                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                                                            Empty Warehouse
                                                        </p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            This warehouse has
                                                            no stock levels
                                                            assigned. You can
                                                            transfer stock to it
                                                            from other
                                                            warehouses.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center">
                                <p className="text-sm text-muted-foreground">
                                    Select a warehouse to view details
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Warehouse</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;
                            {warehouseToDelete?.name}&quot;? This action cannot
                            be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {warehouseToDelete?.stock_levels_count === 0 ? (
                        <>
                            <div className="space-y-2">
                                <label
                                    htmlFor="confirm-name"
                                    className="text-sm font-medium"
                                >
                                    Type the warehouse name to confirm
                                </label>
                                <Input
                                    id="confirm-name"
                                    value={confirmWarehouseName}
                                    onChange={(e) =>
                                        setConfirmWarehouseName(e.target.value)
                                    }
                                    placeholder={warehouseToDelete.name}
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={
                                        confirmWarehouseName !==
                                        warehouseToDelete.name
                                    }
                                >
                                    Delete
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
                                <div>
                                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                                        Cannot Delete Warehouse
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        This warehouse has{' '}
                                        {warehouseToDelete?.stock_levels_count}{' '}
                                        stock levels. Delete or transfer the
                                        stock first.
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteModalOpen(false)}
                                >
                                    Close
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
