/**
 * SCAFFOLD ONLY — do not import until routes and shared props exist.
 *
 * Add to the CWS footer only when:
 *   portal.enabled && portal.isSuperadmin
 */
import { CreditCard, HelpCircle, Megaphone } from 'lucide-react';
import { Link } from '@inertiajs/react';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

type Props = { url?: string };

export function PortalFooter({}: Props) {
    const items = [
        { title: 'Support', href: '/admin/support', icon: HelpCircle },
        {
            title: 'Announcements',
            href: '/admin/announcements',
            icon: Megaphone,
        },
        { title: 'Billing', href: '/admin/billing', icon: CreditCard },
    ];

    return (
        <SidebarMenu>
            {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                        <Link href={item.href}>
                            <item.icon className="h-5 w-5" />
                            <span>{item.title}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
        </SidebarMenu>
    );
}
