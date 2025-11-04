"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, type UIMessage } from "ai";
import { ArrowDownLeft, Bot, Copy, Loader2, RefreshCcw, SendHorizontal, Square } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useEditorStore } from "@/stores/editor";
import { useStickToBottomContext } from "use-stick-to-bottom";

const MAX_EXCERPT_CHARS = 6_000;

type StickContext = ReturnType<typeof useStickToBottomContext>;

type FilePayload = {
  key: string;
  contentDigest: string | null;
  excerpt: string | null;
};

type SidebarChatProps = {
  onComposerChange?: (composer: ReactNode | null) => void;
};

export function SidebarChat({ onComposerChange }: SidebarChatProps) {
  const fileKey = useEditorStore((state) => state.fileKey);
  const editorStatus = useEditorStore((state) => state.status);
  const content = useEditorStore((state) => state.content);
  const applyAiResult = useEditorStore((state) => state.applyAiResult);
  const { toast } = useToast();

  const excerpt = useMemo(() => computeExcerpt(content), [content]);
  const digest = useMemo(() => computeDigest(content), [content]);
  const truncated = useMemo(() => content.length > MAX_EXCERPT_CHARS, [content.length]);

  const filePayload = useMemo<FilePayload | null>(() => {
    if (!fileKey) {
      return null;
    }
    return {
      key: fileKey,
      contentDigest: digest,
      excerpt: excerpt.length ? excerpt : null,
    };
  }, [digest, excerpt, fileKey]);

  const latestPayloadRef = useRef<FilePayload | null>(filePayload);
  useEffect(() => {
    latestPayloadRef.current = filePayload;
  }, [filePayload]);

  const stickContextRef = useRef<StickContext | null>(null);

  const transport = useMemo(
    () =>
      new TextStreamChatTransport<UIMessage>({
        api: "/api/ai/chat",
        credentials: "same-origin",
        prepareSendMessagesRequest: ({ body, messages }) => ({
          body: {
            ...(body ?? {}),
            messages,
            file: latestPayloadRef.current,
          },
        }),
      }),
    [],
  );

  const chat = useMemo(
    () =>
      new Chat<UIMessage>({
        id: "vault-sidebar-chat",
        transport,
      }),
    [transport],
  );

  const { messages, sendMessage, stop, regenerate, status, error, clearError, setMessages } = useChat({
    chat,
  });

  const [draft, setDraft] = useState("");
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const previousFileKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const currentKey = fileKey ?? null;
    if (previousFileKeyRef.current === currentKey) {
      return;
    }
    previousFileKeyRef.current = currentKey;
    void stop();
    clearError();
    setDraft("");
    setCopyingId(null);
    setMessages([]);
  }, [clearError, fileKey, setMessages, stop]);

  const isStreaming = status === "submitted" || status === "streaming";
  const canChat = Boolean(fileKey) && editorStatus !== "loading";

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role === "assistant" || message.role === "user"),
    [messages],
  );

  const lastAssistant = useMemo(
    () => [...visibleMessages].reverse().find((message) => message.role === "assistant"),
    [visibleMessages],
  );

  const streamingMessageId = isStreaming ? lastAssistant?.id ?? null : null;

  const handleSubmit = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const text = draft.trim();
      if (!text || !canChat) {
        return;
      }
      clearError();
      const context = stickContextRef.current;
      if (context) {
        context.scrollToBottom({ animation: "instant" });
      }
      setDraft("");
      await sendMessage({ text });
    },
    [canChat, clearError, draft, sendMessage],
  );

  const handleStop = useCallback(async () => {
    await stop();
  }, [stop]);

  const handleRegenerate = useCallback(
    async (messageId: string | undefined) => {
      if (!messageId) {
        return;
      }
      await regenerate({ messageId });
    },
    [regenerate],
  );

  const handleCopy = useCallback(
    async (message: UIMessage) => {
      const text = messageToPlainText(message).trim();
      if (!text) {
        toast({
          title: "Nothing to copy",
          description: "The assistant has not responded yet.",
          variant: "destructive",
        });
        return;
      }
      setCopyingId(message.id);
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied" });
      } catch (copyError) {
        console.error("Failed to copy", copyError);
        toast({
          title: "Copy failed",
          description: "Clipboard access was denied.",
          variant: "destructive",
        });
      } finally {
        setCopyingId(null);
      }
    },
    [toast],
  );

  const handleInsert = useCallback(
    (message: UIMessage) => {
      const text = messageToPlainText(message);
      if (!text.trim()) {
        toast({
          title: "No content",
          description: "Wait for the assistant response before inserting.",
        });
        return;
      }
      applyAiResult(text, { strategy: "insert" });
      toast({
        title: "Inserted",
        description: "AI response added to the editor.",
      });
    },
    [applyAiResult, toast],
  );

  const composerDisabled = !canChat || isStreaming;
  const hasMessages = visibleMessages.length > 0;

  const previousMessageCountRef = useRef(messages.length);

  useEffect(() => {
    const previous = previousMessageCountRef.current;
    if (messages.length <= previous) {
      previousMessageCountRef.current = messages.length;
      return;
    }

    previousMessageCountRef.current = messages.length;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return;
    }

    const context = stickContextRef.current;
      if (!context) {
        return;
      }

      requestAnimationFrame(() => {
        context.scrollToBottom({
          animation: { damping: 0.72, stiffness: 0.08, mass: 1.1 },
        });
      });
  }, [messages]);

  const composer = useMemo(() => (
    <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={canChat ? "Ask the assistant about this file…" : "Open a file to start chatting."}
          disabled={composerDisabled}
          className="h-9 md:h-10 min-h-0 resize-none pr-12 text-sm"
          rows={1}
        />
        <Button
          type={isStreaming ? "button" : "submit"}
          size="icon"
          variant="default"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full p-0"
          onClick={isStreaming ? handleStop : undefined}
          disabled={isStreaming ? false : composerDisabled || !draft.trim()}
        >
          {isStreaming ? <Square className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <SendHorizontal className="h-3.5 w-3.5 md:h-4 md:w-4" />}
          <span className="sr-only">{isStreaming ? "Stop" : "Send"}</span>
        </Button>
      </div>
      {isStreaming ? (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Streaming…
        </span>
      ) : null}
    </form>
  ), [canChat, composerDisabled, draft, handleStop, handleSubmit, isStreaming]);

  useEffect(() => {
    onComposerChange?.(composer);
  }, [composer, onComposerChange]);

  useEffect(() => {
    return () => {
      onComposerChange?.(null);
    };
  }, [onComposerChange]);

  return (
    <div className="flex h-full flex-col gap-3 text-sm md:text-base">
      <header className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Bot className="h-4 w-4 text-primary" />
          <span>AI Assistant</span>
        </div>
        {fileKey ? (
          <p className="text-xs text-muted-foreground">
            Grounded in <span className="font-medium">{fileKey}</span>
            {truncated ? "; context truncated for token budget." : "."}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Select a Markdown file to chat with the assistant about its content.
          </p>
        )}
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
          <div className="flex items-center justify-between gap-3">
            <span>{error.message}</span>
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => clearError()}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <Conversation className="flex size-full flex-col">
          <StickToBottomWatcher
            onContext={(ctx) => {
              stickContextRef.current = ctx;
            }}
          />
          <ConversationContent className="space-y-2 pb-6">
            {hasMessages ? (
              visibleMessages.map((message) => (
                <ChatMessageRow
                  key={message.id}
                  message={message}
                  streaming={streamingMessageId === message.id}
                  copying={copyingId === message.id}
                  onInsert={handleInsert}
                  onCopy={handleCopy}
                  onRegenerate={handleRegenerate}
                  canRegenerate={!isStreaming}
                />
              ))
            ) : (
              <ConversationEmptyState
                title={canChat ? "Ask your first question" : "No file selected"}
                description={
                  canChat
                    ? "Start a conversation to get contextual guidance."
                    : "Open a Markdown file to enable contextual chat."
                }
              />
            )}
          </ConversationContent>
          <ConversationScrollButton aria-label="Scroll to latest message" />
        </Conversation>
      </div>

    </div>
  );
}

type ChatMessageRowProps = {
  message: UIMessage;
  streaming: boolean;
  copying: boolean;
  onCopy: (message: UIMessage) => void;
  onInsert: (message: UIMessage) => void;
  onRegenerate: (messageId: string | undefined) => void;
  canRegenerate: boolean;
};

function ChatMessageRow({
  message,
  streaming,
  copying,
  onCopy,
  onInsert,
  onRegenerate,
  canRegenerate,
}: ChatMessageRowProps) {
  const isAssistant = message.role === "assistant";
  const text = messageToPlainText(message);
  const hasContent = Boolean(text.trim());

  const contentClasses = isAssistant ? "w-full" : "ml-auto max-w-[65%]";

  return (
    <Message from={message.role}>
      <MessageContent
        variant={isAssistant ? "flat" : "contained"}
        className={contentClasses}
      >
        {isAssistant ? (
          hasContent ? <Response>{text}</Response> : <span className="text-muted-foreground">Waiting for response…</span>
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
  );
}

function computeExcerpt(value: string): string {
  if (!value) {
    return "";
  }
  const normalized = value.replace(/\r\n/g, "\n");
  if (normalized.length <= MAX_EXCERPT_CHARS) {
    return normalized;
  }
  return normalized.slice(0, MAX_EXCERPT_CHARS);
}

function computeDigest(value: string): string | null {
  if (!value) {
    return null;
  }
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return `${value.length}:${(hash >>> 0).toString(16)}`;
}

function messageToPlainText(message: UIMessage): string {
  return message.parts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }
      if (part.type === "reasoning" && part.text) {
        return part.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function StickToBottomWatcher({ onContext }: { onContext: (ctx: StickContext) => void }) {
  const context = useStickToBottomContext();

  useEffect(() => {
    if (!context) {
      return;
    }

    const update = () => {
      onContext(context);
    };

    update();

    const scrollElement = context.scrollRef.current;
    scrollElement?.addEventListener("scroll", update, { passive: true });

    const contentElement = context.contentRef.current;
    let observer: MutationObserver | null = null;
    if (contentElement) {
      observer = new MutationObserver(update);
      observer.observe(contentElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      scrollElement?.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [context, onContext]);

  return null;
}
