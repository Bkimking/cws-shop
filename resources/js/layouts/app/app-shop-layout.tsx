import { Link, usePage } from '@inertiajs/react';
import {
    ArrowUpRight,
    LayoutDashboard,
    Sparkles,
    ShoppingBag,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { FlashMessageObserver } from '@/hooks/use-flash-toast';
import type { Auth } from '@/types';
import type { ShopShared } from '@/types/shop';

const nav = [
    { href: '/', label: 'Home' },
    { href: '/shop', label: 'Shop' },
    { href: '/shop/about', label: 'About' },
    { href: '/shop/contact', label: 'Contact' },
];

export default function AppShopLayout({ children }: { children: ReactNode }) {
    const { auth, shop } = usePage<{ auth: Auth; shop: ShopShared }>().props;
    const cartCount = shop?.cart_count ?? 0;
    const workspace = auth?.permissions?.includes('access admin panel')
        ? '/admin'
        : auth?.permissions?.includes('use pos terminal')
          ? '/pos'
          : null;

    return (
        <div className="flex min-h-dvh flex-col bg-background text-foreground">
            <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur print:hidden">
                <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            <ShoppingBag className="size-4" />
                        </span>
                        <span className="text-sm font-semibold tracking-tight">
                            CWSPOS{' '}
                            <span className="text-muted-foreground">Shop</span>
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-1 md:flex">
                        {nav.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-1.5">
                        {workspace && (
                            <Link
                                href={workspace}
                                className="hidden items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground sm:inline-flex"
                            >
                                <LayoutDashboard className="size-3.5" />
                                Workspace
                            </Link>
                        )}
                        <Link
                            href="/shop/cart"
                            className="relative flex size-9 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                            aria-label="Open cart"
                        >
                            <ShoppingBag className="size-4" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                                    {cartCount > 9 ? '9+' : cartCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1">{children}</main>

            <Link
                href="/shop/assistant"
                className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 sm:right-6 sm:bottom-6 print:hidden"
            >
                <Sparkles className="size-4" />
                Ask the shop
            </Link>

            <footer className="border-t border-border/60 bg-muted/20 print:hidden">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold">CWSPOS Shop</p>
                        <p className="text-xs text-muted-foreground">
                            Everyday essentials, picked from the shelf.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <Link
                            href="/shop/about"
                            className="hover:text-foreground"
                        >
                            About
                        </Link>
                        <Link
                            href="/shop/contact"
                            className="hover:text-foreground"
                        >
                            Contact
                        </Link>
                        <Link
                            href="/shop/assistant"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                            <Sparkles className="size-3" />
                            Ask the shop assistant
                            <ArrowUpRight className="size-3" />
                        </Link>
                    </div>
                </div>
            </footer>

            <FlashMessageObserver />
        </div>
    );
}
