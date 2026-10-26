import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import adminpaymentgateways from '@/routes/admin/payment-gateways';
import type { Auth } from '@/types';
import {
    Wallet,
    Globe,
    Activity,
    CheckCircle2,
    RefreshCw,
    Plus,
    Pencil,
    Trash2,
} from 'lucide-react';

interface Gateway {
    id: number;
    region_id: number;
    gateway: string;
    is_enabled: boolean;
    region?: { name: string };
}

interface GatewaysIndexProps {
    gateways: Gateway[];
}

export default function GatewaysIndex({ gateways }: GatewaysIndexProps) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const permissions = auth.permissions ?? [];
    const can = (permission: string) => permissions.includes(permission);
    const canCreate = can('create payment gateways');
    const canEdit = can('edit payment gateways');
    const canDelete = can('delete payment gateways');
    const canActivate = can('activate payment gateways');
    const gatewayList = gateways || [];
    const [selectedGatewayId, setSelectedGatewayId] = useState<number>(
        gatewayList[0]?.id ?? 1,
    );
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [gatewayToDelete, setGatewayToDelete] = useState<Gateway | null>(
        null,
    );
    const [testingConnection, setTestingConnection] = useState(false);

    const selectedGateway =
        gatewayList.find((g) => g.id === selectedGatewayId) || gatewayList[0];

    const handleToggleEnabled = (gateway: Gateway) => {
        router.post(
            `/admin/payment-gateways/${gateway.id}/activate`,
            {},
            { preserveScroll: true },
        );
    };

    const handleDelete = () => {
        if (!gatewayToDelete) return;

        router.delete(adminpaymentgateways.destroy(gatewayToDelete.id).url, {
            onSuccess: () => {
                setDeleteModalOpen(false);
                setGatewayToDelete(null);
                setSelectedGatewayId(gatewayList[0]?.id ?? null);
            },
        });
    };

    const handleDeleteClick = (gateway: Gateway) => {
        setGatewayToDelete(gateway);
        setDeleteModalOpen(true);
    };

    const handleTestConnection = (gateway: Gateway) => {
        setTestingConnection(true);
        router.post(
            adminpaymentgateways.testConnection(gateway.id).url,
            {},
            {
                onSuccess: () => {
                    setTestingConnection(false);
                },
                onError: () => {
                    setTestingConnection(false);
                },
            },
        );
    };

    return (
        <>
            <Head title="Payment Gateways" />

            <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
                {/* Header */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b px-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <Wallet className="size-5 text-primary" />
                            <h1 className="text-xl font-semibold tracking-tight">
                                Payment Gateways
                            </h1>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Manage payment methods and API credentials for each
                            region.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {canCreate && (
                            <Link href={adminpaymentgateways.create().url}>
                                <Button size="sm">
                                    <Plus className="mr-1.5 size-4" />
                                    Add Gateway
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Master-Detail Layout */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    {/* Left Pane: Gateway List */}
                    <div className="flex w-96 shrink-0 flex-col border-r bg-muted/20">
                        {/* List Items */}
                        <div className="flex-1 space-y-2 overflow-y-auto p-4">
                            {gatewayList.map((gateway) => {
                                const isSelected =
                                    gateway.id === selectedGateway?.id;

                                return (
                                    <div
                                        key={gateway.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                            setSelectedGatewayId(gateway.id)
                                        }
                                        className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-lg border p-4 text-left transition-all outline-none ${
                                            isSelected
                                                ? 'border-primary/50 bg-primary/5 shadow-xs'
                                                : 'border-transparent hover:border-border hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                                                    <Wallet className="size-4 text-primary" />
                                                </div>
                                                <span className="text-sm font-semibold tracking-tight capitalize">
                                                    {gateway.gateway}
                                                </span>
                                            </div>
                                            <div
                                                className={`size-2.5 rounded-full ${gateway.is_enabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                                            />
                                        </div>

                                        <div className="mt-2 flex items-center justify-between pl-11 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Globe className="size-3" />
                                                {gateway.region?.name ||
                                                    'All Regions'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {gatewayList.length === 0 && (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    No payment gateways configured.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Gateway Details */}
                    <div className="flex flex-1 flex-col overflow-hidden bg-background">
                        {selectedGateway ? (
                            <>
                                {/* Header / Hero */}
                                <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40 shadow-xs">
                                            <Wallet className="size-6 text-primary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2.5">
                                                <h2 className="text-lg font-bold tracking-tight capitalize">
                                                    {selectedGateway.gateway}
                                                </h2>
                                                <Badge
                                                    variant="outline"
                                                    className="gap-1 text-xs"
                                                >
                                                    <Globe className="size-3" />
                                                    {selectedGateway.region
                                                        ?.name || 'All'}
                                                </Badge>
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                Configure API credentials and
                                                settings.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Toolbar */}
                                    <div className="flex items-center gap-2">
                                        {canEdit && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleTestConnection(
                                                        selectedGateway,
                                                    )
                                                }
                                                disabled={testingConnection}
                                            >
                                                <RefreshCw
                                                    className={`mr-1.5 size-3.5 ${testingConnection ? 'animate-spin' : ''}`}
                                                />
                                                {testingConnection
                                                    ? 'Testing...'
                                                    : 'Test Connection'}
                                            </Button>
                                        )}
                                        {canEdit && (
                                            <Link
                                                href={
                                                    adminpaymentgateways.edit(
                                                        selectedGateway.id,
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
                                                onClick={() =>
                                                    handleDeleteClick(
                                                        selectedGateway,
                                                    )
                                                }
                                            >
                                                <Trash2 className="mr-1.5 size-3.5" />
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Tabs Layout */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <Tabs
                                        defaultValue="config"
                                        className="space-y-6"
                                    >
                                        <TabsList className="bg-muted/60 p-1">
                                            <TabsTrigger
                                                value="config"
                                                className="text-xs"
                                            >
                                                Configuration
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent
                                            value="config"
                                            className="space-y-4"
                                        >
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-medium">
                                                        Gateway Status
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium">
                                                            Enable{' '}
                                                            {
                                                                selectedGateway.gateway
                                                            }
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Allow customers to
                                                            pay using this
                                                            method.
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        checked={
                                                            selectedGateway.is_enabled
                                                        }
                                                        disabled={!canActivate}
                                                        onCheckedChange={() =>
                                                            handleToggleEnabled(
                                                                selectedGateway,
                                                            )
                                                        }
                                                    />
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-medium">
                                                        Region
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="size-4 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {selectedGateway
                                                                .region?.name ||
                                                                'All Regions'}
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center">
                                <div className="text-center text-muted-foreground">
                                    <Wallet className="mx-auto mb-4 size-12 opacity-50" />
                                    <p className="text-sm">
                                        Select a payment gateway to view details
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Delete Confirmation Modal */}
                <Dialog
                    open={deleteModalOpen}
                    onOpenChange={setDeleteModalOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Payment Gateway</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete the{' '}
                                <strong>{gatewayToDelete?.gateway}</strong>{' '}
                                payment gateway? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
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
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

GatewaysIndex.layout = {
    breadcrumbs: [
        { title: 'Payment Gateways', href: adminpaymentgateways.index().url },
    ],
};
