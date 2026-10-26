import { FlashMessageObserver } from '@/hooks/use-flash-toast';
import { cn } from '@/lib/utils';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type TerminalContrast = 'normal' | 'high' | 'daylight';

type TerminalTheme = {
    contrast: TerminalContrast;
    setContrast: (contrast: TerminalContrast) => void;
};

const TerminalThemeContext = createContext<TerminalTheme | null>(null);

export function useTerminalTheme(): TerminalTheme {
    const theme = useContext(TerminalThemeContext);

    if (!theme) {
        throw new Error(
            'useTerminalTheme must be used inside AppTerminalLayout.',
        );
    }

    return theme;
}

export default function AppTerminalLayout({
    children,
}: {
    children: ReactNode;
}) {
    const [contrast, setContrast] = useState<TerminalContrast>('normal');

    useEffect(() => {
        const stored = window.localStorage.getItem('pos-contrast');

        if (stored === 'high' || stored === 'daylight') {
            setContrast(stored);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem('pos-contrast', contrast);
        document.documentElement.classList.toggle(
            'dark',
            contrast !== 'daylight',
        );
    }, [contrast]);

    const theme = useMemo(() => ({ contrast, setContrast }), [contrast]);

    return (
        <TerminalThemeContext.Provider value={theme}>
            <div
                className={cn(
                    'terminal min-h-dvh',
                    contrast !== 'daylight' && 'dark',
                )}
                data-contrast={contrast === 'normal' ? undefined : contrast}
            >
                <FlashMessageObserver />
                {children}
            </div>
        </TerminalThemeContext.Provider>
    );
}
