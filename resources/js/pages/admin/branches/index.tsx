import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import ActivityTimeline from '@/components/admin/ActivityTimeline';
import adminbranches from '@/routes/admin/branches';
import adminactivity from '@/routes/admin/activity';
import {
    Store,
    MapPin,
    Phone,
    Plus,
    Search,
    Pencil,
    Ban,
    Users,
    Warehouse,
    CircleDot,
    Activity,
    Clock,
    DollarSign,
    Lock,
    Shield,
    AlertTriangle,
    Power,
} from 'lucide-react';

interface BackendUser {
    id: number;
    name: string;
    email: string;
    roles?: Array<{ id: number; name: string }>;
}

interface BackendWarehouse {
    id: number;
    name: string;
    stock_levels?: Array<{ id: number; warehouse_id: number; product_variant_id: number }>;
}

interface BackendTillSession {
    id: number;
    opening_cash: string | number;
    opened_at: string;
    closed_at: string | null;
    status: string;
    user?: {
        id: number;
        name: string;
    };
}

interface Branch {
    id: number;
    name: string;
    address: string;
    phone: string;
    is_active: boolean;
    region: {
        id: number;
        name: string;
    };
    users_count?: number;
    users?: BackendUser[];
    warehouses?: BackendWarehouse[];
    till_sessions?: BackendTillSession[];
}

interface BranchesIndexProps {
    branches: {
        data: Branch[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    regions?: Array<{ id: number; name: string }>;
    user_role?: string; // 'superadmin' | 'region_admin' | 'branch_admin'
}

export default function AdminBranchesIndex({ branches, regions: backendRegions, user_role = 'superadmin' }: BranchesIndexProps) {
    const branchList = branches.data || [];
    const [selectedBranchId, setSelectedBranchId] = useState<number>(branchList[0]?.id ?? 1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('all');
    const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
    const [branchToDeactivate, setBranchToDeactivate] = useState<Branch | null>(null);
    const [confirmBranchName, setConfirmBranchName] = useState('');

    const selectedBranch = branchList.find((b) => b.id === selectedBranchId) || branchList[0];

    // Unique regions for filter chips from backend or fallback to branchList
    const regionNames = backendRegions && backendRegions.length > 0
        ? backendRegions.map((r) => r.name)
        : Array.from(new Set(branchList.map((b) => b.region.name)));

    const filteredBranches = branchList.filter((b) => {
        const matchesSearch =
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.region.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRegion = selectedRegionFilter === 'all' || b.region.name === selectedRegionFilter;
        return matchesSearch && matchesRegion;
    });

    // Real staff members from backend relation
    const staffMembers = selectedBranch?.users && selectedBranch.users.length > 0
        ? selectedBranch.users.map((u) => ({
            id: u.id,
            name: u.name,
            role: u.roles?.[0]?.name ?? 'Staff',
            email: u.email,
        }))
        : [];

    // Real warehouses from backend relation
    const warehouses = selectedBranch?.warehouses && selectedBranch.warehouses.length > 0
        ? selectedBranch.warehouses.map((w) => ({
            id: w.id,
            name: w.name,
            sku_count: w.stock_levels?.length ?? 0,
            status: 'Active',
        }))
        : [];

    const activeTillSession = selectedBranch?.till_sessions?.[0] ?? null;

    return (
        <>
            <Head title="Branches" />

            <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
                {/* Header */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b px-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <Store className="size-5 text-primary" />
                            <h1 className="text-xl font-semibold tracking-tight">Branches</h1>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {user_role === 'region_admin'
                                ? 'Region-scoped view. Manage store locations, till sessions, and assigned personnel.'
                                : 'Organisation store branches. Scoped by region hierarchy and operational status.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={adminbranches.create().url}>
                            <Button size="sm">
                                <Plus className="mr-1.5 size-4" />
                                Add Branch
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Master-Detail Layout */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    {/* Left Pane: Store List */}
                    <div className="flex w-84 shrink-0 flex-col border-r bg-muted/20">
                        {/* Search & Region Filter Chips */}
                        <div className="border-b p-3 space-y-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search branches..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9 pl-8 text-sm"
                                />
                            </div>

                            {/* Filter Chips by Region (Superadmin grouped/flat view per doc 06) */}
                            {regionNames.length > 1 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRegionFilter('all')}
                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                            selectedRegionFilter === 'all'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        All
                                    </button>
                                    {regionNames.map((reg) => (
                                        <button
                                            key={reg}
                                            type="button"
                                            onClick={() => setSelectedRegionFilter(reg)}
                                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                                selectedRegionFilter === reg
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            {reg}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* List Items */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredBranches.map((branch) => {
                                const isSelected = branch.id === selectedBranch?.id;
                                const isOpen = Boolean(branch.till_sessions && branch.till_sessions.length > 0 && !branch.till_sessions[0].closed_at);
                                const staffCount = branch.users_count ?? branch.users?.length ?? 0;

                                return (
                                    <div
                                        key={branch.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedBranchId(branch.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setSelectedBranchId(branch.id);
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
                                                <Store className="size-4 text-muted-foreground group-hover:text-foreground" />
                                                <span className="text-sm font-semibold tracking-tight">
                                                    {branch.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    title={isOpen ? 'Till Open' : 'Till Closed'}
                                                    className={`inline-block size-2 rounded-full ${
                                                        isOpen ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                                                    }`}
                                                />
                                                <Badge variant="outline" className="text-[10px]">
                                                    {branch.region.name}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1 truncate max-w-[140px]">
                                                <MapPin className="size-3 shrink-0" />
                                                <span className="truncate">{branch.address}</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="size-3" />
                                                {staffCount} {staffCount === 1 ? 'staff' : 'staff'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredBranches.length === 0 && (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    {user_role === 'region_admin'
                                        ? 'No branches in this region yet. Add the first one.'
                                        : 'No branches found matching filter.'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Branch Details */}
                    <div className="flex flex-1 flex-col overflow-hidden bg-background">
                        {selectedBranch ? (
                            <>
                                {/* Header / Hero */}
                                <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40 shadow-xs">
                                            <Store className="size-6 text-primary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <h2 className="text-lg font-bold tracking-tight">
                                                    {selectedBranch.name}
                                                </h2>
                                                <Badge variant="secondary" className="gap-1 text-xs">
                                                    <MapPin className="size-3" />
                                                    {selectedBranch.region.name}
                                                </Badge>
                                                <Badge
                                                    variant="outline"
                                                    className="gap-1 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                                >
                                                    <CircleDot className="size-1.5 fill-emerald-500 text-emerald-500" />
                                                    Till Active
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {selectedBranch.address} • Phone: {selectedBranch.phone}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Toolbar */}
                                    <div className="flex items-center gap-2">
                                        <Link href={adminbranches.edit(selectedBranch.id).url}>
                                            <Button variant="outline" size="sm">
                                                <Pencil className="mr-1.5 size-3.5" />
                                                Edit
                                            </Button>
                                        </Link>
                                        {selectedBranch.is_active ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    setBranchToDeactivate(selectedBranch);
                                                    setConfirmBranchName('');
                                                    setDeactivateModalOpen(true);
                                                }}
                                            >
                                                <Ban className="mr-1.5 size-3.5" />
                                                Deactivate
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-emerald-600 hover:bg-emerald-50"
                                                onClick={() => {
                                                    router.post(
                                                        adminbranches.reactivate(selectedBranch.id).url,
                                                        {},
                                                        {
                                                            onSuccess: () => {
                                                                // Keep current selection after reactivation
                                                            },
                                                        }
                                                    );
                                                }}
                                            >
                                                <Power className="mr-1.5 size-3.5" />
                                                Reactivate
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Tabs Layout */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <Tabs defaultValue="overview" className="space-y-6">
                                        <TabsList className="bg-muted/60 p-1">
                                            <TabsTrigger value="overview" className="text-xs">
                                                Overview
                                            </TabsTrigger>
                                            <TabsTrigger value="staff" className="text-xs">
                                                Staff ({staffMembers.length})
                                            </TabsTrigger>
                                            <TabsTrigger value="warehouses" className="text-xs">
                                                Warehouses ({warehouses.length})
                                            </TabsTrigger>
                                            <TabsTrigger value="till" className="text-xs">
                                                Till Sessions
                                            </TabsTrigger>
                                            <TabsTrigger value="activity" className="text-xs">
                                                Activity
                                            </TabsTrigger>
                                        </TabsList>

                                        {/* Tab 1: Overview */}
                                        <TabsContent value="overview" className="space-y-6">
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                <Card className="border shadow-xs">
                                                    <CardContent className="p-4 space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <MapPin className="size-3.5" />
                                                            Region Allocation
                                                        </div>
                                                        <div className="text-base font-bold">
                                                            {selectedBranch.region.name}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Subject to regional tax & currency rules
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <Card className="border shadow-xs">
                                                    <CardContent className="p-4 space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Phone className="size-3.5" />
                                                            Store Contact
                                                        </div>
                                                        <div className="font-mono text-base font-semibold">
                                                            {selectedBranch.phone || 'None recorded'}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Customer receipts & queries
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <Card className="border shadow-xs">
                                                    <CardContent className="p-4 space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <CircleDot className="size-3.5" />
                                                            Operational Status
                                                        </div>
                                                        <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                                                            Open for Business
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            POS terminals connected
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            <Card className="border">
                                                <div className="border-b px-4 py-3 bg-muted/20">
                                                    <h3 className="text-sm font-semibold">Location & Street Details</h3>
                                                </div>
                                                <CardContent className="p-4 divide-y divide-border/60 text-sm">
                                                    <div className="flex items-center justify-between py-2">
                                                        <span className="text-muted-foreground">Physical Address</span>
                                                        <span className="font-medium">{selectedBranch.address}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-2">
                                                        <span className="text-muted-foreground">Branch ID</span>
                                                        <span className="font-mono text-xs">BR-{selectedBranch.id.toString().padStart(4, '0')}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-2">
                                                        <span className="text-muted-foreground">Data Partitioning</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            Orders, cash sessions, and stock partitioned to this store branch.
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        {/* Tab 2: Staff */}
                                        <TabsContent value="staff" className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-semibold">Staff Assigned to {selectedBranch.name}</h3>
                                                <Button size="sm" variant="outline">
                                                    <Plus className="mr-1.5 size-3.5" />
                                                    Assign Staff
                                                </Button>
                                            </div>

                                            {staffMembers.length > 0 ? (
                                                <div className="rounded-md border">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-muted/50">
                                                                <TableHead>User</TableHead>
                                                                <TableHead>Email</TableHead>
                                                                <TableHead>Assigned Role</TableHead>
                                                                <TableHead className="text-right">Action</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {staffMembers.map((member) => (
                                                                <TableRow key={member.id}>
                                                                    <TableCell className="font-medium">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <Avatar className="size-7">
                                                                                <AvatarFallback className="text-[10px] font-bold">
                                                                                    {member.name.slice(0, 2).toUpperCase()}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <span>{member.name}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-muted-foreground">
                                                                        {member.email}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge variant="outline" className="gap-1 text-[11px]">
                                                                            <Shield className="size-3" />
                                                                            {member.role}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                                                                            Manage
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                                    <Users className="mx-auto mb-2 size-6 text-muted-foreground/40" />
                                                    <p className="font-medium text-foreground">No staff assigned to this branch yet</p>
                                                    <p className="mt-1">Add staff users and assign roles to enable shift management and till sessions.</p>
                                                </div>
                                            )}
                                        </TabsContent>

                                        {/* Tab 3: Warehouses */}
                                        <TabsContent value="warehouses" className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-semibold">Store Warehouses & Stock Locations</h3>
                                                <Button size="sm" variant="outline">
                                                    <Plus className="mr-1.5 size-3.5" />
                                                    Add Warehouse
                                                </Button>
                                            </div>

                                            {warehouses.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    {warehouses.map((wh) => (
                                                        <Card key={wh.id} className="border shadow-xs">
                                                            <CardContent className="p-4 space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Warehouse className="size-4 text-primary" />
                                                                        <h4 className="text-sm font-semibold">{wh.name}</h4>
                                                                    </div>
                                                                    <Badge variant="secondary" className="text-[10px]">
                                                                        {wh.status}
                                                                    </Badge>
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Carries inventory for <span className="font-mono font-medium text-foreground">{wh.sku_count}</span> active SKUs.
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                                    <Warehouse className="mx-auto mb-2 size-6 text-muted-foreground/40" />
                                                    <p className="font-medium text-foreground">No inventory warehouses registered</p>
                                                    <p className="mt-1">Add a store warehouse or stock room location to track on-hand SKU inventory.</p>
                                                </div>
                                            )}
                                        </TabsContent>

                                        {/* Tab 4: Till Sessions */}
                                        <TabsContent value="till" className="space-y-4">
                                            {activeTillSession ? (
                                                <Card className="border">
                                                    <CardContent className="p-5">
                                                        <div className="flex items-center justify-between border-b pb-4">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="size-2 rounded-full bg-emerald-500" />
                                                                    <h4 className="text-sm font-bold">Today&apos;s Active Till Session</h4>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Opened at {new Date(activeTillSession.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {activeTillSession.user?.name ?? 'Assigned Cashier'}
                                                                </p>
                                                            </div>
                                                            <Badge variant="outline" className="font-mono text-xs">
                                                                Session #{activeTillSession.id}
                                                            </Badge>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
                                                            <div>
                                                                <div className="text-xs text-muted-foreground">Opening Float</div>
                                                                <div className="font-mono text-sm font-semibold">
                                                                    KES {Number(activeTillSession.opening_cash).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-muted-foreground">Session Status</div>
                                                                <div className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                                                                    {activeTillSession.status || 'Active'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-muted-foreground">Current Cashier</div>
                                                                <div className="text-sm font-semibold">{activeTillSession.user?.name ?? 'Assigned Cashier'}</div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ) : (
                                                <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                                    <Clock className="mx-auto mb-2 size-6 text-muted-foreground/40" />
                                                    <p className="font-medium text-foreground">No active till session today</p>
                                                    <p className="mt-1">When a cashier opens a register terminal, live drawer float details will display here.</p>
                                                </div>
                                            )}
                                        </TabsContent>

                                        {/* Tab 5: Activity Log */}
                                        <TabsContent value="activity">
                                            <ActivityTimeline 
                                                fetchUrl={adminactivity.branch({ branch: selectedBranch.id }).url}
                                                subjectLabel={selectedBranch.name}
                                            />
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
                                Select a branch from the list to view details
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Typed ConfirmDialog for Branch Deactivation */}
            <Dialog open={deactivateModalOpen} onOpenChange={setDeactivateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" />
                            <DialogTitle>Deactivate Branch &ldquo;{branchToDeactivate?.name}&rdquo;</DialogTitle>
                        </div>
                        <DialogDescription className="space-y-2 pt-2 text-sm">
                            <span className="block font-medium text-foreground">
                                Deactivating this branch stops register sessions and hides it from cashier terminals. Existing orders and stock records are preserved.
                            </span>
                            <span className="block text-muted-foreground">
                                To confirm deactivation, please type the branch name <strong className="text-foreground">{branchToDeactivate?.name}</strong> below:
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <Input
                            placeholder="Type branch name to confirm"
                            value={confirmBranchName}
                            onChange={(e) => setConfirmBranchName(e.target.value)}
                            className="font-mono text-sm"
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeactivateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={confirmBranchName !== branchToDeactivate?.name}
                            onClick={() => {
                                setDeactivateModalOpen(false);
                                router.delete(adminbranches.destroy(branchToDeactivate?.id).url, {
                                    onSuccess: (page) => {
                                        const updatedBranches = page.props.branches?.data || [];
                                        // Select first available branch after deletion
                                        const nextBranch = updatedBranches[0];
                                        setSelectedBranchId(nextBranch?.id ?? 0);
                                    },
                                });
                            }}
                        >
                            Deactivate Branch
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminBranchesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Branches',
            href: adminbranches.index().url,
        },
    ],
};