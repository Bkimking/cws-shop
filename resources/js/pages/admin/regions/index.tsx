import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import adminregions from '@/routes/admin/regions';
import adminactivity from '@/routes/admin/activity';
import {
    Globe,
    Building2,
    Plus,
    Search,
    Pencil,
    Ban,
    DollarSign,
    Clock,
    Percent,
    CreditCard,
    Smartphone,
    Coins,
    Banknote,
    Activity,
    ChevronRight,
    CircleDot,
    Store,
    MapPin,
    AlertTriangle,
    Power,
} from 'lucide-react';

interface BranchItem {
    id: number;
    name: string;
    phone?: string;
    is_active?: boolean;
    users_count?: number;
    users?: Array<{ id: number; name: string }>;
}

interface PaymentGatewayConfig {
    id: number;
    gateway: string;
    is_enabled: boolean;
}

interface Region {
    id: number;
    name: string;
    country_code: string;
    currency_code: string;
    tax_rate: number;
    tax_label?: string;
    timezone: string;
    is_active: boolean;
    branches_count: number;
    branches?: BranchItem[];
    payment_gateway_configs?: PaymentGatewayConfig[];
}

interface RegionsIndexProps {
    regions: {
        data: Region[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
}

// Country code to flag emoji helper
function getCountryFlag(code: string): string {
    if (!code || code.length !== 2) return '🌐';
    const offset = 127397;
    return String.fromCodePoint(...[...code.toUpperCase()].map((c) => c.charCodeAt(0) + offset));
}

export default function AdminRegionsIndex({ regions }: RegionsIndexProps) {
    const regionList = regions.data || [];
    const [selectedRegionId, setSelectedRegionId] = useState<number>(regionList[0]?.id ?? 1);
    const [searchQuery, setSearchQuery] = useState('');
    const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
    const [regionToDeactivate, setRegionToDeactivate] = useState<Region | null>(null);
    const [confirmRegionName, setConfirmRegionName] = useState('');

    // Gateway states per region initialized dynamically from backend
    const [gatewayStates, setGatewayStates] = useState<Record<number, Record<string, boolean>>>(() => {
        const initial: Record<number, Record<string, boolean>> = {};
        regionList.forEach((r) => {
            const configs = r.payment_gateway_configs || [];
            if (configs.length > 0) {
                const map: Record<string, boolean> = {};
                configs.forEach((c) => {
                    map[c.gateway.toLowerCase()] = c.is_enabled;
                });
                initial[r.id] = {
                    cash: map['cash'] ?? true,
                    mpesa: map['mpesa'] ?? (r.country_code.toUpperCase() === 'KE'),
                    airtel: map['airtel'] ?? (r.country_code.toUpperCase() === 'KE'),
                    card: map['card'] ?? true,
                    paypal: map['paypal'] ?? false,
                };
            } else {
                initial[r.id] = {
                    cash: true,
                    mpesa: r.country_code.toUpperCase() === 'KE',
                    airtel: r.country_code.toUpperCase() === 'KE',
                    card: true,
                    paypal: false,
                };
            }
        });
        return initial;
    });

    const selectedRegion = regionList.find((r) => r.id === selectedRegionId) || regionList[0];

    const toggleGateway = (regionId: number, gw: string) => {
        setGatewayStates((prev) => ({
            ...prev,
            [regionId]: {
                ...prev[regionId],
                [gw]: !prev[regionId]?.[gw],
            },
        }));
    };

    const filteredRegions = regionList.filter(
        (r) =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.country_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.currency_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <Head title="Regions" />

            <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
                {/* Header */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b px-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <Globe className="size-5 text-primary" />
                            <h1 className="text-xl font-semibold tracking-tight">Regions</h1>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Superadmin scope. Currency, tax rules, payment gateways, and branch nesting.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={adminregions.create().url}>
                            <Button size="sm">
                                <Plus className="mr-1.5 size-4" />
                                New Region
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Master-Detail Body */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    {/* Left Pane: Tree/List of Regions */}
                    <div className="flex w-80 shrink-0 flex-col border-r bg-muted/20">
                        <div className="border-b p-3">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search regions or currency..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9 pl-8 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredRegions.map((region) => {
                                const isSelected = region.id === selectedRegion?.id;
                                const flag = getCountryFlag(region.country_code);

                                return (
                                    <div
                                        key={region.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedRegionId(region.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setSelectedRegionId(region.id);
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
                                                <span className="text-base leading-none">{flag}</span>
                                                <span className="text-sm font-semibold tracking-tight">
                                                    {region.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <CircleDot
                                                    className={`size-2 ${
                                                        region.is_active
                                                            ? 'fill-emerald-500 text-emerald-500'
                                                            : 'fill-muted-foreground text-muted-foreground'
                                                    }`}
                                                />
                                                <Badge variant="outline" className="font-mono text-[10px]">
                                                    {region.currency_code}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Building2 className="size-3" />
                                                {region.branches_count} {region.branches_count === 1 ? 'branch' : 'branches'}
                                            </span>
                                            <span className="font-mono">
                                                Tax: {region.tax_rate}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredRegions.length === 0 && (
                                <div className="p-6 text-center text-sm text-muted-foreground">
                                    No regions found matching &quot;{searchQuery}&quot;
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Detail Pane */}
                    <div className="flex flex-1 flex-col overflow-hidden bg-background">
                        {selectedRegion ? (
                            <>
                                {/* Header / Hero */}
                                <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/30 text-2xl shadow-xs">
                                            {getCountryFlag(selectedRegion.country_code)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <h2 className="text-lg font-bold tracking-tight">
                                                    {selectedRegion.name}
                                                </h2>
                                                <Badge
                                                    variant={selectedRegion.is_active ? 'default' : 'secondary'}
                                                    className="gap-1 text-xs"
                                                >
                                                    <CircleDot className="size-1.5 fill-current" />
                                                    {selectedRegion.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {selectedRegion.currency_code}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Country: {selectedRegion.country_code} • Timezone: {selectedRegion.timezone}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Toolbar */}
                                    <div className="flex items-center gap-2">
                                        <Link href={adminregions.edit(selectedRegion.id).url}>
                                            <Button variant="outline" size="sm">
                                                <Pencil className="mr-1.5 size-3.5" />
                                                Edit
                                            </Button>
                                        </Link>
                                        {selectedRegion.is_active ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    setRegionToDeactivate(selectedRegion);
                                                    setConfirmRegionName('');
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
                                                        adminregions.reactivate(selectedRegion.id).url,
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

                                {/* Tabs Navigation */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <Tabs defaultValue="overview" className="space-y-6">
                                        <TabsList className="bg-muted/60 p-1">
                                            <TabsTrigger value="overview" className="text-xs">
                                                Overview
                                            </TabsTrigger>
                                            <TabsTrigger value="gateways" className="text-xs">
                                                Payment Gateways
                                            </TabsTrigger>
                                            <TabsTrigger value="branches" className="text-xs">
                                                Branches ({selectedRegion.branches_count})
                                            </TabsTrigger>
                                            <TabsTrigger value="activity" className="text-xs">
                                                Activity
                                            </TabsTrigger>
                                        </TabsList>

                                        {/* Tab 1: Overview */}
                                        <TabsContent value="overview" className="space-y-6">
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                <Card className="border shadow-xs">
                                                    <CardContent className="p-4 space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <DollarSign className="size-3.5" />
                                                            Currency
                                                        </div>
                                                        <div className="font-mono text-lg font-bold">
                                                            {selectedRegion.currency_code}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Primary tender currency
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <Card className="border shadow-xs">
                                                    <CardContent className="p-4 space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Percent className="size-3.5" />
                                                            Tax Rate
                                                        </div>
                                                        <div className="font-mono text-lg font-bold">
                                                            {selectedRegion.tax_rate}%
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {selectedRegion.tax_label || 'Standard VAT'}
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <Card className="border shadow-xs">
                                                    <CardContent className="p-4 space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Clock className="size-3.5" />
                                                            Timezone
                                                        </div>
                                                        <div className="text-base font-semibold truncate">
                                                            {selectedRegion.timezone}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Shift & till cutoff times
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <Card className="border shadow-xs">
                                                    <CardContent className="p-4 space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Building2 className="size-3.5" />
                                                            Active Stores
                                                        </div>
                                                        <div className="font-mono text-lg font-bold">
                                                            {selectedRegion.branches_count}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Across this territory
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            <Card className="border">
                                                <div className="border-b px-4 py-3 bg-muted/20">
                                                    <h3 className="text-sm font-semibold">Locale & Taxation Specs</h3>
                                                </div>
                                                <CardContent className="p-4 divide-y divide-border/60 text-sm">
                                                    <div className="flex items-center justify-between py-2">
                                                        <span className="text-muted-foreground">Country Code</span>
                                                        <span className="font-mono font-medium">{selectedRegion.country_code}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-2">
                                                        <span className="text-muted-foreground">Tax Identifier Label</span>
                                                        <span className="font-medium">{selectedRegion.tax_label || 'VAT / Sales Tax'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-2">
                                                        <span className="text-muted-foreground">Sales Restriction Status</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                            Operational (New sales permitted)
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        {/* Tab 2: Gateways */}
                                        <TabsContent value="gateways" className="space-y-4">
                                            <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
                                                Toggle which payment providers and methods are enabled for cashiers across branches in <strong>{selectedRegion.name}</strong>.
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                {[
                                                    { key: 'cash', name: 'Cash', icon: Banknote, desc: 'Physical cash till tender & drawer drops' },
                                                    { key: 'mpesa', name: 'M-Pesa (Daraja)', icon: Smartphone, desc: 'Direct STK push & C2B till confirmation' },
                                                    { key: 'airtel', name: 'Airtel Money', icon: Smartphone, desc: 'Airtel merchant collection & express USSD' },
                                                    { key: 'card', name: 'Card Terminal / Pesapal', icon: CreditCard, desc: 'Integrated EFTPOS terminal or Pesapal gateway' },
                                                    { key: 'paypal', name: 'PayPal', icon: Coins, desc: 'International tourist storefront payments' },
                                                ].map((gw) => {
                                                    const isEnabled = gatewayStates[selectedRegion.id]?.[gw.key] ?? false;
                                                    const Icon = gw.icon;

                                                    return (
                                                        <div
                                                            key={gw.key}
                                                            className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                                                                isEnabled ? 'border-primary/40 bg-primary/5' : 'bg-card'
                                                            }`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className={`mt-0.5 rounded-md p-2 ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                                    <Icon className="size-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="text-sm font-semibold">{gw.name}</h4>
                                                                        <CircleDot className={`size-2 ${isEnabled ? 'fill-emerald-500 text-emerald-500' : 'fill-muted-foreground text-muted-foreground'}`} />
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {gw.desc}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <Button
                                                                variant={isEnabled ? 'default' : 'outline'}
                                                                size="sm"
                                                                onClick={() => toggleGateway(selectedRegion.id, gw.key)}
                                                                className="h-8 text-xs"
                                                            >
                                                                {isEnabled ? 'Enabled' : 'Disabled'}
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </TabsContent>

                                        {/* Tab 3: Branches Table */}
                                        <TabsContent value="branches" className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-semibold">Registered Stores in {selectedRegion.name}</h3>
                                                <Link href={adminregions.create().url}>
                                                    <Button size="sm" variant="outline">
                                                        <Plus className="mr-1.5 size-3.5" />
                                                        Add Store to Region
                                                    </Button>
                                                </Link>
                                            </div>

                                            <div className="rounded-md border">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/50">
                                                            <TableHead>Store Name</TableHead>
                                                            <TableHead>Contact Phone</TableHead>
                                                            <TableHead>Staff Assigned</TableHead>
                                                            <TableHead>Till Status</TableHead>
                                                            <TableHead className="text-right">Action</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {selectedRegion.branches && selectedRegion.branches.length > 0 ? (
                                                            selectedRegion.branches.map((b) => (
                                                                <TableRow key={b.id}>
                                                                    <TableCell className="font-medium">
                                                                        <div className="flex items-center gap-2">
                                                                            <Store className="size-4 text-muted-foreground" />
                                                                            <span>{b.name}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-muted-foreground">
                                                                        {b.phone || '—'}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs">
                                                                        {b.users ? b.users.length : (b.users_count ?? 0)} staff
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge variant="outline" className="gap-1 text-[11px]">
                                                                            <CircleDot className={`size-1.5 ${b.is_active !== false ? 'fill-emerald-500 text-emerald-500' : 'fill-muted-foreground text-muted-foreground'}`} />
                                                                            {b.is_active !== false ? 'Active' : 'Inactive'}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Link href={`/admin/branches`}>
                                                                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                                                                                View
                                                                            </Button>
                                                                        </Link>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <TableRow>
                                                                <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                                                                    No branches registered in this region yet.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </TabsContent>

                                        {/* Tab 4: Activity Log */}
                                        <TabsContent value="activity">
                                            <ActivityTimeline 
                                                fetchUrl={adminactivity.region({ region: selectedRegion.id }).url}
                                                subjectLabel={selectedRegion.name}
                                            />
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
                                Select a region from the list to view details
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Typed ConfirmDialog for Region Deactivation (per doc 06) */}
            <Dialog open={deactivateModalOpen} onOpenChange={setDeactivateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" />
                            <DialogTitle>Deactivate Region &ldquo;{regionToDeactivate?.name}&rdquo;</DialogTitle>
                        </div>
                        <DialogDescription className="space-y-2 pt-2 text-sm">
                            <span className="block font-medium text-foreground">
                                Deactivating {regionToDeactivate?.name} hides it from switchers and stops new sales in its branches. Existing orders stay.
                            </span>
                            <span className="block text-muted-foreground">
                                To confirm deactivation, please type the region name <strong className="text-foreground">{regionToDeactivate?.name}</strong> below:
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <Input
                            placeholder="Type region name to confirm"
                            value={confirmRegionName}
                            onChange={(e) => setConfirmRegionName(e.target.value)}
                            className="font-mono text-sm"
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeactivateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={confirmRegionName !== regionToDeactivate?.name}
                            onClick={() => {
                                setDeactivateModalOpen(false);
                                router.delete(adminregions.destroy(regionToDeactivate?.id).url, {
                                    onSuccess: (page) => {
                                        const updatedRegions = page.props.regions?.data || [];
                                        // Select first available region after deletion
                                        const nextRegion = updatedRegions[0];
                                        setSelectedRegionId(nextRegion?.id ?? 0);
                                    },
                                });
                            }}
                        >
                            Deactivate Region
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminRegionsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Regions',
            href: adminregions.index().url,
        },
    ],
};