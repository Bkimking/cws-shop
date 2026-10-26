import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, HeartHandshake, Sparkles } from 'lucide-react';

export default function ShopAbout() {
    return (
        <>
            <Head title="About" />
            <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
                <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">About</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">A simpler way to shop the shelf.</h1>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    CWSPOS Shop connects the same shelves and stock that power our tills with a small, direct
                    shopping experience. Pick what you need, pay with M-Pesa, and collect at your branch.
                </p>

                <div className="mt-8 grid gap-3">
                    {[
                        { icon: CheckCircle2, title: 'Real stock', text: 'Availability comes from the shop floor, not a separate catalogue.' },
                        { icon: Sparkles, title: 'AI that helps', text: 'The shop assistant can search products, build a cart and guide you to checkout.' },
                        { icon: HeartHandshake, title: 'Human when it matters', text: 'Payments and pickup are confirmed by real people and real systems.' },
                    ].map((item) => (
                        <div key={item.title} className="flex gap-3 rounded-2xl border border-border/70 bg-card p-4">
                            <item.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                            <div>
                                <p className="text-sm font-medium">{item.title}</p>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <Link href="/shop" className="mt-8 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Browse the shelf</Link>
            </div>
        </>
    );
}
