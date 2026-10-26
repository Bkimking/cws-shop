import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import adminpaymentgateways from '@/routes/admin/payment-gateways';
import { ArrowLeft, Wallet, Globe } from 'lucide-react';

interface Region {
    id: number;
    name: string;
}

interface Props {
    regions: Region[];
}

const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function PaymentGatewayCreate({ regions }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        region_id: '',
        gateway: '',
        is_enabled: false,
        encrypted_credentials: {},
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(adminpaymentgateways.store().url);
    };

    return (
        <>
            <Head title="Add Payment Gateway" />
            <div className="mx-auto w-full max-w-2xl p-6">
                <Link href={adminpaymentgateways.index().url}>
                    <Button variant="ghost" size="sm" className="-ml-3 mb-4">
                        <ArrowLeft className="mr-1.5 size-4" />
                        Back to payment gateways
                    </Button>
                </Link>

                <div className="mb-6 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
                        <Wallet className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Add Payment Gateway</h1>
                        <p className="text-sm text-muted-foreground">
                            Configure a new payment gateway for a region.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Wallet className="size-4" />
                                Gateway Configuration
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Select region, gateway type, and enable/disable status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="region_id">Region</Label>
                                <select
                                    id="region_id"
                                    className={selectClass}
                                    value={data.region_id}
                                    onChange={(e) => setData('region_id', e.target.value)}
                                >
                                    <option value="">Select a region</option>
                                    {regions.map((region) => (
                                        <option key={region.id} value={region.id}>
                                            {region.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.region_id && (
                                    <p className="text-xs text-destructive">{errors.region_id}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gateway">Gateway Type</Label>
                                <select
                                    id="gateway"
                                    className={selectClass}
                                    value={data.gateway}
                                    onChange={(e) => setData('gateway', e.target.value)}
                                >
                                    <option value="">Select a gateway</option>
                                    <option value="cash">Cash</option>
                                    <option value="mpesa">M-Pesa</option>
                                    <option value="airtel">Airtel Money</option>
                                    <option value="card">Card Payment</option>
                                    <option value="paypal">PayPal</option>
                                </select>
                                {errors.gateway && (
                                    <p className="text-xs text-destructive">{errors.gateway}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-between space-x-2 pt-2">
                                <div className="space-y-0.5">
                                    <Label htmlFor="is_enabled">Enable Gateway</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Allow customers to use this payment method
                                    </p>
                                </div>
                                <Switch
                                    id="is_enabled"
                                    checked={data.is_enabled}
                                    onCheckedChange={(checked) => setData('is_enabled', checked)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-end gap-3">
                        <Link href={adminpaymentgateways.index().url}>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Gateway'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
