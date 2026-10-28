import { CartPanel } from '@/components/pos/cart-panel';
import { CloseTillDialog } from '@/components/pos/close-till-dialog';
import { formatMoney } from '@/components/pos/money';
import { OpenTillScreen } from '@/components/pos/open-till-screen';
import { OrdersTodayDialog } from '@/components/pos/orders-today-dialog';
import {
    PaymentSheet,
    type PosPaymentConfirmation,
} from '@/components/pos/payment-sheet';
import { ProductGrid } from '@/components/pos/product-grid';
import { SaleSuccess } from '@/components/pos/sale-success';
import { TerminalBar } from '@/components/pos/terminal-bar';
import { TillReportDialog } from '@/components/pos/till-report-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useTerminalTheme } from '@/layouts/app/app-terminal-layout';
import { cn } from '@/lib/utils';
import pos from '@/routes/pos';
import type {
    CartLine,
    PosPageProps,
    PosProduct,
    PosReceipt,
    PosSharedProps,
    PosVariant,
} from '@/types/pos';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Loader2, ShoppingCart } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';

type PageProps = PosPageProps & PosSharedProps;

function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function csrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
}

export default function PosIndex() {
    const page = usePage<PageProps>();
    const {
        context,
        cashier,
        till,
        products,
        categories,
        ordersToday,
        can,
        flash,
    } = page.props;

    const { contrast, setContrast } = useTerminalTheme();
    const currency = context.region.currency_code;

    const [tillState, setTillState] = useState(till);
    const [productState, setProductState] = useState(products);
    const [orderState, setOrderState] = useState(ordersToday);
    const [cart, setCart] = useState<CartLine[]>([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<number | 'all'>('all');
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [mobileCartOpen, setMobileCartOpen] = useState(false);
    const [ordersOpen, setOrdersOpen] = useState(false);
    const [closeTillOpen, setCloseTillOpen] = useState(false);
    const [xReportOpen, setXReportOpen] = useState(false);
    const [zReportOpen, setZReportOpen] = useState(false);
    const [variantProduct, setVariantProduct] = useState<PosProduct | null>(
        null,
    );
    const [receipt, setReceipt] = useState<PosReceipt | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mpesaPending, setMpesaPending] = useState<{
        order: PosReceipt;
        stock: Record<string, number>;
        phone: string;
    } | null>(null);
    const [online, setOnline] = useState(() =>
        typeof navigator === 'undefined' ? true : navigator.onLine,
    );

    const scanRef = useRef<HTMLInputElement>(null);
    const submittingRef = useRef(false);

    const openTillForm = useForm({ opening_cash: '0' });
    const closeTillForm = useForm({
        closing_cash: '',
        variance_reason: '',
    });

    useEffect(() => setTillState(till), [till]);
    useEffect(() => setProductState(products), [products]);
    useEffect(() => setOrderState(ordersToday), [ordersToday]);

    useEffect(() => {
        if (flash.z_report) {
            setZReportOpen(true);
        }
    }, [flash.z_report]);

    useEffect(() => {
        if (!till) {
            setCart([]);
            setPaymentOpen(false);
            setMobileCartOpen(false);
        }
    }, [till]);

    useEffect(() => {
        if (!receipt) {
            scanRef.current?.focus();
        }
    }, [receipt, tillState, variantProduct]);

    useEffect(() => {
        const goOnline = () => setOnline(true);
        const goOffline = () => setOnline(false);

        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);

        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    const filteredProducts = useMemo(() => {
        const term = search.trim().toLowerCase();

        return productState.filter((product) => {
            if (category !== 'all' && product.category_id !== category) {
                return false;
            }

            if (!term) {
                return true;
            }

            return (
                product.name.toLowerCase().includes(term) ||
                product.sku.toLowerCase().includes(term) ||
                (product.barcode ?? '').toLowerCase().includes(term) ||
                product.variants.some(
                    (variant) =>
                        variant.name.toLowerCase().includes(term) ||
                        variant.sku.toLowerCase().includes(term) ||
                        (variant.barcode ?? '').toLowerCase().includes(term),
                )
            );
        });
    }, [productState, search, category]);

    const totals = useMemo(() => {
        const gross = roundMoney(
            cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
        );
        const rate = context.region.tax_rate;
        const tax = rate > 0 ? roundMoney((gross * rate) / (100 + rate)) : 0;

        return {
            gross,
            tax,
            subtotal: roundMoney(gross - tax),
            total: gross,
        };
    }, [cart, context.region.tax_rate]);

    const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

    const addVariant = useCallback(
        (product: PosProduct, variant: PosVariant) => {
            if (!tillState) {
                toast.error('Open the till before selling.');
                return;
            }

            if (variant.stock <= 0) {
                toast.error(`${product.name} is out of stock.`);
                return;
            }

            const existing = cart.find(
                (line) => line.variant_id === variant.id,
            );

            if (existing) {
                if (existing.quantity + 1 > variant.stock) {
                    toast.error(
                        `Only ${variant.stock} left of ${product.name}.`,
                    );
                    return;
                }

                setCart((current) =>
                    current.map((line) =>
                        line.variant_id === variant.id
                            ? { ...line, quantity: line.quantity + 1 }
                            : line,
                    ),
                );

                return;
            }

            setCart((current) => [
                ...current,
                {
                    variant_id: variant.id,
                    product_id: product.id,
                    name: product.name,
                    variant: variant.name,
                    sku: variant.sku,
                    barcode: variant.barcode,
                    price: variant.price,
                    quantity: 1,
                    stock: variant.stock,
                },
            ]);
        },
        [cart, tillState],
    );

    const addProduct = useCallback(
        (product: PosProduct) => {
            if (!tillState) {
                toast.error('Open the till before selling.');
                return;
            }

            if (product.stock <= 0) {
                toast.error(`${product.name} is out of stock.`);
                return;
            }

            if (product.variants.length === 1) {
                addVariant(product, product.variants[0]);

                return;
            }

            setVariantProduct(product);
        },
        [addVariant, tillState],
    );

    const searchSubmit = () => {
        const term = search.trim().toLowerCase();

        if (!term) {
            return;
        }

        const exactVariant = productState
            .flatMap((product) =>
                product.variants.map((variant) => ({ product, variant })),
            )
            .find(
                ({ variant }) =>
                    variant.sku.toLowerCase() === term ||
                    (variant.barcode ?? '').toLowerCase() === term,
            );

        if (exactVariant) {
            addVariant(exactVariant.product, exactVariant.variant);
            setSearch('');

            return;
        }

        const exactProduct = productState.find(
            (product) =>
                product.sku.toLowerCase() === term ||
                (product.barcode ?? '').toLowerCase() === term,
        );

        if (exactProduct) {
            addProduct(exactProduct);
            setSearch('');

            return;
        }

        if (filteredProducts.length === 1) {
            addProduct(filteredProducts[0]);
            setSearch('');

            return;
        }

        toast.error(`No product matches “${search}”.`);
    };

    const increment = (variantId: number) => {
        const line = cart.find((item) => item.variant_id === variantId);

        if (!line) {
            return;
        }

        if (line.quantity + 1 > line.stock) {
            toast.error(`Only ${line.stock} left of ${line.name}.`);

            return;
        }

        setCart((current) =>
            current.map((item) =>
                item.variant_id === variantId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item,
            ),
        );
    };

    const decrement = (variantId: number) => {
        setCart((current) =>
            current.map((item) =>
                item.variant_id === variantId && item.quantity > 1
                    ? { ...item, quantity: item.quantity - 1 }
                    : item,
            ),
        );
    };

    const removeLine = (variantId: number) => {
        setCart((current) =>
            current.filter((item) => item.variant_id !== variantId),
        );
    };

    const openPayment = () => {
        if (!tillState) {
            toast.error('Open the till before selling.');

            return;
        }

        if (cart.length === 0) {
            return;
        }

        setError(null);
        setMobileCartOpen(false);
        setPaymentOpen(true);
    };

    const finishSale = (order: PosReceipt, stock: Record<string, number>) => {
        setReceipt(order);
        setCart([]);
        setPaymentOpen(false);
        setMobileCartOpen(false);
        setMpesaPending(null);

        setProductState((current) =>
            current.map((product) => {
                const variants = product.variants.map((variant) => ({
                    ...variant,
                    stock: stock[String(variant.id)] ?? variant.stock,
                }));

                return {
                    ...product,
                    variants,
                    stock: variants.reduce(
                        (sum, variant) => sum + variant.stock,
                        0,
                    ),
                };
            }),
        );

        setOrderState((current) => [
            {
                id: order.id,
                number: order.number,
                total: order.total,
                items_count: order.items.length,
                status: 'completed',
                time: order.created_at_label?.split('·')[1]?.trim() ?? '',
                created_at: order.created_at,
            },
            ...current,
        ]);

        setTillState((current) => {
            if (!current) return current;

            const isCash = order.payment.gateway === 'cash';

            return {
                ...current,
                sales_count: current.sales_count + 1,
                gross: roundMoney(current.gross + order.total),
                cash: isCash
                    ? roundMoney(current.cash + order.total)
                    : current.cash,
                expected_cash: isCash
                    ? roundMoney(current.expected_cash + order.total)
                    : current.expected_cash,
            };
        });
    };

    const completeSale = async ({
        method,
        tendered,
        phone,
    }: PosPaymentConfirmation) => {
        if (cart.length === 0 || submittingRef.current) {
            return;
        }

        submittingRef.current = true;
        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch(pos.sales.store().url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({
                    items: cart.map((line) => ({
                        product_variant_id: line.variant_id,
                        quantity: line.quantity,
                    })),
                    payment_method: method,
                    phone: phone ?? null,
                    tendered: method === 'cash' ? tendered : undefined,
                }),
            });

            const body = (await response.json().catch(() => ({}))) as {
                message?: string;
                errors?: Record<string, string[]>;
                order?: PosReceipt;
                stock?: Record<string, number>;
                payment_status?: string;
                payment_method?: string;
            };

            if (!response.ok || !body.order) {
                const message =
                    response.status === 419
                        ? 'Your session expired. Refresh the page and sign in again.'
                        : (body.message ??
                          Object.values(body.errors ?? {}).flat()[0] ??
                          'Could not complete the sale.');

                setError(message);
                toast.error(message);

                return;
            }

            if (body.payment_status === 'pending') {
                const stock = body.stock ?? {};

                setProductState((current) =>
                    current.map((product) => {
                        const variants = product.variants.map((variant) => ({
                            ...variant,
                            stock: stock[String(variant.id)] ?? variant.stock,
                        }));

                        return {
                            ...product,
                            variants,
                            stock: variants.reduce(
                                (sum, variant) => sum + variant.stock,
                                0,
                            ),
                        };
                    }),
                );
                setCart([]);
                setPaymentOpen(false);
                setMobileCartOpen(false);
                setMpesaPending({
                    order: body.order,
                    stock,
                    phone: phone ?? '',
                });

                return;
            }

            finishSale(body.order, body.stock ?? {});
        } catch (caught) {
            const message =
                caught instanceof Error
                    ? caught.message
                    : 'Could not complete the sale.';

            setError(message);
            toast.error(message);
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (!mpesaPending) return;

        const timer = window.setInterval(async () => {
            const response = await fetch(
                `/pos/sales/${mpesaPending.order.id}/status`,
                { headers: { Accept: 'application/json' } },
            );

            if (!response.ok) return;

            const data = (await response.json().catch(() => ({}))) as {
                status?: string;
                payment_status?: string;
                order?: PosReceipt;
            };

            if (data.payment_status === 'completed' && data.order) {
                finishSale(data.order, mpesaPending.stock);
                setMpesaPending(null);
            } else if (
                data.status === 'cancelled' ||
                data.payment_status === 'failed'
            ) {
                setMpesaPending(null);
                setError(
                    'M-Pesa payment did not complete. The stock was released.',
                );
                toast.error('M-Pesa payment did not complete.');
                router.reload({ only: ['products', 'till'] });
            }
        }, 3000);

        return () => window.clearInterval(timer);
    }, [mpesaPending]);

    const newSale = useCallback(() => {
        setReceipt(null);
        setError(null);
        setPaymentOpen(false);
        setMobileCartOpen(false);
        requestAnimationFrame(() => scanRef.current?.focus());
    }, []);

    const submitOpenTill = (event: FormEvent) => {
        event.preventDefault();

        openTillForm.post(pos.till.open().url, {
            preserveScroll: true,
            onSuccess: () => openTillForm.reset('opening_cash'),
        });
    };

    const submitCloseTill = (event: FormEvent) => {
        event.preventDefault();

        closeTillForm.post(pos.till.close().url, {
            preserveScroll: true,
            onSuccess: () => {
                setCloseTillOpen(false);
                closeTillForm.reset();
            },
        });
    };

    const openCloseTill = () => {
        if (!tillState) {
            return;
        }

        closeTillForm.setData(
            'closing_cash',
            tillState.expected_cash.toFixed(2),
        );
        closeTillForm.setData('variance_reason', '');
        setCloseTillOpen(true);
    };

    const cartPanel = (
        <CartPanel
            lines={cart}
            totals={totals}
            taxRate={context.region.tax_rate}
            currency={currency}
            tillOpen={Boolean(tillState)}
            canDiscount={can.apply_discounts}
            onIncrement={increment}
            onDecrement={decrement}
            onRemove={removeLine}
            onClear={() => setCart([])}
            onCharge={openPayment}
        />
    );

    return (
        <>
            <Head title={`Sell · ${context.branch.name}`} />

            {!tillState ? (
                <OpenTillScreen
                    branchName={context.branch.name}
                    cashierName={cashier.name}
                    openingCash={openTillForm.data.opening_cash}
                    onOpeningCashChange={(value) =>
                        openTillForm.setData('opening_cash', value)
                    }
                    onSubmit={submitOpenTill}
                    processing={openTillForm.processing}
                    error={openTillForm.errors.opening_cash}
                    canAccessAdmin={can.access_admin}
                />
            ) : (
                <div className="flex h-dvh flex-col overflow-hidden">
                    <TerminalBar
                        branchName={context.branch.name}
                        cashierName={cashier.name}
                        till={tillState}
                        online={online}
                        contrast={contrast}
                        onContrast={setContrast}
                        onOpenOrders={() => setOrdersOpen(true)}
                        onOpenXReport={() => setXReportOpen(true)}
                        onOpenCloseTill={openCloseTill}
                        canAccessAdmin={can.access_admin}
                        orderCount={orderState.length}
                    />

                    <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_390px]">
                        <section className="flex min-h-0 flex-col overflow-hidden p-3 pb-24 sm:p-4 lg:pb-4">
                            <ProductGrid
                                products={filteredProducts}
                                categories={categories}
                                search={search}
                                onSearchChange={setSearch}
                                onSearchSubmit={searchSubmit}
                                categoryId={category}
                                onCategoryChange={setCategory}
                                onAdd={addProduct}
                                disabled={!tillState}
                                currency={currency}
                                inputRef={scanRef}
                            />
                        </section>

                        <aside className="hidden min-h-0 flex-col border-l border-border/70 bg-card/30 p-4 lg:flex">
                            {cartPanel}
                        </aside>
                    </main>

                    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border/70 bg-card/95 p-3 backdrop-blur lg:hidden">
                        <button
                            type="button"
                            onClick={() => setMobileCartOpen(true)}
                            className="flex h-12 flex-1 items-center justify-between rounded-xl border border-border/70 bg-background px-3 text-left"
                        >
                            <span className="flex items-center gap-2 text-sm">
                                <ShoppingCart className="size-4" />
                                {itemCount} item{itemCount === 1 ? '' : 's'}
                            </span>
                            <span className="font-mono text-sm font-semibold">
                                {currency} {formatMoney(totals.total)}
                            </span>
                        </button>
                        <Button
                            type="button"
                            disabled={cart.length === 0}
                            onClick={openPayment}
                            className="h-12 rounded-xl bg-pay px-4 text-pay-foreground hover:opacity-90 disabled:opacity-40"
                        >
                            Charge
                        </Button>
                    </div>

                    <Sheet
                        open={mobileCartOpen}
                        onOpenChange={setMobileCartOpen}
                    >
                        <SheetContent
                            side="bottom"
                            className={cn(
                                'terminal flex h-[85dvh] flex-col gap-0 p-4',
                                contrast !== 'daylight' && 'dark',
                            )}
                            data-contrast={
                                contrast === 'normal' ? undefined : contrast
                            }
                        >
                            <SheetHeader className="sr-only">
                                <SheetTitle>Current sale</SheetTitle>
                            </SheetHeader>
                            <div className="min-h-0 flex-1">{cartPanel}</div>
                        </SheetContent>
                    </Sheet>
                </div>
            )}

            <PaymentSheet
                open={paymentOpen}
                onOpenChange={setPaymentOpen}
                total={totals.total}
                currency={currency}
                processing={submitting}
                error={error}
                mpesaEnabled={context.mpesa_enabled}
                onConfirm={completeSale}
            />

            <Dialog
                open={Boolean(mpesaPending)}
                onOpenChange={(open) => {
                    if (!open) setMpesaPending(null);
                }}
            >
                <DialogContent
                    className={cn(
                        'terminal sm:max-w-sm',
                        contrast !== 'daylight' && 'dark',
                    )}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Loader2 className="size-4 animate-spin text-pay" />
                            Waiting for M-Pesa
                        </DialogTitle>
                        <DialogDescription>
                            STK sent to {mpesaPending?.phone}. Ask the customer
                            to approve the prompt. This dialog updates when
                            Safaricom confirms.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-xl border border-border/70 bg-card px-3 py-3 text-center">
                        <p className="font-mono text-xl font-semibold">
                            {currency}{' '}
                            {formatMoney(mpesaPending?.order.total ?? 0)}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            Order {mpesaPending?.order.number}
                        </p>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(variantProduct)}
                onOpenChange={(open) => {
                    if (!open) {
                        setVariantProduct(null);
                    }
                }}
            >
                <DialogContent
                    className={cn(
                        'terminal sm:max-w-md',
                        contrast !== 'daylight' && 'dark',
                    )}
                    data-contrast={contrast === 'normal' ? undefined : contrast}
                >
                    <DialogHeader>
                        <DialogTitle>{variantProduct?.name}</DialogTitle>
                        <DialogDescription>
                            Choose a variant to add to the sale.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2">
                        {variantProduct?.variants.map((variant) => (
                            <button
                                key={variant.id}
                                type="button"
                                disabled={variant.stock <= 0}
                                onClick={() => {
                                    if (variantProduct) {
                                        addVariant(variantProduct, variant);
                                    }

                                    setVariantProduct(null);
                                }}
                                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 text-left transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <div>
                                    <div className="text-sm font-medium">
                                        {variant.name}
                                    </div>
                                    <div className="font-mono text-[10px] text-muted-foreground">
                                        {variant.sku}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-sm">
                                        {currency} {formatMoney(variant.price)}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {variant.stock <= 0
                                            ? 'Out of stock'
                                            : `${variant.stock} left`}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <OrdersTodayDialog
                open={ordersOpen}
                onOpenChange={setOrdersOpen}
                orders={orderState}
                currency={currency}
            />

            <CloseTillDialog
                open={closeTillOpen}
                onOpenChange={setCloseTillOpen}
                till={tillState}
                closingCash={closeTillForm.data.closing_cash}
                onClosingCashChange={(value) =>
                    closeTillForm.setData('closing_cash', value)
                }
                reason={closeTillForm.data.variance_reason}
                onReasonChange={(value) =>
                    closeTillForm.setData('variance_reason', value)
                }
                onSubmit={submitCloseTill}
                processing={closeTillForm.processing}
                error={
                    closeTillForm.errors.closing_cash ??
                    closeTillForm.errors.variance_reason
                }
            />

            <TillReportDialog
                open={xReportOpen}
                onOpenChange={setXReportOpen}
                report={tillState}
                mode="x"
                branchName={context.branch.name}
                currency={currency}
            />

            <TillReportDialog
                open={zReportOpen}
                onOpenChange={setZReportOpen}
                report={flash.z_report ?? null}
                mode="z"
                branchName={context.branch.name}
                currency={currency}
            />

            {receipt && <SaleSuccess receipt={receipt} onNewSale={newSale} />}
        </>
    );
}
