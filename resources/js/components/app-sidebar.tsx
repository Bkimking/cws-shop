import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    FolderGit2,
    LayoutGrid,
    Building2,
    Building,
    MapPin,
    Globe2,
    Store,
    Boxes,
    Users,
    Shield,
    Box,
    Tag,
    History,
    Warehouse,
    ShoppingCart,
    CreditCard,
    BarChart,
    HelpCircle,
    Bell,
    ScanBarcode,
    Sparkles,
    Compass,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes/admin';
import adminbranches from '@/routes/admin/branches';
import adminregions from '@/routes/admin/regions';
import adminusers from '@/routes/admin/users';
import adminroles from '@/routes/admin/roles';
import adminactivity from '@/routes/admin/activity';
import adminproducts from '@/routes/admin/products';
import adminprodcategories from '@/routes/admin/categories';
import adminstock from '@/routes/admin/stock';
import adminorders from '@/routes/admin/orders';
import adminpaymentgateways from '@/routes/admin/payment-gateways';
import adminreports from '@/routes/admin/reports';
import adminwarehouses from '@/routes/admin/warehouses';
import pos from '@/routes/pos';
import type { Auth, NavItem } from '@/types';
import type { AiShared } from '@/types/ai';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
        icon: LayoutGrid,
        permission: 'access admin panel',
        group: 'Platform',
    },
    {
        title: 'AI assistant',
        href: '/admin/ai',
        icon: Sparkles,
        permission: 'use ai assistant',
        group: 'Platform',
    },
    {
        title: 'Region desk',
        href: '/admin/region',
        icon: Globe2,
        permission: 'view region reports',
        group: 'Management',
    },
    {
        title: 'Branch desk',
        href: '/admin/branch',
        icon: Store,
        permission: 'view branch reports',
        group: 'Management',
    },
    {
        title: 'Inventory desk',
        href: '/admin/inventory',
        icon: Boxes,
        permission: 'view stock',
        group: 'Inventory',
    },
    {
        title: 'Sell',
        href: pos.index().url,
        icon: ScanBarcode,
        permission: 'use pos terminal',
        group: 'POS',
    },
    {
        title: 'Products',
        href: adminproducts.index().url,
        icon: Box,
        permission: 'view products',
        group: 'Inventory',
    },
    {
        title: 'Prod Categories',
        href: adminprodcategories.index().url,
        icon: Tag,
        permission: 'manage categories',
        group: 'Inventory',
    },
    {
        title: 'Warehouses',
        href: adminwarehouses.index().url,
        icon: Building,
        permission: 'manage warehouses',
        group: 'Inventory',
    },
    {
        title: 'Stock',
        href: adminstock.index().url,
        icon: Warehouse,
        permission: 'view stock',
        group: 'Inventory',
    },
    {
        title: 'Orders',
        href: adminorders.index().url,
        icon: ShoppingCart,
        permission: 'view orders',
        group: 'Sales',
    },
    {
        title: 'Payment Gateways',
        href: adminpaymentgateways.index().url,
        icon: CreditCard,
        permission: 'manage payment gateways',
        group: 'Finances',
    },
    {
        title: 'Reports',
        href: adminreports.index().url,
        icon: BarChart,
        permission: 'view reports',
        group: 'Finances',
    },
    {
        title: 'Roles',
        href: adminroles.index().url,
        icon: Shield,
        permission: 'manage permissions and roles',
        group: 'Management',
    },
    {
        title: 'Users',
        href: adminusers.index().url,
        icon: Users,
        permission: 'view users',
        group: 'Management',
    },
    {
        title: 'Regions',
        href: adminregions.index().url,
        icon: MapPin,
        permission: 'manage regions',
        group: 'Management',
    },
    {
        title: 'Branches',
        href: adminbranches.index().url,
        icon: Building2,
        permission: 'manage branches',
        group: 'Management',
    },
    {
        title: 'Guided tour',
        href: '/admin/guide',
        icon: Compass,
        permission: 'access admin panel',
        group: 'Support',
    },
    {
        title: 'Activity log',
        href: adminactivity.index().url,
        icon: History,
        permission: 'view activity log',
        group: 'System',
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Support',
        href: '',
        icon: HelpCircle,
    },
    {
        title: 'Updates',
        href: '',
        icon: Bell,
    },
];

export function AppSidebar() {
    const page = usePage();
    const { auth, ai } = page.props as { auth: Auth; ai?: AiShared };
    const permissions = auth.permissions ?? [];
    const visibleNavItems = mainNavItems.filter(
        (item) =>
            (!item.permission || permissions.includes(item.permission)) &&
            (item.href !== '/admin/ai' || ai?.enabled !== false),
    );

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard().url} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={visibleNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
