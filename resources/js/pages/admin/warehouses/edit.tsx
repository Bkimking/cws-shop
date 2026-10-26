import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import adminwarehouses from '@/routes/admin/warehouses';
import { ArrowLeft, Warehouse } from 'lucide-react';

interface WarehouseData {
    id: number;
    branch_id: number;
    name: string;
    branch: {
        id: number;
        name: string;
        region: {
            id: number;
            name: string;
        };
    };
}

interface BranchOption {
    id: number;
    name: string;
    region: {
        id: number;
        name: string;
    };
}

interface Props {
    warehouse: WarehouseData;
    branches: BranchOption[];
}

const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function WarehouseEdit({ warehouse, branches }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        branch_id: String(warehouse.branch_id),
        name: warehouse.name,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(adminwarehouses.update(warehouse.id).url);
    };

    return (
        <>
            <Head title={`Edit ${warehouse.name}`} />
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
                        <h1 className="text-xl font-semibold tracking-tight">Edit Warehouse</h1>
                        <p className="text-sm text-muted-foreground">
                            Update the details for <strong>{warehouse.name}</strong>.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">Warehouse details</CardTitle>
                            <CardDescription className="text-xs">
                                Changes take effect for all stock operations at this warehouse.
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
                            {processing ? 'Saving…' : 'Save changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

WarehouseEdit.layout = {
    breadcrumbs: [
        { title: 'Warehouses', href: adminwarehouses.index().url },
        { title: 'Edit', href: '#' },
    ],
};
