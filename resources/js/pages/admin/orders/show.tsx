import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import adminorders from '@/routes/admin/orders';
import {
    ArrowLeft,
    Receipt,
    Printer,
    Mail,
    Undo2,
    ShoppingBag,
    CreditCard,
    Clock,
    MapPin,
    User,
    PackageCheck,
    CheckCircle2,
} from 'lucide-react';
import type { Auth } from '@/types';

interface OrderItem {
    id: number;
    product_variant: {
        id: number;
        variant_name: string;
        product: {
            name: string;
        };
    };
    quantity: number;
    unit_price: string;
    discount: string;
}

interface Payment {
    id: number;
    gateway: string;
    amount: string;
    status: string;
    gateway_reference: string | null;
}

interface Order {
    id: number;
    branch_id: number | null;
    customer_id: number | null;
    source: string;
    status: string;
    subtotal: string;
    tax: string;
    total: string;
    currency_code: string;
    created_at: string;
    updated_at: string;
    pickup_status?: string;
    pickup_warehouse_id?: number | null;
    pickup_ready_at?: string | null;
    collected_at?: string | null;
    pickup_warehouse?: { id: number; name: string } | null;
    collected_by?: { id: number; name: string } | null;
    branch?: {
        id: number;
        name: string;
    };
    customer?: {
        id: number;
        name: string;
        email: string | null;
        phone: string | null;
    };
    items: OrderItem[];
    payments: Payment[];
}

interface Props {
    order: Order;
}

const gatewayLabels: Record<string, string> = {
    cash: 'Cash',
    mpesa: 'M-Pesa',
    airtel: 'Airtel',
    card: 'Card',
    paypal: 'PayPal',
};

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    completed: 'bg-green-100 text-green-800 hover:bg-green-200',
    cancelled: 'bg-red-100 text-red-800 hover:bg-red-200',
};

export default function OrderShow({ order }: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const canManagePickup = (auth.permissions ?? []).includes('manage pickups');
    const { post: refundPost, processing: refundProcessing } = useForm({});
    const pickupPost = (action: 'ready' | 'collected') => {
        router.post(
            `/admin/orders/${order.id}/pickup/${action}`,
            {},
            { preserveScroll: true },
        );
    };

    const handleRefund = () => {
        if (
            confirm(
                'Are you sure you want to refund this order? This action cannot be undone.',
            )
        ) {
            refundPost(adminorders.refund(order.id).url);
        }
    };

    return (
        <>
            <Head title={`Order #${order.id.toString().padStart(6, '0')}`} />
            <div className="mx-auto w-full max-w-6xl p-6">
                <Link href={adminorders.index().url}>
                    <Button variant="ghost" size="sm" className="mb-4 -ml-3">
                        <ArrowLeft className="mr-1.5 size-4" />
                        Back to orders
                    </Button>
                </Link>

                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
                            <Receipt className="size-5 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="font-mono text-xl font-semibold tracking-tight">
                                    Order #
                                    {order.id.toString().padStart(6, '0')}
                                </h1>
                                <Badge
                                    variant="outline"
                                    className={statusColors[order.status]}
                                >
                                    {order.status}
                                </Badge>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                {new Date(order.created_at).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {canManagePickup &&
                            order.pickup_warehouse_id &&
                            order.status === 'completed' &&
                            order.pickup_status === 'pending' && (
                                <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => pickupPost('ready')}
                                >
                                    <PackageCheck className="mr-1.5 size-3.5" />
                                    Mark ready for pickup
                                </Button>
                            )}
                        {canManagePickup && order.pickup_status === 'ready' && (
                            <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => pickupPost('collected')}
                            >
                                <CheckCircle2 className="mr-1.5 size-3.5" />
                                Mark collected
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.print()}
                        >
                            <Printer className="mr-1.5 size-3.5" />
                            Reprint
                        </Button>
                        <Button variant="outline" size="sm">
                            <Mail className="mr-1.5 size-3.5" />
                            Email / SMS
                        </Button>
                        {order.status !== 'cancelled' && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-amber-600 hover:bg-amber-50"
                                onClick={handleRefund}
                                disabled={refundProcessing}
                            >
                                <Undo2 className="mr-1.5 size-3.5" />
                                {refundProcessing ? 'Refunding...' : 'Refund'}
                            </Button>
                        )}
                    </div>
                </div>

                <Tabs defaultValue="details" className="space-y-6">
                    <TabsList className="bg-muted/60 p-1">
                        <TabsTrigger value="details" className="text-xs">
                            Details
                        </TabsTrigger>
                        <TabsTrigger value="items" className="text-xs">
                            Items
                        </TabsTrigger>
                        <TabsTrigger value="payments" className="text-xs">
                            Payments
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="border-b bg-muted/20">
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <MapPin className="size-4" />
                                        Order information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 p-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Order ID
                                        </span>
                                        <span className="font-mono">
                                            #
                                            {order.id
                                                .toString()
                                                .padStart(6, '0')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Source
                                        </span>
                                        <span className="font-medium capitalize">
                                            {order.source}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Status
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className={
                                                statusColors[order.status]
                                            }
                                        >
                                            {order.status}
                                        </Badge>
                                    </div>
                                    {order.pickup_warehouse_id && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                Pickup
                                            </span>
                                            <span className="font-medium capitalize">
                                                {order.pickup_status ??
                                                    'pending'}
                                                {order.pickup_warehouse
                                                    ? ` · ${order.pickup_warehouse.name}`
                                                    : ''}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Created
                                        </span>
                                        <span className="font-medium">
                                            {new Date(
                                                order.created_at,
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Updated
                                        </span>
                                        <span className="font-medium">
                                            {new Date(
                                                order.updated_at,
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="border-b bg-muted/20">
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <User className="size-4" />
                                        Customer & Branch
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 p-6">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">
                                            Branch
                                        </p>
                                        <p className="text-sm font-medium">
                                            {order.branch?.name || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">
                                            Customer
                                        </p>
                                        <p className="text-sm font-medium">
                                            {order.customer?.name || 'Walk-in'}
                                        </p>
                                    </div>
                                    {order.customer && (
                                        <>
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground">
                                                    Email
                                                </p>
                                                <p className="text-sm">
                                                    {order.customer.email ||
                                                        'N/A'}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground">
                                                    Phone
                                                </p>
                                                <p className="text-sm">
                                                    {order.customer.phone ||
                                                        'N/A'}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader className="border-b bg-muted/20">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <CreditCard className="size-4" />
                                    Order totals
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 p-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Subtotal
                                    </span>
                                    <span className="font-medium">
                                        {order.currency_code} {order.subtotal}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Tax (16%)
                                    </span>
                                    <span className="font-medium">
                                        {order.currency_code} {order.tax}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t pt-3 text-lg font-semibold">
                                    <span>Total</span>
                                    <span>
                                        {order.currency_code} {order.total}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="items" className="space-y-4">
                        <Card>
                            <CardHeader className="border-b bg-muted/20">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <ShoppingBag className="size-4" />
                                    Order items ({order.items.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {order.items.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-muted-foreground">
                                        No items in this order.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {order.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between rounded-lg border p-4"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">
                                                        {
                                                            item.product_variant
                                                                .product.name
                                                        }
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {
                                                            item.product_variant
                                                                .variant_name
                                                        }
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-6 text-sm">
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">
                                                            Qty
                                                        </p>
                                                        <p className="font-medium">
                                                            {item.quantity}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">
                                                            Price
                                                        </p>
                                                        <p className="font-medium">
                                                            {
                                                                order.currency_code
                                                            }{' '}
                                                            {item.unit_price}
                                                        </p>
                                                    </div>
                                                    {parseFloat(item.discount) >
                                                        0 && (
                                                        <div className="text-right">
                                                            <p className="text-xs text-muted-foreground">
                                                                Discount
                                                            </p>
                                                            <p className="font-medium text-green-600">
                                                                -
                                                                {
                                                                    order.currency_code
                                                                }{' '}
                                                                {item.discount}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">
                                                            Total
                                                        </p>
                                                        <p className="font-semibold">
                                                            {
                                                                order.currency_code
                                                            }{' '}
                                                            {(
                                                                parseFloat(
                                                                    item.unit_price,
                                                                ) *
                                                                    item.quantity -
                                                                parseFloat(
                                                                    item.discount,
                                                                )
                                                            ).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="payments" className="space-y-4">
                        <Card>
                            <CardHeader className="border-b bg-muted/20">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <CreditCard className="size-4" />
                                    Payments ({order.payments.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {order.payments.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-muted-foreground">
                                        No payments recorded for this order.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {order.payments.map((payment) => (
                                            <div
                                                key={payment.id}
                                                className="flex items-center justify-between rounded-lg border p-4"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted/40">
                                                        <CreditCard className="size-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {gatewayLabels[
                                                                payment.gateway
                                                            ] ||
                                                                payment.gateway}
                                                        </p>
                                                        {payment.gateway_reference && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Ref:{' '}
                                                                {
                                                                    payment.gateway_reference
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            payment.status ===
                                                            'completed'
                                                                ? 'bg-green-100 text-green-800'
                                                                : payment.status ===
                                                                    'refunded'
                                                                  ? 'bg-red-100 text-red-800'
                                                                  : 'bg-yellow-100 text-yellow-800'
                                                        }
                                                    >
                                                        {payment.status}
                                                    </Badge>
                                                    <p className="text-sm font-semibold">
                                                        {order.currency_code}{' '}
                                                        {payment.amount}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

OrderShow.layout = {
    breadcrumbs: [
        { title: 'Orders', href: adminorders.index().url },
        {
            title: `Order #${(props: Props) => props.order.id.toString().padStart(6, '0')}`,
            href: '',
        },
    ],
};
