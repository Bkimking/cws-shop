import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

export function useFlashToast(): void {
    const page = usePage();
    const flash = (page.props as any).flash;

    useEffect(() => {
        if (!flash) return;

        if (flash.toast) {
            const data = flash.toast as FlashToast;
            toast[data.type](data.message);
        } else if (flash.success) {
            toast.success(flash.success);
        } else if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash]);
}

export function FlashMessageObserver() {
    useFlashToast();
    return null;
}
