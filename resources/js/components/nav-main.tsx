import { Link, usePage } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({ items }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();
    const page = usePage();
    const auth = page.props.auth as any;
    const permissions = auth?.permissions || [];

    const filteredItems = items.filter((item) => {
        if (!item.permission) return true;
        return permissions.includes(item.permission);
    });

    // Group items by their group property
    const groupedItems = filteredItems.reduce((acc, item) => {
        const group = item.group || 'Platform';
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(item);
        return acc;
    }, {} as Record<string, NavItem[]>);

    return (
        <>
            {Object.entries(groupedItems).map(([groupName, groupItems]) => (
                <SidebarGroup key={groupName} className="px-2 py-0">
                    <SidebarGroupLabel>{groupName}</SidebarGroupLabel>
                    <SidebarMenu>
                        {groupItems.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isCurrentUrl(item.href)}
                                    tooltip={{ children: item.title }}
                                >
                                    <Link href={item.href} prefetch>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}
