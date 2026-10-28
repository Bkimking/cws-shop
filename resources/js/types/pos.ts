export type PosVariant = {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    price: number;
    stock: number;
};

export type PosProduct = {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    category_id: number | null;
    category: string | null;
    price: number;
    stock: number;
    image_url?: string | null;
    variants: PosVariant[];
};

export type PosCategory = {
    id: number;
    name: string;
};

export type PosTill = {
    id: number;
    status: string;
    opened_at: string | null;
    opened_at_label: string | null;
    closed_at_label: string | null;
    cashier: string;
    opening_cash: number;
    sales_count: number;
    gross: number;
    cash: number;
    expected_cash: number;
    closing_cash: number;
    variance: number | null;
    variance_reason: string | null;
};

export type PosContext = {
    branch: {
        id: number;
        name: string;
        address: string;
        phone: string;
    };
    region: {
        id: number;
        name: string;
        currency_code: string;
        tax_rate: number;
        timezone: string;
    };
    tax_label: string;
    mpesa_enabled: boolean;
};

export type PosOrderSummary = {
    id: number;
    number: string;
    total: number;
    items_count: number;
    status: string;
    time: string | null;
    created_at: string | null;
};

export type PosReceiptItem = {
    id: number;
    name: string;
    variant: string | null;
    quantity: number;
    unit_price: number;
    discount: number;
    line_total: number;
};

export type PosReceipt = {
    id: number;
    number: string;
    created_at: string | null;
    created_at_label: string | null;
    currency: string;
    subtotal: number;
    tax: number;
    tax_rate: number;
    total: number;
    branch: {
        name: string;
        address: string;
        phone: string;
    };
    cashier: string;
    items: PosReceiptItem[];
    payment: {
        gateway: string;
        amount: number;
        status?: string;
        tendered: number | null;
        change: number | null;
        checkout_request_id?: string | null;
    };
    payment_status?: string;
    payment_method?: string;
};

export type CartLine = {
    variant_id: number;
    product_id: number;
    name: string;
    variant: string;
    sku: string;
    barcode: string | null;
    price: number;
    quantity: number;
    stock: number;
};

export type PosPageProps = {
    context: PosContext;
    cashier: {
        id: number;
        name: string;
    };
    till: PosTill | null;
    products: PosProduct[];
    categories: PosCategory[];
    ordersToday: PosOrderSummary[];
    can: {
        access_admin: boolean;
        apply_discounts: boolean;
    };
};

export type PosSharedProps = {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
        };
        roles: string[];
        permissions: string[];
    };
    flash: {
        z_report?: PosTill | null;
        toast?: {
            type: 'success' | 'error' | 'warning' | 'info';
            title: string;
            message: string;
        } | null;
    };
};
