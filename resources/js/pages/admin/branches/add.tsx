import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import adminbranches from '@/routes/admin/branches';
import { ArrowLeft, Store } from 'lucide-react';

interface RegionOption {
    id: number;
    name: string;
}

interface Props {
    regions: RegionOption[];
}

const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function AdminBranchCreate({ regions }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        region_id: '',
        name: '',
        address: '',
        phone: '',
        is_active: true,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(adminbranches.store().url);
    };

    return (
        <>
            <Head title="Add Branch" />
            <div className="mx-auto w-full max-w-2xl p-6">
                <Link href={adminbranches.index().url}>
                    <Button variant="ghost" size="sm" className="-ml-3 mb-4">
                        <ArrowLeft className="mr-1.5 size-4" />
                        Back to branches
                    </Button>
                </Link>

                <div className="mb-6 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
                        <Store className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Add Branch</h1>
                        <p className="text-sm text-muted-foreground">
                            Register a new store location under a region.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">Branch details</CardTitle>
                            <CardDescription className="text-xs">
                                Region, name, physical location, and contact.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
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
                                    <option value="">Select a region</option>
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

                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">
                                    Branch name
                                </label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Ngong"
                                    maxLength={100}
                                />
                                {errors.name && (
                                    <p className="text-xs text-destructive">{errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="address" className="text-sm font-medium">
                                    Address
                                </label>
                                <Input
                                    id="address"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    placeholder="Street, town, county"
                                    maxLength={255}
                                />
                                {errors.address && (
                                    <p className="text-xs text-destructive">{errors.address}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-medium">
                                    Phone
                                </label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder="+254 7XX XXX XXX"
                                    maxLength={20}
                                />
                                {errors.phone && (
                                    <p className="text-xs text-destructive">{errors.phone}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <Checkbox
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) => setData('is_active', checked === true)}
                                />
                                <label htmlFor="is_active" className="cursor-pointer text-sm">
                                    Active — available for sales and till sessions
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Link href={adminbranches.index().url}>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating…' : 'Create branch'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

AdminBranchCreate.layout = {
    breadcrumbs: [
        { title: 'Branches', href: adminbranches.index().url },
        { title: 'Add', href: adminbranches.create().url },
    ],
};