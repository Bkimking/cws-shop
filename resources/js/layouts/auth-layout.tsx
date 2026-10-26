import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';
import { FlashMessageObserver } from '@/hooks/use-flash-toast';

export default function AuthLayout({
    title = '',
    description = '',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <AuthLayoutTemplate title={title} description={description}>
            <FlashMessageObserver />
            {children}
        </AuthLayoutTemplate>
    );
}
