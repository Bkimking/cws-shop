import { Head, Link } from '@inertiajs/react';
import { MapPin, MessageCircle, Phone } from 'lucide-react';

export default function ShopContact() {
    return (
        <>
            <Head title="Contact" />
            <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
                <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">Contact</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">We are here to help.</h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Questions about a product, pickup or an order? Reach the shop directly or ask the assistant.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <Phone className="size-5 text-primary" />
                        <p className="mt-3 text-sm font-medium">Call the shop</p>
                        <p className="mt-1 text-xs text-muted-foreground">Use the number on your order confirmation or branch page.</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card p-5">
                        <MapPin className="size-5 text-primary" />
                        <p className="mt-3 text-sm font-medium">Pickup</p>
                        <p className="mt-1 text-xs text-muted-foreground">Collect at the branch selected in the shop. Bring your order number.</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card p-5 sm:col-span-2">
                        <MessageCircle className="size-5 text-primary" />
                        <p className="mt-3 text-sm font-medium">Chat with the shop assistant</p>
                        <p className="mt-1 text-xs text-muted-foreground">Find products, build a cart and get pickup help.</p>
                        <Link href="/shop/assistant" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">Open assistant</Link>
                    </div>
                </div>
            </div>
        </>
    );
}
