import { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import adminroles from '@/routes/admin/roles';
import {
    ShieldCheck,
    Plus,
    Search,
    Users,
    Key,
    AlertCircle,
    Save,
    RotateCcw,
    Trash2,
    Lock,
    Info,
    Check,
} from 'lucide-react';

interface Permission {
    id: number;
    name: string;
}

interface Role {
    id: number;
    name: string;
    users_count?: number;
    permissions: Permission[];
}

interface RolesIndexProps {
    roles: Role[];
    permissions: Permission[];
}

// 8 Spec Permission Resource Groups
const PERMISSION_GROUPS: { name: string; matchers: string[]; description: string }[] = [
    {
        name: 'Catalog',
        matchers: ['products', 'categories', 'barcode'],
        description: 'Product definitions, pricing, variants, and catalog categorization',
    },
    {
        name: 'Stock',
        matchers: ['stock', 'inventory', 'warehouses', 'adjust stock', 'transfer stock'],
        description: 'Stock management, branch warehouses, transfer and adjustments',
    },
    {
        name: 'Orders',
        matchers: ['orders', 'refund', 'receipt', 'sales'],
        description: 'Order capture, refunds, reprints, and line adjustments',
    },
    {
        name: 'Till and POS',
        matchers: ['pos', 'terminal', 'till', 'cashier'],
        description: 'Register opening/closing, drawer cash drops, and hardware terminal usage',
    },
    {
        name: 'Organisation',
        matchers: ['regions', 'branches', 'users', 'roles', 'organisation'],
        description: 'Stores, sub-regions, administrative staff, and role hierarchies',
    },
    {
        name: 'Reports',
        matchers: ['reports', 'analytics', 'audit'],
        description: 'Branch, regional, and system-wide financial and operational reporting',
    },
    {
        name: 'AI',
        matchers: ['ai', 'insights', 'assistant', 'recommendations'],
        description: 'Predictive sales summaries, low-stock warnings, and conversational queries',
    },
    {
        name: 'System',
        matchers: ['gateways', 'settings', 'activity', 'system', 'backups'],
        description: 'Payment gateways, tenant preferences, audit logs, and integrations',
    },
];

function getPermissionGroup(permName: string): string {
    const lower = permName.toLowerCase();
    for (const group of PERMISSION_GROUPS) {
        if (group.matchers.some((m) => lower.includes(m))) {
            return group.name;
        }
    }
    return 'System';
}

export default function AdminRolesIndex({ roles, permissions }: RolesIndexProps) {
    const [selectedRoleId, setSelectedRoleId] = useState<number>(roles[0]?.id ?? 1);
    const [searchQuery, setSearchQuery] = useState('');
    const [permSearchQuery, setPermSearchQuery] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [confirmRoleName, setConfirmRoleName] = useState('');

    // Local state for role permissions edits: { [roleId]: Set<string> }
    const [rolePermsMap, setRolePermsMap] = useState<Record<number, Set<string>>>(() => {
        const initial: Record<number, Set<string>> = {};
        roles.forEach((r) => {
            initial[r.id] = new Set(r.permissions.map((p) => p.name));
        });
        return initial;
    });

    const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];
    const isSuperadmin = selectedRole?.name.toLowerCase() === 'superadmin';

    // Original permissions for selected role
    const originalPerms = useMemo(() => {
        if (!selectedRole) return new Set<string>();
        return new Set(selectedRole.permissions.map((p) => p.name));
    }, [selectedRole]);

    const currentPerms = rolePermsMap[selectedRole?.id] || new Set<string>();

    // Calculate diffs for unsaved changes bar
    const addedPerms = useMemo(() => {
        const added: string[] = [];
        currentPerms.forEach((p) => {
            if (!originalPerms.has(p)) added.push(p);
        });
        return added;
    }, [currentPerms, originalPerms]);

    const removedPerms = useMemo(() => {
        const removed: string[] = [];
        originalPerms.forEach((p) => {
            if (!currentPerms.has(p)) removed.push(p);
        });
        return removed;
    }, [currentPerms, originalPerms]);

    const hasChanges = !isSuperadmin && (addedPerms.length > 0 || removedPerms.length > 0);

    const togglePermission = (permName: string) => {
        if (isSuperadmin) return;
        setRolePermsMap((prev) => {
            const current = new Set(prev[selectedRole.id] || []);
            if (current.has(permName)) {
                current.delete(permName);
            } else {
                current.add(permName);
            }
            return {
                ...prev,
                [selectedRole.id]: current,
            };
        });
    };

    const handleReset = () => {
        setRolePermsMap((prev) => ({
            ...prev,
            [selectedRole.id]: new Set(originalPerms),
        }));
    };

    const handleSave = () => {
        // Will trigger backend save request when wired
        alert(`Permissions updated for ${selectedRole.name}`);
    };

    // Filtered permissions grouped by resource
    const groupedPermissions = useMemo(() => {
        const filtered = permissions.filter((p) =>
            p.name.toLowerCase().includes(permSearchQuery.toLowerCase())
        );

        const map: Record<string, Permission[]> = {};
        PERMISSION_GROUPS.forEach((g) => {
            map[g.name] = [];
        });

        filtered.forEach((p) => {
            const grp = getPermissionGroup(p.name);
            if (!map[grp]) map[grp] = [];
            map[grp].push(p);
        });

        return map;
    }, [permissions, permSearchQuery]);

    // Roles filter
    const filteredRoles = roles.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <Head title="Roles & Permissions" />

            <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
                {/* Header */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b px-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="size-5 text-primary" />
                            <h1 className="text-xl font-semibold tracking-tight">Roles & Permissions</h1>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Superadmin-only matrix. Manage permission sets assigned to operational roles.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={adminroles.index().url}>
                            <Button size="sm">
                                <Plus className="mr-1.5 size-4" />
                                New Role
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Master-Detail Workspace */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    {/* Left List Pane: Roles */}
                    <div className="flex w-80 shrink-0 flex-col border-r bg-muted/20">
                        <div className="border-b p-3">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search roles..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9 pl-8 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredRoles.map((role) => {
                                const isSelected = role.id === selectedRole?.id;
                                const isRoleSuper = role.name.toLowerCase() === 'superadmin';
                                const activeCount = isRoleSuper
                                    ? permissions.length
                                    : (rolePermsMap[role.id]?.size ?? role.permissions.length);
                                const userCount = role.users_count ?? 0;

                                return (
                                    <div
                                        key={role.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedRoleId(role.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setSelectedRoleId(role.id);
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
                                                {isRoleSuper ? (
                                                    <Lock className="size-3.5 text-amber-500" />
                                                ) : (
                                                    <ShieldCheck className="size-3.5 text-muted-foreground group-hover:text-foreground" />
                                                )}
                                                <span className="text-sm font-medium tracking-tight">
                                                    {role.name}
                                                </span>
                                            </div>
                                            {isRoleSuper && (
                                                <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase font-bold text-amber-500 border-amber-500/30">
                                                    Full
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Users className="size-3" />
                                                {userCount} {userCount === 1 ? 'user' : 'users'}
                                            </span>
                                            <span>
                                                {activeCount} perms
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredRoles.length === 0 && (
                                <div className="p-6 text-center text-sm text-muted-foreground">
                                    No roles found matching &quot;{searchQuery}&quot;
                                </div>
                            )}
                        </div>

                        {/* Hint footer in list pane */}
                        <div className="border-t p-3 text-[11px] text-muted-foreground">
                            &ldquo;New role&rdquo; is rarely required. Roles should match standard store hierarchy.
                        </div>
                    </div>

                    {/* Right Detail Pane: Permission Matrix */}
                    <div className="flex flex-1 flex-col overflow-hidden bg-background">
                        {selectedRole && (
                            <>
                                {/* Detail Header & Toolbar */}
                                <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-lg font-bold">{selectedRole.name}</h2>
                                            <Badge variant="secondary" className="gap-1 text-xs">
                                                <Users className="size-3" />
                                                {selectedRole.users_count ?? 0} {selectedRole.users_count === 1 ? 'user' : 'users'} assigned
                                            </Badge>
                                            {isSuperadmin && (
                                                <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                                                    Superadmin Protected
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {isSuperadmin
                                                ? 'Superadmin always has every permission across all modules and regions.'
                                                : 'Configure granular permissions granted to this operational role.'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {!isSuperadmin && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    setRoleToDelete(selectedRole);
                                                    setConfirmRoleName('');
                                                    setDeleteModalOpen(true);
                                                }}
                                            >
                                                <Trash2 className="mr-1.5 size-3.5" />
                                                Delete Role
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Unsaved changes banner */}
                                {hasChanges && (
                                    <div className="flex shrink-0 items-center justify-between border-b bg-amber-500/10 px-6 py-2.5 text-xs text-amber-600 dark:text-amber-400">
                                        <div className="flex items-center gap-2 font-medium">
                                            <AlertCircle className="size-4 shrink-0" />
                                            <span>
                                                {addedPerms.length + removedPerms.length} change(s) not saved:
                                            </span>
                                            <span className="font-mono text-[11px]">
                                                {addedPerms.map((p) => `+ ${p}`).join(', ')}
                                                {addedPerms.length > 0 && removedPerms.length > 0 && '; '}
                                                {removedPerms.map((p) => `− ${p}`).join(', ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleReset}>
                                                <RotateCcw className="mr-1 size-3" />
                                                Revert
                                            </Button>
                                            <Button size="sm" className="h-7 text-xs" onClick={handleSave}>
                                                <Save className="mr-1 size-3" />
                                                Save permissions
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Permissions Matrix Content */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {/* Quick filter in detail pane */}
                                    <div className="flex items-center justify-between">
                                        <div className="relative w-72">
                                            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Filter permissions..."
                                                value={permSearchQuery}
                                                onChange={(e) => setPermSearchQuery(e.target.value)}
                                                className="h-8 pl-8 text-xs"
                                            />
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {isSuperadmin
                                                ? `${permissions.length} total permissions enabled`
                                                : `${currentPerms.size} of ${permissions.length} active`}
                                        </div>
                                    </div>

                                    {/* Permission Grid Grouped by Resource */}
                                    <div className="space-y-6">
                                        {PERMISSION_GROUPS.map((group) => {
                                            const groupPerms = groupedPermissions[group.name] || [];
                                            if (groupPerms.length === 0 && permSearchQuery) return null;

                                            return (
                                                <Card key={group.name} className="overflow-hidden border shadow-xs">
                                                    <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
                                                        <div>
                                                            <h3 className="text-sm font-semibold tracking-tight">
                                                                {group.name}
                                                            </h3>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {group.description}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {groupPerms.filter((p) => isSuperadmin || currentPerms.has(p.name)).length} / {groupPerms.length}
                                                        </Badge>
                                                    </div>
                                                    <CardContent className="p-4">
                                                        {groupPerms.length > 0 ? (
                                                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                                                                {groupPerms.map((perm) => {
                                                                    const checked = isSuperadmin || currentPerms.has(perm.name);
                                                                    return (
                                                                        <label
                                                                            key={perm.id}
                                                                            className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 transition-colors ${
                                                                                checked
                                                                                    ? 'border-primary/40 bg-primary/5'
                                                                                    : 'border-border/60 hover:bg-muted/30'
                                                                            } ${isSuperadmin ? 'cursor-not-allowed opacity-90' : ''}`}
                                                                        >
                                                                            <Checkbox
                                                                                checked={checked}
                                                                                disabled={isSuperadmin}
                                                                                onCheckedChange={() => togglePermission(perm.name)}
                                                                                className="mt-0.5"
                                                                            />
                                                                            <div className="space-y-0.5">
                                                                                <p className="font-mono text-xs font-medium text-foreground">
                                                                                    {perm.name}
                                                                                </p>
                                                                                <p className="text-[10px] text-muted-foreground capitalize">
                                                                                    Allows user to {perm.name}
                                                                                </p>
                                                                            </div>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="py-2 text-center text-xs text-muted-foreground">
                                                                No permissions in this group match &quot;{permSearchQuery}&quot;
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>

                                    {/* Note under the matrix (as required by doc 06 / 04) */}
                                    <div className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
                                        <Info className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="font-medium text-foreground">Developer-owned permission contract</p>
                                            <p className="mt-0.5">
                                                Permission names are set by developers. You can change which role has them, not create new ones.
                                                Role scoping (e.g. branch vs regional access) is enforced automatically by backend policies.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Typed Confirm Dialog for Deleting Role in use */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Role &ldquo;{roleToDelete?.name}&rdquo;</DialogTitle>
                        <DialogDescription className="space-y-2 pt-2 text-sm">
                            <span className="block text-destructive font-medium">
                                Caution: Deleting this role will affect {roleToDelete?.users_count ?? 0} {roleToDelete?.users_count === 1 ? 'user' : 'users'} currently assigned to it.
                            </span>
                            <span className="block text-muted-foreground">
                                Users with this role will immediately lose all associated privileges until reassigned.
                                To confirm, please type the role name <strong className="text-foreground">{roleToDelete?.name}</strong> below:
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <Input
                            placeholder="Type role name to confirm"
                            value={confirmRoleName}
                            onChange={(e) => setConfirmRoleName(e.target.value)}
                            className="font-mono text-sm"
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={confirmRoleName !== roleToDelete?.name}
                            onClick={() => {
                                setDeleteModalOpen(false);
                                alert(`Role ${roleToDelete?.name} deleted.`);
                            }}
                        >
                            Delete Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminRolesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Roles',
            href: adminroles.index().url,
        },
    ],
};