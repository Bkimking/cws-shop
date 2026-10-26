import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Composer({
    onSend,
    onStop,
    isBusy,
    disabled,
    placeholder = 'Ask about sales, stock or orders…',
}: {
    onSend: (message: string) => void;
    onStop: () => void;
    isBusy: boolean;
    disabled?: boolean;
    placeholder?: string;
}) {
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textarea = textareaRef.current;

        if (!textarea) {
            return;
        }

        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }, [value]);

    const submit = () => {
        if (disabled || isBusy || value.trim() === '') {
            return;
        }

        onSend(value);
        setValue('');
    };

    return (
        <div className="mx-auto w-full max-w-[46rem]">
            <div
                className={cn(
                    'flex items-end gap-2 rounded-2xl border border-border/80 bg-composer p-2.5 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.9)] transition-colors focus-within:border-ai-border focus-within:ring-1 focus-within:ring-ai/30',
                    disabled && 'opacity-60',
                )}
            >
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            submit();
                        }
                    }}
                    rows={1}
                    disabled={disabled}
                    placeholder={placeholder}
                    aria-label="Message the AI assistant"
                    className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/80 disabled:cursor-not-allowed"
                />

                {isBusy ? (
                    <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-9 shrink-0 rounded-lg border-border bg-card text-foreground hover:bg-muted"
                        onClick={onStop}
                        aria-label="Stop generating"
                    >
                        <Square className="size-3.5 fill-current" />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        size="icon"
                        className="size-9 shrink-0 rounded-lg bg-ai text-ai-foreground shadow-[0_0_18px_-8px_var(--ai)] hover:bg-ai/90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                        onClick={submit}
                        disabled={disabled || value.trim() === ''}
                        aria-label="Send message"
                    >
                        <ArrowUp className="size-4" />
                    </Button>
                )}
            </div>

            <p className="mt-2 text-center text-[10px] text-muted-foreground">
                AI can make mistakes. Check important numbers against the linked
                records.
            </p>
        </div>
    );
}
