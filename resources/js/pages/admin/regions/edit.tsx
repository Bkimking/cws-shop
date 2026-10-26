import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import adminregions from '@/routes/admin/regions';
import { ArrowLeft, Globe } from 'lucide-react';

interface Region {
    id: number;
    name: string;
    country_code: string;
    currency_code: string;
    tax_rate: string | number;
    timezone: string;
    is_active: boolean;
}

interface Props {
    region: Region;
}

export default function AdminRegionEdit({ region }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: region.name,
        country_code: region.country_code,
        currency_code: region.currency_code,
        tax_rate: String(region.tax_rate),
        timezone: region.timezone,
        is_active: region.is_active,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(adminregions.update(region.id).url);
    };

    return (
        <>
            <Head title={`Edit ${region.name}`} />
            <div className="mx-auto w-full max-w-2xl p-6">
                <Link href={adminregions.index().url}>
                    <Button variant="ghost" size="sm" className="-ml-3 mb-4">
                        <ArrowLeft className="mr-1.5 size-4" />
                        Back to regions
                    </Button>
                </Link>

                <div className="mb-6 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
                        <Globe className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Edit Region</h1>
                        <p className="text-sm text-muted-foreground">
                            Update <strong>{region.name}</strong>. Currency and tax changes apply to
                            new orders immediately.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">Region basics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">
                                    Name
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
                                <label htmlFor="country_code" className="text-sm font-medium">
                                    Country code
                                </label>
                                <Input
                                    id="country_code"
                                    value={data.country_code}
                                    onChange={(e) =>
                                        setData('country_code', e.target.value.toUpperCase())
                                    }
                                    maxLength={2}
                                    className="font-mono"
                                />
                                {errors.country_code && (
                                    <p className="text-xs text-destructive">{errors.country_code}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">Money & tax</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="currency_code" className="text-sm font-medium">
                                    Currency code
                                </label>
                                <Input
                                    id="currency_code"
                                    value={data.currency_code}
                                    onChange={(e) =>
                                        setData('currency_code', e.target.value.toUpperCase())
                                    }
                                    maxLength={3}
                                    className="font-mono"
                                />
                                {errors.currency_code && (
                                    <p className="text-xs text-destructive">{errors.currency_code}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="tax_rate" className="text-sm font-medium">
                                    Tax rate (%)
                                </label>
                                <Input
                                    id="tax_rate"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    max={100}
                                    value={data.tax_rate}
                                    onChange={(e) => setData('tax_rate', e.target.value)}
                                    className="font-mono"
                                />
                                {errors.tax_rate && (
                                    <p className="text-xs text-destructive">{errors.tax_rate}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">Locale</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="space-y-2">
                                <label htmlFor="timezone" className="text-sm font-medium">
                                    Timezone
                                </label>
                                <Input
                                    id="timezone"
                                    value={data.timezone}
                                    onChange={(e) => setData('timezone', e.target.value)}
                                    maxLength={64}
                                    className="font-mono"
                                />
                                {errors.timezone && (
                                    <p className="text-xs text-destructive">{errors.timezone}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <Checkbox
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) => setData('is_active', checked === true)}
                                />
                                <label htmlFor="is_active" className="cursor-pointer text-sm">
                                    Active — permit new sales in this region
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Link href={adminregions.index().url}>
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

AdminRegionEdit.layout = {
    breadcrumbs: [
        { title: 'Regions', href: adminregions.index().url },
        { title: 'Edit', href: '#' },
    ],
};