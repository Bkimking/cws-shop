import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import adminusers from '@/routes/admin/users';
import { ArrowLeft, UserCog } from 'lucide-react';

interface Role {
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

interface User {
    id: number;
    name: string;
    email: string;
    branch_id: number | null;
    region_id: number | null;
    roles: Role[];
}

interface Props {
    user: User;
    roles: Role[];
    branches: BranchOption[];
    regions: RegionOption[];
}

const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function AdminUserEdit({ user, roles, branches, regions }: Props) {
    const currentRole = user.roles[0]?.name ?? '';

    const { data, setData, put, processing, errors } = useForm({
        name: user.name,
        email: user.email,
        role: currentRole,
        branch_id: user.branch_id ? String(user.branch_id) : '',
        region_id: user.region_id ? String(user.region_id) : '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(adminusers.update({ user: user.id }).url);
    };

    const isSuperadminRole = data.role.toLowerCase() === 'superadmin';

    return (
        <>
            <Head title={`Edit ${user.name}`} />
            <div className="mx-auto w-full max-w-2xl p-6">
                <Link href={adminusers.index().url}>
                    <Button variant="ghost" size="sm" className="-ml-3 mb-4">
                        <ArrowLeft className="mr-1.5 size-4" />
                        Back to users
                    </Button>
                </Link>

                <div className="mb-6 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
                        <UserCog className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Edit User</h1>
                        <p className="text-sm text-muted-foreground">
                            Update details and access for <strong>{user.name}</strong>.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">Identity</CardTitle>
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

                            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                                Passwords are changed from the user&apos;s profile or via
                                &ldquo;Reset password&rdquo; on the users list.
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">Access</CardTitle>
                            <CardDescription className="text-xs">
                                Changing a role replaces the previous one.
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
                                            Branch
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
                                            Region
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
                                    </div>
                                </>
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
                            {processing ? 'Saving…' : 'Save changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

AdminUserEdit.layout = {
    breadcrumbs: [
        { title: 'Users', href: adminusers.index().url },
        { title: 'Edit', href: '#' },
    ],
};