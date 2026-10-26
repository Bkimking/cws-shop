import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import adminusers from '@/routes/admin/users';
import { ArrowLeft, UserPlus } from 'lucide-react';

interface RoleOption {
    id: number;
    name: string;
}

interface BranchOption {
    id: number;
    name: string;
    region_id: number;
}

interface RegionOption {
    id: number;
    name: string;
}

interface Props {
    roles: RoleOption[];
    branches: BranchOption[];
    regions: RegionOption[];
}

const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function AdminUserCreate({ roles, branches, regions }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        role: '',
        branch_id: '',
        region_id: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(adminusers.store().url);
    };

    const roleName = data.role.toLowerCase();
    const isSuperadminRole = roleName === 'superadmin';

    return (
        <>
            <Head title="Add User" />
            <div className="mx-auto w-full max-w-2xl p-6">
                <Link href={adminusers.index().url}>
                    <Button variant="ghost" size="sm" className="-ml-3 mb-4">
                        <ArrowLeft className="mr-1.5 size-4" />
                        Back to users
                    </Button>
                </Link>

                <div className="mb-6 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
                        <UserPlus className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Add User</h1>
                        <p className="text-sm text-muted-foreground">
                            Create a staff account and assign it a single role.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">Identity</CardTitle>
                            <CardDescription className="text-xs">
                                Login details for this staff member.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">
                                    Full name
                                </label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    maxLength={100}
                                />
                                {errors.name && (
                                    <p className="text-xs text-destructive">{errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                                {errors.email && (
                                    <p className="text-xs text-destructive">{errors.email}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium">
                                    Password
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Minimum 8 characters. The user can change it after first sign-in.
                                </p>
                                {errors.password && (
                                    <p className="text-xs text-destructive">{errors.password}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">Access</CardTitle>
                            <CardDescription className="text-xs">
                                One role per user. Scoping comes from the branch or region below.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="space-y-2">
                                <label htmlFor="role" className="text-sm font-medium">
                                    Role
                                </label>
                                <select
                                    id="role"
                                    className={selectClass}
                                    value={data.role}
                                    onChange={(e) => setData('role', e.target.value)}
                                >
                                    <option value="">Select a role</option>
                                    {roles.map((r) => (
                                        <option key={r.id} value={r.name}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.role && (
                                    <p className="text-xs text-destructive">{errors.role}</p>
                                )}
                            </div>

                            {!isSuperadminRole && (
                                <>
                                    <div className="space-y-2">
                                        <label htmlFor="branch_id" className="text-sm font-medium">
                                            Branch <span className="text-muted-foreground">(optional)</span>
                                        </label>
                                        <select
                                            id="branch_id"
                                            className={selectClass}
                                            value={data.branch_id}
                                            onChange={(e) => setData('branch_id', e.target.value)}
                                        >
                                            <option value="">No branch</option>
                                            {branches.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.branch_id && (
                                            <p className="text-xs text-destructive">{errors.branch_id}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="region_id" className="text-sm font-medium">
                                            Region <span className="text-muted-foreground">(optional)</span>
                                        </label>
                                        <select
                                            id="region_id"
                                            className={selectClass}
                                            value={data.region_id}
                                            onChange={(e) => setData('region_id', e.target.value)}
                                        >
                                            <option value="">No region</option>
                                            {regions.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.region_id && (
                                            <p className="text-xs text-destructive">{errors.region_id}</p>
                                        )}
                                        <p className="text-[11px] text-muted-foreground">
                                            Region Admins need a region. Branch staff only need a branch.
                                        </p>
                                    </div>
                                </>
                            )}

                            {isSuperadminRole && (
                                <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                                    Superadmins are not scoped to a region or branch. They see
                                    everything.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Link href={adminusers.index().url}>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating…' : 'Create user'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

AdminUserCreate.layout = {
    breadcrumbs: [
        { title: 'Users', href: adminusers.index().url },
        { title: 'Add', href: adminusers.create().url },
    ],
};