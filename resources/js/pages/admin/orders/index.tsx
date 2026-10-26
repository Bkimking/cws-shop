import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import adminorders from '@/routes/admin/orders';
import {
    Search,
    Receipt,
} from 'lucide-react';

interface Order {
    id: number;
    source: string;
    status: string;
    total: string;
    subtotal: string;
    tax: string;
    currency_code: string;
    created_at: string;
    branch?: { name: string };
    customer?: { name: string };
}

interface OrdersIndexProps {
    orders: {
        data: Order[];
        links: any[];
    };
}

export default function OrdersIndex({ orders }: OrdersIndexProps) {
    const orderList = orders.data || [];
    const [searchQuery, setSearchQuery] = useState('');

    const filteredOrders = orderList.filter((o) => {
        return o.id.toString().includes(searchQuery) ||
            (o.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()));
    });

    return (
        <>
            <Head title="Orders" />

            <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
                {/* Header */}
                <div className="flex h-16 shrink-0 items-center justify-between border-b px-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <Receipt className="size-5 text-primary" />
                            <h1 className="text-xl font-semibold tracking-tight">Orders</h1>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            View order history, reprint receipts, and process refunds.
                        </p>
                    </div>
                    <Link href={adminorders.create().url}>
                        <Button size="sm">
                            <Receipt className="mr-1.5 size-3.5" />
                            New Order
                        </Button>
                    </Link>
                </div>

                {/* Master-Detail Layout */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                    {/* Left Pane: Order List */}
                    <div className="flex w-96 shrink-0 flex-col border-r bg-muted/20">
                        {/* Search */}
                        <div className="border-b p-3 space-y-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by order # or customer..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9 pl-8 text-sm"
                                />
                            </div>
                        </div>

                        {/* List Items */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredOrders.map((order) => (
                                <Link
                                    key={order.id}
                                    href={adminorders.show(order.id).url}
                                    className="group relative flex cursor-pointer flex-col gap-1.5 rounded-lg border border-transparent p-3 text-left transition-all outline-none hover:border-border hover:bg-muted/40"
                                >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-semibold tracking-tight">
                                                    #{order.id.toString().padStart(6, '0')}
                                                </span>
                                            </div>
                                            <span className="text-xs font-medium text-foreground">
                                                {order.currency_code} {order.total}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>
                                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <Badge variant="outline" className="text-[10px]">
                                                {order.status}
                                            </Badge>
                                        </div>
                                </Link>
                            ))}
                            {filteredOrders.length === 0 && (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    No orders found matching filter.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Instructions */}
                    <div className="flex flex-1 flex-col overflow-hidden bg-background">
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                                <Receipt className="size-12 mx-auto mb-4 opacity-50" />
                                <p className="text-sm">Select an order from the list to view details</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

OrdersIndex.layout = {
    breadcrumbs: [
        { title: 'Orders', href: adminorders.index().url },
    ],
};
