import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
    value: string | null | undefined;
    label?: string;
    height?: number;
    showPrint?: boolean;
    className?: string;
};

export function BarcodeLabel({
    value,
    label,
    height = 42,
    showPrint = false,
    className = '',
}: Props) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !value) return;

        try {
            JsBarcode(svgRef.current, value, {
                format: 'CODE128',
                width: 1.4,
                height,
                displayValue: true,
                fontSize: 10,
                margin: 4,
            });
        } catch {
            // A malformed barcode should not crash the form.
        }
    }, [value, height]);

    const printLabel = () => {
        if (!value || !svgRef.current) return;
        const win = window.open('', '_blank', 'width=520,height=360');
        if (!win) return;
        win.document.write(
            `<html><head><title>${label ?? value}</title><style>body{font-family:Segoe UI,sans-serif;padding:24px;text-align:center}svg{max-width:100%}h1{font-size:14px;margin:0 0 12px}p{font-size:11px;color:#444}</style></head><body><h1>${label ?? 'Product barcode'}</h1>${svgRef.current.outerHTML}<p>${value}</p></body></html>`,
        );
        win.document.close();
        win.focus();
        win.print();
    };

    if (!value) {
        return (
            <p className="text-[11px] text-muted-foreground">
                Barcode will be generated on save.
            </p>
        );
    }

    return (
        <div
            className={`rounded-lg border border-border/60 bg-white p-3 text-center ${className}`}
        >
            {label && (
                <p className="mb-1 text-[10px] font-medium text-neutral-700">
                    {label}
                </p>
            )}
            <svg ref={svgRef} className="mx-auto max-w-full" />
            {showPrint && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-[10px]"
                    onClick={printLabel}
                >
                    <Printer className="mr-1.5 size-3" />
                    Print label
                </Button>
            )}
        </div>
    );
}
