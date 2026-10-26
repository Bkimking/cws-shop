import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import ActivityTimeline from '@/components/admin/ActivityTimeline';
import adminusers from '@/routes/admin/users';
import adminactivity from '@/routes/admin/activity';
import type { Auth } from '@/types';
import {
    Plus,
    Search,
    Users,
    Mail,
    Building2,
    MapPin,
    ShieldCheck,
    KeyRound,
    CircleDot,
    UserX,
    Pencil,
    Clock,
    Power,
} from 'lucide-react';

interface Role {
    id: number;
    name: string;
    permissions?: Permission[];
}

interface Branch {
    id: number;
    name: string;
}

interface Region {
    id: number;
    name: string;
}

interface Permission {
    id: number;
    name: string;
    group?: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    is_active?: boolean;
    last_login_at?: string;
    roles: Role[];
    branch: Branch | null;
    region: Region | null;
    permissions?: Permission[];
}

interface UsersIndexProps {
    users: {
        data: User[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    roles?: Role[];
    branches?: Branch[];
}

function initials(name: string) {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function RoleChip({ name }: { name: string }) {
    return (
        <Badge
            variant="outline"
            className="gap-1 border-[#5bbfe6]/30 bg-[#5bbfe6]/10 text-xs text-[#5bbfe6]"
        >
            <ShieldCheck className="size-3" />
            {name}
        </Badge>
    );
}

function BranchChip({ name }: { name: string }) {
    return (
        <Badge variant="outline" className="gap-1 text-xs">
            <Building2 className="size-3" />
            {name}
        </Badge>
    );
}

function StatusDot({ active }: { active?: boolean }) {
    return (
        <CircleDot
            className={`size-3.5 ${active !== false ? 'text-[#4fce8a]' : 'text-muted-foreground'}`}
        />
    );
}

function DetailSkeleton() {
    return (
        <div className="space-y-4 p-6">
            <div className="flex items-center gap-4">
                <Skeleton className="size-14 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
    );
}

export default function AdminUsersIndex({
    users,
    roles,
    branches,
}: UsersIndexProps) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const permissions = auth.permissions ?? [];
    const can = (permission: string) => permissions.includes(permission);
    const canCreate = can('create users');
    const canEdit = can('edit users');
    const canDelete = can('delete users');
    const [selected, setSelected] = useState<User | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string | null>(null);

    const allRoles = roles
        ? roles.map((r) => r.name)
        : Array.from(
              new Set(users.data.flatMap((u) => u.roles.map((r) => r.name))),
          );

    const filtered = users.data.filter((u) => {
        const matchSearch =
            !search ||
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase());
        const matchRole =
            !roleFilter || u.roles.some((r) => r.name === roleFilter);
        return matchSearch && matchRole;
    });

    return (
        <>
            <Head title="Users" />
            <div className="flex h-full flex-1 flex-col">
                {/* Page header */}
                <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Users</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage staff accounts and access
                        </p>
                    </div>
                    {canCreate && (
                        <Link href={adminusers.create().url}>
                            <Button className="gap-2 bg-[#5bbfe6] text-white hover:bg-[#5bbfe6]/90">
                                <Plus className="size-4" />
                                Add user
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Master-detail split */}
                <div className="flex flex-1 overflow-hidden">
                    {/* List pane */}
                    <div className="flex w-80 shrink-0 flex-col border-r border-border/60 lg:w-96">
                        {/* Search + filters */}
                        <div className="space-y-2 border-b border-border/60 p-3">
                            <div className="relative">
                                <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search users…"
                                    className="pl-8 text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            {allRoles.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        onClick={() => setRoleFilter(null)}
                                        className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                                            !roleFilter
                                                ? 'bg-[#5bbfe6]/20 text-[#5bbfe6]'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        All
                                    </button>
                                    {allRoles.map((r) => (
                                        <button
                                            key={r}
                                            onClick={() =>
                                                setRoleFilter(
                                                    r === roleFilter ? null : r,
                                                )
                                            }
                                            className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                                                roleFilter === r
                                                    ? 'bg-[#5bbfe6]/20 text-[#5bbfe6]'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* User rows */}
                        <div className="flex-1 overflow-y-auto">
                            {filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Users className="mb-2 size-8 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                        {search || roleFilter
                                            ? 'No matches. Clear filters.'
                                            : 'No users yet. Add the first one.'}
                                    </p>
                                    {(search || roleFilter) && (
                                        <button
                                            onClick={() => {
                                                setSearch('');
                                                setRoleFilter(null);
                                            }}
                                            className="mt-2 text-xs text-[#5bbfe6] hover:underline"
                                        >
                                            Clear filters
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-border/60">
                                    {filtered.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={() => setSelected(user)}
                                            className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                                                selected?.id === user.id
                                                    ? 'bg-muted/60'
                                                    : ''
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="size-9 shrink-0">
                                                    <AvatarFallback className="bg-muted text-xs">
                                                        {initials(user.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate text-sm font-medium">
                                                            {user.name}
                                                        </span>
                                                        <StatusDot
                                                            active={
                                                                user.is_active
                                                            }
                                                        />
                                                    </div>
                                                    <div className="mt-0.5 flex items-center gap-1.5">
                                                        {user.roles[0] && (
                                                            <RoleChip
                                                                name={
                                                                    user
                                                                        .roles[0]
                                                                        .name
                                                                }
                                                            />
                                                        )}
                                                        {user.branch && (
                                                            <span className="truncate text-xs text-muted-foreground">
                                                                {
                                                                    user.branch
                                                                        .name
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {users.links.length > 3 && (
                            <div className="flex items-center justify-center gap-1.5 border-t border-border/60 p-3">
                                {users.links.map((link, i) =>
                                    link.url ? (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            className={`rounded-md px-2.5 py-1 text-xs ${
                                                link.active
                                                    ? 'bg-[#5bbfe6] text-white'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    ) : (
                                        <span
                                            key={i}
                                            className="rounded-md px-2.5 py-1 text-xs text-muted-foreground/50"
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    ),
                                )}
                            </div>
                        )}
                    </div>

                    {/* Detail pane */}
                    <div className="flex flex-1 flex-col overflow-y-auto">
                        {!selected ? (
                            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                                <Users className="mb-3 size-10 text-muted-foreground/30" />
                                <p className="text-sm text-muted-foreground">
                                    Select a user to view details
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Detail header */}
                                <div className="border-b border-border/60 px-6 py-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="size-14">
                                                <AvatarFallback className="bg-muted text-base">
                                                    {initials(selected.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-lg font-semibold">
                                                        {selected.name}
                                                    </h2>
                                                    <StatusDot
                                                        active={
                                                            selected.is_active
                                                        }
                                                    />
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                    {selected.roles.map((r) => (
                                                        <RoleChip
                                                            key={r.id}
                                                            name={r.name}
                                                        />
                                                    ))}
                                                    {selected.branch && (
                                                        <BranchChip
                                                            name={
                                                                selected.branch
                                                                    .name
                                                            }
                                                        />
                                                    )}
                                                    {selected.region && (
                                                        <Badge
                                                            variant="outline"
                                                            className="gap-1 text-xs"
                                                        >
                                                            <MapPin className="size-3" />
                                                            {
                                                                selected.region
                                                                    .name
                                                            }
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action toolbar */}
                                        <div className="flex items-center gap-2">
                                            {canEdit && (
                                                <Link
                                                    href={
                                                        adminusers.edit({
                                                            user: selected.id,
                                                        }).url
                                                    }
                                                >
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5"
                                                    >
                                                        <Pencil className="size-3.5" />
                                                        Edit
                                                    </Button>
                                                </Link>
                                            )}
                                            {canDelete &&
                                                selected.is_active && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5 text-destructive hover:text-destructive"
                                                        onClick={() => {
                                                            router.delete(
                                                                adminusers.destroy(
                                                                    {
                                                                        user: selected.id,
                                                                    },
                                                                ).url,
                                                                {
                                                                    onSuccess: (
                                                                        page,
                                                                    ) => {
                                                                        const updatedUsers =
                                                                            (
                                                                                page.props as {
                                                                                    users?: {
                                                                                        data: User[];
                                                                                    };
                                                                                }
                                                                            )
                                                                                .users
                                                                                ?.data ??
                                                                            [];
                                                                        const nextUser =
                                                                            updatedUsers[0];
                                                                        setSelected(
                                                                            nextUser ??
                                                                                null,
                                                                        );
                                                                    },
                                                                },
                                                            );
                                                        }}
                                                    >
                                                        <UserX className="size-3.5" />
                                                        Deactivate
                                                    </Button>
                                                )}
                                            {canDelete &&
                                                !selected.is_active && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5 text-emerald-600 hover:text-emerald-600"
                                                        onClick={() => {
                                                            router.post(
                                                                adminusers.reactivate(
                                                                    {
                                                                        user: selected.id,
                                                                    },
                                                                ).url,
                                                                {},
                                                                {
                                                                    onSuccess:
                                                                        () => {
                                                                            // Keep current selection after reactivation
                                                                        },
                                                                },
                                                            );
                                                        }}
                                                    >
                                                        <Power className="size-3.5" />
                                                        Reactivate
                                                    </Button>
                                                )}
                                        </div>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex-1 px-6 py-4">
                                    <Tabs defaultValue="overview">
                                        <TabsList className="mb-4">
                                            <TabsTrigger value="overview">
                                                Overview
                                            </TabsTrigger>
                                            <TabsTrigger value="permissions">
                                                Permissions
                                            </TabsTrigger>
                                            <TabsTrigger value="activity">
                                                Activity
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent
                                            value="overview"
                                            className="space-y-4"
                                        >
                                            <div className="grid gap-3">
                                                <div className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3">
                                                    <Mail className="size-4 shrink-0 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Email
                                                        </div>
                                                        <div className="text-sm">
                                                            {selected.email}
                                                        </div>
                                                    </div>
                                                </div>
                                                {selected.branch && (
                                                    <div className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3">
                                                        <Building2 className="size-4 shrink-0 text-muted-foreground" />
                                                        <div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Branch
                                                            </div>
                                                            <div className="text-sm">
                                                                {
                                                                    selected
                                                                        .branch
                                                                        .name
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {selected.region && (
                                                    <div className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3">
                                                        <MapPin className="size-4 shrink-0 text-muted-foreground" />
                                                        <div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Region
                                                            </div>
                                                            <div className="text-sm">
                                                                {
                                                                    selected
                                                                        .region
                                                                        .name
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {selected.last_login_at && (
                                                    <div className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3">
                                                        <Clock className="size-4 shrink-0 text-muted-foreground" />
                                                        <div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Last sign-in
                                                            </div>
                                                            <div className="text-sm">
                                                                {
                                                                    selected.last_login_at
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="permissions">
                                            {(() => {
                                                const inherited =
                                                    selected.roles.flatMap(
                                                        (r) =>
                                                            r.permissions || [],
                                                    );
                                                const allPerms =
                                                    selected.permissions &&
                                                    selected.permissions
                                                        .length > 0
                                                        ? selected.permissions
                                                        : inherited;

                                                if (allPerms.length === 0) {
                                                    return (
                                                        <div className="flex flex-col items-center py-10">
                                                            <KeyRound className="mb-2 size-8 text-muted-foreground/40" />
                                                            <p className="text-sm text-muted-foreground">
                                                                No permissions
                                                                assigned to this
                                                                role yet.
                                                            </p>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="space-y-3">
                                                        <p className="text-xs text-muted-foreground">
                                                            Read-only
                                                            permissions
                                                            inherited from role
                                                            (
                                                            {
                                                                selected
                                                                    .roles[0]
                                                                    ?.name
                                                            }
                                                            ):
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {allPerms.map(
                                                                (p) => (
                                                                    <Badge
                                                                        key={
                                                                            p.id
                                                                        }
                                                                        variant="secondary"
                                                                        className="gap-1 text-xs"
                                                                    >
                                                                        <KeyRound className="size-3" />
                                                                        {p.name}
                                                                    </Badge>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </TabsContent>

                                        <TabsContent value="activity">
                                            <ActivityTimeline
                                                fetchUrl={
                                                    adminactivity.user({
                                                        user: selected.id,
                                                    }).url
                                                }
                                                subjectLabel={selected.name}
                                            />
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

AdminUsersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Users',
            href: adminusers.index().url,
        },
    ],
};
