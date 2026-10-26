import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import adminorders from '@/routes/admin/orders';
import { ArrowLeft, Receipt, Plus, Trash2, DollarSign } from 'lucide-react';

interface Branch {
    id: number;
    name: string;
}

interface Customer {
    id: number;
    name: string;
}

interface Props {
    branches: Branch[];
    customers: Customer[];
}

interface OrderItem {
    product_variant_id: string;
    quantity: string;
    unit_price: string;
    discount: string;
}

interface Payment {
    gateway: string;
    amount: string;
}

const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function OrderCreate({ branches, customers }: Props) {
    const [items, setItems] = useState<OrderItem[]>([
        {
            product_variant_id: '',
            quantity: '1',
            unit_price: '0',
            discount: '0',
        },
    ]);
    const [payments, setPayments] = useState<Payment[]>([
        { gateway: 'cash', amount: '0' },
    ]);

    const { data, setData, post, processing, errors } = useForm({
        branch_id: '',
        customer_id: '',
        source: 'pos',
        status: 'pending',
        subtotal: '0',
        tax: '0',
        total: '0',
        currency_code: 'KES',
        items,
        payments,
    });

    const addItem = () => {
        const newItems = [
            ...items,
            {
                product_variant_id: '',
                quantity: '1',
                unit_price: '0',
                discount: '0',
            },
        ];
        setItems(newItems);
        setData('items', newItems);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
        setData('items', newItems);
    };

    const updateItem = (
        index: number,
        field: keyof OrderItem,
        value: string,
    ) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
        setData('items', newItems);
        calculateTotals(newItems, payments);
    };

    const addPayment = () => {
        const newPayments = [...payments, { gateway: 'cash', amount: '0' }];
        setPayments(newPayments);
        setData('payments', newPayments);
    };

    const removePayment = (index: number) => {
        const newPayments = payments.filter((_, i) => i !== index);
        setPayments(newPayments);
        setData('payments', newPayments);
    };

    const updatePayment = (
        index: number,
        field: keyof Payment,
        value: string,
    ) => {
        const newPayments = [...payments];
        newPayments[index][field] = value;
        setPayments(newPayments);
        setData('payments', newPayments);
    };

    const calculateTotals = (
        currentItems: OrderItem[],
        currentPayments: Payment[],
    ) => {
        const subtotal = currentItems.reduce((sum, item) => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unit_price) || 0;
            const discount = parseFloat(item.discount) || 0;
            return sum + qty * price - discount;
        }, 0);

        const tax = subtotal * 0.16;
        const total = subtotal + tax;

        setData('subtotal', subtotal.toFixed(2));
        setData('tax', tax.toFixed(2));
        setData('total', total.toFixed(2));
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(adminorders.store().url);
    };

    return (
        <>
            <Head title="Create Order" />
            <div className="mx-auto w-full max-w-5xl p-6">
                <Link href={adminorders.index().url}>
                    <Button variant="ghost" size="sm" className="mb-4 -ml-3">
                        <ArrowLeft className="mr-1.5 size-4" />
                        Back to orders
                    </Button>
                </Link>

                <div className="mb-6 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
                        <Receipt className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            Create Order
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Create a new order with items and payments.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">
                                Order details
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Branch, customer, and order status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="branch_id"
                                        className="text-sm font-medium"
                                    >
                                        Branch
                                    </label>
                                    <select
                                        id="branch_id"
                                        className={selectClass}
                                        value={data.branch_id}
                                        onChange={(e) =>
                                            setData('branch_id', e.target.value)
                                        }
                                    >
                                        <option value="">
                                            Select a branch
                                        </option>
                                        {branches.map((branch) => (
                                            <option
                                                key={branch.id}
                                                value={branch.id}
                                            >
                                                {branch.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.branch_id && (
                                        <p className="text-xs text-destructive">
                                            {errors.branch_id}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="customer_id"
                                        className="text-sm font-medium"
                                    >
                                        Customer
                                    </label>
                                    <select
                                        id="customer_id"
                                        className={selectClass}
                                        value={data.customer_id}
                                        onChange={(e) =>
                                            setData(
                                                'customer_id',
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            Select a customer (optional)
                                        </option>
                                        {customers.map((customer) => (
                                            <option
                                                key={customer.id}
                                                value={customer.id}
                                            >
                                                {customer.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.customer_id && (
                                        <p className="text-xs text-destructive">
                                            {errors.customer_id}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="source"
                                        className="text-sm font-medium"
                                    >
                                        Source
                                    </label>
                                    <select
                                        id="source"
                                        className={selectClass}
                                        value={data.source}
                                        onChange={(e) =>
                                            setData('source', e.target.value)
                                        }
                                    >
                                        <option value="pos">POS</option>
                                        <option value="storefront">
                                            Storefront
                                        </option>
                                    </select>
                                    {errors.source && (
                                        <p className="text-xs text-destructive">
                                            {errors.source}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="status"
                                        className="text-sm font-medium"
                                    >
                                        Status
                                    </label>
                                    <select
                                        id="status"
                                        className={selectClass}
                                        value={data.status}
                                        onChange={(e) =>
                                            setData('status', e.target.value)
                                        }
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="completed">
                                            Completed
                                        </option>
                                        <option value="cancelled">
                                            Cancelled
                                        </option>
                                    </select>
                                    {errors.status && (
                                        <p className="text-xs text-destructive">
                                            {errors.status}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm">
                                        Order items
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Add products to the order.
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addItem}
                                >
                                    <Plus className="mr-1.5 size-3.5" />
                                    Add item
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            {items.map((item, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-12 items-end gap-2"
                                >
                                    <div className="col-span-4 space-y-2">
                                        <label className="text-xs font-medium">
                                            Product variant ID
                                        </label>
                                        <Input
                                            type="number"
                                            value={item.product_variant_id}
                                            onChange={(e) =>
                                                updateItem(
                                                    index,
                                                    'product_variant_id',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="ID"
                                        />
                                        {errors[
                                            `items.${index}.product_variant_id`
                                        ] && (
                                            <p className="text-xs text-destructive">
                                                {
                                                    errors[
                                                        `items.${index}.product_variant_id`
                                                    ]
                                                }
                                            </p>
                                        )}
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-medium">
                                            Quantity
                                        </label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) =>
                                                updateItem(
                                                    index,
                                                    'quantity',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="1"
                                        />
                                        {errors[`items.${index}.quantity`] && (
                                            <p className="text-xs text-destructive">
                                                {
                                                    errors[
                                                        `items.${index}.quantity`
                                                    ]
                                                }
                                            </p>
                                        )}
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-medium">
                                            Unit price
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={(e) =>
                                                updateItem(
                                                    index,
                                                    'unit_price',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="0.00"
                                        />
                                        {errors[
                                            `items.${index}.unit_price`
                                        ] && (
                                            <p className="text-xs text-destructive">
                                                {
                                                    errors[
                                                        `items.${index}.unit_price`
                                                    ]
                                                }
                                            </p>
                                        )}
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-medium">
                                            Discount
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={item.discount}
                                            onChange={(e) =>
                                                updateItem(
                                                    index,
                                                    'discount',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="0.00"
                                        />
                                        {errors[`items.${index}.discount`] && (
                                            <p className="text-xs text-destructive">
                                                {
                                                    errors[
                                                        `items.${index}.discount`
                                                    ]
                                                }
                                            </p>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => removeItem(index)}
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {errors.items && (
                                <p className="text-xs text-destructive">
                                    {errors.items}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm">
                                        Payments
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Cash only for now. Digital gateways are
                                        pending.
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addPayment}
                                >
                                    <Plus className="mr-1.5 size-3.5" />
                                    Add payment
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6">
                            {payments.map((payment, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-3 items-end gap-2"
                                >
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">
                                            Gateway
                                        </label>
                                        <select
                                            className={selectClass}
                                            value={payment.gateway}
                                            onChange={(e) =>
                                                updatePayment(
                                                    index,
                                                    'gateway',
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option value="cash">Cash</option>
                                        </select>
                                        {errors[
                                            `payments.${index}.gateway`
                                        ] && (
                                            <p className="text-xs text-destructive">
                                                {
                                                    errors[
                                                        `payments.${index}.gateway`
                                                    ]
                                                }
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">
                                            Amount
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={payment.amount}
                                            onChange={(e) =>
                                                updatePayment(
                                                    index,
                                                    'amount',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="0.00"
                                        />
                                        {errors[`payments.${index}.amount`] && (
                                            <p className="text-xs text-destructive">
                                                {
                                                    errors[
                                                        `payments.${index}.amount`
                                                    ]
                                                }
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => removePayment(index)}
                                            disabled={payments.length === 1}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="text-sm">
                                Order totals
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 p-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Subtotal
                                </span>
                                <span className="font-medium">
                                    {data.currency_code} {data.subtotal}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Tax (16%)
                                </span>
                                <span className="font-medium">
                                    {data.currency_code} {data.tax}
                                </span>
                            </div>
                            <div className="flex justify-between border-t pt-3 text-lg font-semibold">
                                <span>Total</span>
                                <span>
                                    {data.currency_code} {data.total}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Link href={adminorders.index().url}>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating…' : 'Create order'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

OrderCreate.layout = {
    breadcrumbs: [
        { title: 'Orders', href: adminorders.index().url },
        { title: 'Create', href: adminorders.create().url },
    ],
};
