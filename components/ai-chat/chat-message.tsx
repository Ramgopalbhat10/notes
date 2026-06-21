"use client";

import { forwardRef, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  BrainCircuit,
  ChevronRight,
  Copy,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChatMessageRowProps } from "./types";
import { messageToPlainText, messageToReasoning } from "./utils";

function ChatReasoning({
  reasoning,
  streaming,
}: {
  reasoning: string;
  streaming: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(streaming);
  }, [streaming]);

  if (!reasoning.trim()) return null;

  return (
    <CollapsiblePrimitive.Root
      open={open}
      onOpenChange={setOpen}
      className="mb-2"
    >
      <CollapsiblePrimitive.CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              open && "rotate-90"
            )}
          />
          <BrainCircuit className="h-3.5 w-3.5" />
          {streaming ? "Thinking…" : "Reasoning"}
        </button>
      </CollapsiblePrimitive.CollapsibleTrigger>
      <CollapsiblePrimitive.CollapsibleContent>
        <div className="mt-1 max-h-60 overflow-y-auto rounded-md border border-border/50 bg-muted/30 px-3 py-2">
          <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {reasoning}
          </p>
        </div>
      </CollapsiblePrimitive.CollapsibleContent>
    </CollapsiblePrimitive.Root>
  );
}

export const ChatMessageRow = forwardRef<HTMLDivElement, ChatMessageRowProps>(
  function ChatMessageRow(
    { message, streaming, copying, onCopy, onInsert, onRegenerate, canRegenerate },
    ref
  ) {
    const isAssistant = message.role === "assistant";
    const text = messageToPlainText(message);
    const reasoning = messageToReasoning(message);
    const hasContent = Boolean(text.trim());
    const hasReasoning = Boolean(reasoning.trim());

    const contentClasses = isAssistant ? "w-full" : "ml-auto max-w-[65%]";

    return (
      <div ref={ref}>
        <Message from={message.role} data-role={message.role}>
          <MessageContent
            variant={isAssistant ? "flat" : "contained"}
            className={contentClasses}
          >
            {isAssistant ? (
              <>
                {hasReasoning ? (
                  <ChatReasoning reasoning={reasoning} streaming={streaming} />
                ) : null}
                {hasContent ? (
                  <Response compact>{text}</Response>
                ) : hasReasoning ? null : (
                  <span className="text-muted-foreground">
                    Waiting for response…
                  </span>
                )}
              </>
            ) : (
              <span className="whitespace-pre-wrap break-words">{text}</span>
            )}
            {isAssistant ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {streaming ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Streaming…
                  </span>
                ) : null}
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => onInsert(message)}
                        disabled={!hasContent}
                        className="h-7 w-7"
                      >
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Insert into editor</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => onCopy(message)}
                        disabled={!hasContent || copying}
                        className="h-7 w-7"
                        aria-label="Copy message"
                      >
                        {copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Copy message</TooltipContent>
                  </Tooltip>
                  {canRegenerate && isAssistant ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => onRegenerate(message.id)}
                          className="h-7 w-7"
                          aria-label="Regenerate response"
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Regenerate response</TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
              </div>
            ) : null}
          </MessageContent>
        </Message>
      </div>
    );
  }
);
