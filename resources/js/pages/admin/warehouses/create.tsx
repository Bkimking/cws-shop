import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import adminwarehouses from '@/routes/admin/warehouses';
import { ArrowLeft, Warehouse } from 'lucide-react';

interface BranchOption {
    id: number;
    name: string;
    region: {
        id: number;
        name: string;
    };
}

interface Props {
    branches: BranchOption[];
}

const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function WarehouseCreate({ branches }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        branch_id: '',
        name: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(adminwarehouses.store().url);
    };

    return (
        <>
            <Head title="Add Warehouse" />
            <div className="mx-auto w-full max-w-2xl p-6">
                <Link href={adminwarehouses.index().url}>
                    <Button variant="ghost" size="sm" className="-ml-3 mb-4">
                        <ArrowLeft className="mr-1.5 size-4" />
                        Back to warehouses
                    </Button>
                </Link>

                <div className="mb-6 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
                        <Warehouse className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Add Warehouse</h1>
                        <p className="text-sm text-muted-foreground">
                            Create a new warehouse location under a branch.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">Warehouse details</CardTitle>
                            <CardDescription className="text-xs">
                                Branch and warehouse name.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
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
                                    <option value="">Select a branch</option>
                                    {branches.map((branch) => (
                                        <option key={branch.id} value={branch.id}>
                                            {branch.name} ({branch.region.name})
                                        </option>
                                    ))}
                                </select>
                                {errors.branch_id && (
                                    <p className="text-xs text-destructive">{errors.branch_id}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">
                                    Warehouse name
                                </label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Main Warehouse, Backstore"
                                    maxLength={100}
                                />
                                {errors.name && (
                                    <p className="text-xs text-destructive">{errors.name}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Link href={adminwarehouses.index().url}>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating…' : 'Create warehouse'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

WarehouseCreate.layout = {
    breadcrumbs: [
        { title: 'Warehouses', href: adminwarehouses.index().url },
        { title: 'Add', href: adminwarehouses.create().url },
    ],
};
