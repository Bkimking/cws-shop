import { useState } from 'react';
import { Check, Copy, Sparkles } from 'lucide-react';
import type { UIMessage } from 'ai';
import { Button } from '@/components/ui/button';
import { ToolCallCard } from '@/components/ai/tool-call-card';

function isToolPart(part: { type: string }): boolean {
    return part.type.startsWith('tool-') || part.type === 'dynamic-tool';
}

function toolName(part: Record<string, unknown>): string {
    if (typeof part.toolName === 'string') {
        return part.toolName;
    }

    return String(part.type ?? '').replace(/^tool-/, '');
}

function MessageCopy({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground"
            onClick={() => {
                void navigator.clipboard.writeText(text).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                });
            }}
        >
            {copied ? (
                <Check className="size-3" />
            ) : (
                <Copy className="size-3" />
            )}
            {copied ? 'Copied' : 'Copy'}
        </Button>
    );
}

export function ChatThread({
    messages,
    status,
    onApproval,
}: {
    messages: UIMessage[];
    status: string;
    onApproval?: (id: string, approved: boolean) => void;
}) {
    const isStreaming = status === 'streaming';

    return (
        <div className="mx-auto w-full max-w-[46rem] space-y-6">
            {messages.map((message, index) => {
                const text = message.parts
                    .filter((part) => part.type === 'text')
                    .map((part) => (part as { text: string }).text)
                    .join('');

                if (message.role === 'user') {
                    return (
                        <div key={message.id} className="flex justify-end">
                            <div className="max-w-[85%] rounded-2xl rounded-br-md border border-border/50 bg-chat-user px-4 py-2.5 text-sm leading-relaxed text-foreground">
                                {text}
                            </div>
                        </div>
                    );
                }

                const toolParts = message.parts.filter(isToolPart);

                return (
                    <div key={message.id} className="space-y-3">
                        <div className="flex gap-2.5">
                            <Sparkles className="mt-1 size-4 shrink-0 text-ai" />
                            <div className="min-w-0 flex-1">
                                {text !== '' && (
                                    <div className="chat-prose text-sm whitespace-pre-wrap text-foreground">
                                        {text}
                                        {isStreaming &&
                                            index === messages.length - 1 && (
                                                <span className="ai-caret" />
                                            )}
                                    </div>
                                )}

                                {toolParts.map((part, partIndex) => {
                                    const tool = part as Record<
                                        string,
                                        unknown
                                    >;
                                    const output =
                                        tool.output ?? tool.result ?? undefined;
                                    const approval = tool.approval as
                                        | {
                                              id: string;
                                              approved?: boolean;
                                              requestReason?: string;
                                              reason?: string;
                                          }
                                        | undefined;

                                    return (
                                        <div key={partIndex} className="mt-2.5">
                                            <ToolCallCard
                                                name={toolName(tool)}
                                                input={tool.input}
                                                output={output}
                                                state={
                                                    typeof tool.state ===
                                                    'string'
                                                        ? tool.state
                                                        : undefined
                                                }
                                                approval={approval}
                                                onApproval={onApproval}
                                            />
                                        </div>
                                    );
                                })}

                                {text !== '' && (
                                    <div className="mt-1 flex items-center">
                                        <MessageCopy text={text} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {status === 'submitted' && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Sparkles className="size-4 text-ai" />
                    <span className="flex items-center gap-1">
                        Looking that up
                        <span className="inline-flex gap-0.5">
                            <span className="size-1 animate-pulse rounded-full bg-ai" />
                            <span className="size-1 animate-pulse rounded-full bg-ai [animation-delay:120ms]" />
                            <span className="size-1 animate-pulse rounded-full bg-ai [animation-delay:240ms]" />
                        </span>
                    </span>
                </div>
            )}
        </div>
    );
}
