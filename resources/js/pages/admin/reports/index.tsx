import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import adminreports from '@/routes/admin/reports';
import {
    BarChart3,
    Calendar,
    Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReportsIndex() {
    return (
        <>
            <Head title="Reports" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Reports</h1>
                        <p className="text-sm text-muted-foreground">
                            Analyze sales, payments, stock, and till activity.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm">
                            <Calendar className="mr-2 size-4" />
                            Last 7 Days
                        </Button>
                        <Button variant="outline" size="sm">
                            <Download className="mr-2 size-4" />
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* Tabs Layout */}
                <Tabs defaultValue="sales" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="sales">Sales</TabsTrigger>
                        <TabsTrigger value="payments">Payments</TabsTrigger>
                        <TabsTrigger value="stock">Stock</TabsTrigger>
                        <TabsTrigger value="cashiers">Cashiers</TabsTrigger>
                        <TabsTrigger value="tills">Tills</TabsTrigger>
                    </TabsList>

                    <TabsContent value="sales" className="space-y-4">
                        <Card className="border-border/60">
                            <CardContent className="p-8 text-center text-muted-foreground">
                                <BarChart3 className="mx-auto mb-2 size-8 opacity-50" />
                                <p className="text-sm">No sales data available for this period.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="payments">
                        <Card className="border-border/60">
                            <CardContent className="p-8 text-center text-muted-foreground">
                                <p className="text-sm">No payment data available for this period.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="stock">
                        <Card className="border-border/60">
                            <CardContent className="p-8 text-center text-muted-foreground">
                                <p className="text-sm">No stock data available for this period.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="cashiers">
                        <Card className="border-border/60">
                            <CardContent className="p-8 text-center text-muted-foreground">
                                <p className="text-sm">No cashier data available for this period.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="tills">
                        <Card className="border-border/60">
                            <CardContent className="p-8 text-center text-muted-foreground">
                                <p className="text-sm">No till data available for this period.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

ReportsIndex.layout = {
    breadcrumbs: [
        { title: 'Reports', href: adminreports.index().url },
    ],
};
