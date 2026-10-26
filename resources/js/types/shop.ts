export type ShopBranch = {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    currency: string;
    tax_rate: number;
};

export type ShopVariant = {
    id: number;
    name: string;
    sku: string;
    price: number;
    stock: number;
    available: boolean;
};

export type ShopProduct = {
    id: number;
    name: string;
    sku: string;
    description?: string | null;
    category: string | null;
    category_id: number | null;
    price: number;
    stock: number;
    image_url?: string | null;
    variants: ShopVariant[];
    currency: string;
    branch: string;
};

export type ShopLine = {
    variant_id: number;
    product_id: number;
    name: string;
    variant: string;
    sku: string;
    price: number;
    quantity: number;
    available: number;
    line_total: number;
};

export type ShopTotals = {
    gross: number;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
};

export type ShopOrder = {
    id: number;
    number: string;
    public_token: string;
    status: string;
    pickup_status?: string;
    payment_status: string | null;
    payment?: {
        status: string;
        gateway: string;
        failure_reason: string | null;
        expires_at: string | null;
        last_checked_at: string | null;
        created_at: string | null;
    } | null;
    payment_gateway: string | null;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    created_at: string | null;
    pickup_ready_at?: string | null;
    collected_at?: string | null;
    customer_email?: string | null;
    pickup?: {
        id: number;
        name: string;
        address: string | null;
        phone: string | null;
    } | null;
    branch: {
        name: string;
        address: string | null;
        phone: string | null;
    } | null;
    items: Array<{
        name: string | null;
        variant: string | null;
        quantity: number;
        unit_price: number;
        line_total: number;
    }>;
};

export type ShopShared = {
    cart_count: number;
    mpesa_enabled: boolean;
    paypal_enabled: boolean;
};
