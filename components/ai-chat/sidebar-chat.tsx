"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, type UIMessage } from "ai";
import { ArrowDownLeft, Copy, File, Loader2, Paperclip, RefreshCcw, Search, SendHorizontal, SlidersHorizontal, Square, X } from "lucide-react";

import { DEFAULT_CHAT_MODEL, FALLBACK_LANGUAGE_MODELS, parseModelId, type GatewayLanguageModelOption } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  type ConversationHandle,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEditorStore } from "@/stores/editor";
import { useChatStore } from "@/stores/chat";

const MAX_EXCERPT_CHARS = 6_000;

type GatewayModelsResponse = {
  defaultModel?: string;
  source?: "gateway" | "fallback";
  models?: GatewayLanguageModelOption[];
};

type FilePayload = {
  key: string;
  contentDigest: string | null;
  excerpt: string | null;
};

type ModelGroup = {
  provider: string;
  models: GatewayLanguageModelOption[];
};

export type SidebarChatHandle = {
  clearChat: () => void;
};

type SidebarChatProps = {
  onNewChatRef?: (handle: SidebarChatHandle | null) => void;
};

// Create stable transport and chat instances outside the component
// This ensures they persist across component remounts
const latestContextRef: { current: { file: FilePayload | null; model: string } } = {
  current: { file: null, model: DEFAULT_CHAT_MODEL },
};

const globalTransport = new TextStreamChatTransport<UIMessage>({
  api: "/api/ai/chat",
  credentials: "same-origin",
  prepareSendMessagesRequest: ({ body, messages }) => ({
    body: {
      ...(body ?? {}),
      messages,
      file: latestContextRef.current.file,
      model: latestContextRef.current.model,
    },
  }),
});

function createChatSession(): Chat<UIMessage> {
  return new Chat<UIMessage>({
    id: `vault-sidebar-chat-${createChatSessionId()}`,
    transport: globalTransport,
  });
}

function createChatSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

let sharedChatSession = createChatSession();
const sharedChatSessionSubscribers = new Set<() => void>();

function getSharedChatSession(): Chat<UIMessage> {
  return sharedChatSession;
}

function subscribeSharedChatSession(callback: () => void): () => void {
  sharedChatSessionSubscribers.add(callback);
  return () => {
    sharedChatSessionSubscribers.delete(callback);
  };
}

function resetSharedChatSession() {
  sharedChatSession = createChatSession();
  for (const callback of sharedChatSessionSubscribers) {
    callback();
  }
}

export function SidebarChat({ onNewChatRef }: SidebarChatProps) {
  const fileKey = useEditorStore((state) => state.fileKey);
  const editorStatus = useEditorStore((state) => state.status);
  const content = useEditorStore((state) => state.content);
  const applyAiResult = useEditorStore((state) => state.applyAiResult);
  const { toast } = useToast();

  // Use global store for chat state persistence
  const contextFile = useChatStore((state) => state.contextFile);
  const setContextFile = useChatStore((state) => state.setContextFile);
  const selectedModel = useChatStore((state) => state.selectedModel);
  const setSelectedModel = useChatStore((state) => state.setSelectedModel);
  const draft = useChatStore((state) => state.draft);
  const setDraft = useChatStore((state) => state.setDraft);
  const [availableModels, setAvailableModels] = useState<GatewayLanguageModelOption[]>(FALLBACK_LANGUAGE_MODELS);
  const [gatewayDefaultModel, setGatewayDefaultModel] = useState(DEFAULT_CHAT_MODEL);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelSelectOpen, setModelSelectOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [showProviderFilters, setShowProviderFilters] = useState(false);
  const chatSession = useSyncExternalStore(
    subscribeSharedChatSession,
    getSharedChatSession,
    getSharedChatSession,
  );
  const modelSearchInputRef = useRef<HTMLInputElement>(null);

  // Ref to conversation for scroll control
  const conversationRef = useRef<ConversationHandle>(null);

  // Ref to the last user message element for scroll positioning
  const lastUserMessageRef = useRef<HTMLDivElement>(null);

  // Track whether we should auto-scroll (only when user sends a new message)
  const shouldAutoScrollRef = useRef(false);
  // Track last message count to detect new user messages
  const lastMessageCountRef = useRef(0);

  const excerpt = useMemo(() => computeExcerpt(content), [content]);
  const digest = useMemo(() => computeDigest(content), [content]);

  useEffect(() => {
    const abortController = new AbortController();
    let mounted = true;

    const loadModels = async () => {
      try {
        const response = await fetch("/api/ai/models", {
          cache: "no-store",
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load models (${response.status})`);
        }

        const payload = (await response.json()) as GatewayModelsResponse;
        const models = normalizeAvailableModels(payload.models);
        const normalizedDefault = parseModelId(payload.defaultModel) || DEFAULT_CHAT_MODEL;

        if (!mounted) {
          return;
        }

        setAvailableModels(models.length > 0 ? models : FALLBACK_LANGUAGE_MODELS);
        setGatewayDefaultModel(normalizedDefault);
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Failed to fetch AI Gateway models", error);
        setAvailableModels(FALLBACK_LANGUAGE_MODELS);
        setGatewayDefaultModel(DEFAULT_CHAT_MODEL);
      } finally {
        if (mounted) {
          setModelsLoading(false);
        }
      }
    };

    void loadModels();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    if (modelsLoading) {
      return;
    }

    if (availableModels.some((model) => model.id === selectedModel)) {
      return;
    }

    const fallback = resolveDefaultModel(availableModels, gatewayDefaultModel);
    if (fallback !== selectedModel) {
      setSelectedModel(fallback);
    }
  }, [modelsLoading, availableModels, gatewayDefaultModel, selectedModel, setSelectedModel]);

  // Update context file when a new file is opened (but keep chat session)
  useEffect(() => {
    if (fileKey) {
      setContextFile(fileKey);
    }
  }, [fileKey, setContextFile]);

  const filePayload = useMemo<FilePayload | null>(() => {
    if (!contextFile) {
      return null;
    }
    return {
      key: contextFile,
      contentDigest: digest,
      excerpt: excerpt.length ? excerpt : null,
    };
  }, [contextFile, digest, excerpt]);

  const modelGroups = useMemo(() => groupModelsByProvider(availableModels), [availableModels]);
  const providerOptions = useMemo(
    () => modelGroups.map((group) => group.provider),
    [modelGroups],
  );
  const filteredModelGroups = useMemo(() => {
    const normalizedQuery = modelSearchQuery.trim().toLowerCase();
    const matchesQuery = (model: GatewayLanguageModelOption) => {
      if (!normalizedQuery) {
        return true;
      }
      const providerLabel = toProviderLabel(model.provider).toLowerCase();
      return (
        model.name.toLowerCase().includes(normalizedQuery) ||
        model.id.toLowerCase().includes(normalizedQuery) ||
        providerLabel.includes(normalizedQuery)
      );
    };

    return modelGroups
      .map((group) => ({
        provider: group.provider,
        models: group.models.filter((model) => {
          const providerMatch = providerFilter === "all" || group.provider === providerFilter;
          return providerMatch && matchesQuery(model);
        }),
      }))
      .filter((group) => group.models.length > 0);
  }, [modelGroups, modelSearchQuery, providerFilter]);

  useEffect(() => {
    if (providerFilter === "all") {
      return;
    }
    if (!providerOptions.includes(providerFilter)) {
      setProviderFilter("all");
    }
  }, [providerFilter, providerOptions]);

  useEffect(() => {
    if (!modelSelectOpen) {
      setModelSearchQuery("");
      setProviderFilter("all");
      setShowProviderFilters(false);
      return;
    }
    requestAnimationFrame(() => {
      modelSearchInputRef.current?.focus();
    });
  }, [modelSelectOpen]);

  // Keep the global context ref updated
  useEffect(() => {
    latestContextRef.current = {
      file: filePayload,
      model: selectedModel,
    };
  }, [filePayload, selectedModel]);

  // Use a dedicated chat session instance that can be rotated for "New Chat".
  const { messages, sendMessage, stop, regenerate, status, error, clearError, setMessages } = useChat({
    chat: chatSession,
  });

  const [copyingId, setCopyingId] = useState<string | null>(null);

  // Clear chat function exposed to parent
  const clearChat = useCallback(() => {
    void stop().catch((stopError) => {
      console.error("Failed to stop chat stream", stopError);
    });
    clearError();
    setDraft("");
    setCopyingId(null);
    setMessages([]);
    resetSharedChatSession();
    shouldAutoScrollRef.current = false;
    lastMessageCountRef.current = 0;
    conversationRef.current?.setScrollPosition(0);
  }, [clearError, setDraft, setMessages, stop]);

  // Expose clearChat via callback
  useEffect(() => {
    onNewChatRef?.({ clearChat });
    return () => {
      onNewChatRef?.(null);
    };
  }, [clearChat, onNewChatRef]);

  const isStreaming = status === "submitted" || status === "streaming";
  const canChat = editorStatus !== "loading";

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role === "assistant" || message.role === "user"),
    [messages],
  );

  const lastAssistant = useMemo(
    () => [...visibleMessages].reverse().find((message) => message.role === "assistant"),
    [visibleMessages],
  );

  const streamingMessageId = isStreaming ? lastAssistant?.id ?? null : null;

  // Find the last user message id for scroll targeting
  const lastUserMessageId = useMemo(() => {
    const reversed = [...visibleMessages].reverse();
    return reversed.find((m) => m.role === "user")?.id ?? null;
  }, [visibleMessages]);

  // Detect when user sends a new message to enable auto-scroll
  useEffect(() => {
    const userMessages = visibleMessages.filter((m) => m.role === "user");
    if (userMessages.length > lastMessageCountRef.current) {
      // New user message was added, enable auto-scroll
      shouldAutoScrollRef.current = true;

      // Immediately scroll the user message into view at the top
      requestAnimationFrame(() => {
        if (lastUserMessageRef.current) {
          // Mark as programmatic scroll to preserve user's scroll position
          conversationRef.current?.markProgrammaticScroll();
          lastUserMessageRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      });
    }
    lastMessageCountRef.current = userMessages.length;
  }, [visibleMessages]);

  // Disable auto-scroll when streaming ends
  useEffect(() => {
    if (!isStreaming) {
      shouldAutoScrollRef.current = false;
    }
  }, [isStreaming]);

  // Periodic scroll adjustment during streaming to keep user message at top
  useEffect(() => {
    if (!isStreaming || !shouldAutoScrollRef.current) {
      return;
    }

    const container = document.querySelector('[role="log"]') as HTMLElement;
    if (!container) return;

    let lastScrollTop = container.scrollTop;

    const handleScroll = () => {
      // If user scrolled up manually, disable auto-scroll
      if (container.scrollTop < lastScrollTop - 20) {
        shouldAutoScrollRef.current = false;
      }
      lastScrollTop = container.scrollTop;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    // Scroll check interval - less frequent for performance
    const intervalId = setInterval(() => {
      if (!shouldAutoScrollRef.current || !lastUserMessageRef.current) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const messageRect = lastUserMessageRef.current.getBoundingClientRect();
      const messageTop = messageRect.top - containerRect.top;

      // If user message has drifted down more than 20px, scroll it back to top
      if (messageTop > 20) {
        // Mark as programmatic scroll
        conversationRef.current?.markProgrammaticScroll();
        lastUserMessageRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }, 500); // Check every 500ms instead of every frame

    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearInterval(intervalId);
    };
  }, [isStreaming, streamingMessageId]);

  const handleSubmit = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const text = draft.trim();
      if (!text || !canChat) {
        return;
      }
      clearError();
      setDraft("");
      await sendMessage({ text });
      // Scroll will be handled by the streaming effect
    },
    [canChat, clearError, draft, sendMessage, setDraft],
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

  // Extract filename from path for display
  const contextFileName = useMemo(() => {
    if (!contextFile) return null;
    const parts = contextFile.split("/");
    return parts[parts.length - 1] || contextFile;
  }, [contextFile]);

  const handleRemoveContext = useCallback(() => {
    setContextFile(null);
  }, [setContextFile]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="flex h-full flex-col text-[13px]">
      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 mx-3 mt-2 text-xs text-destructive">
          <div className="flex items-center justify-between gap-3">
            <span>{error.message}</span>
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => clearError()}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      {/* Conversation area */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Conversation
          ref={conversationRef}
          className="absolute inset-0"
        >
          <ConversationContent className={cn("space-y-2 pb-6", hasMessages ? "pt-2" : "pt-4")}>
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
                  ref={message.id === lastUserMessageId ? lastUserMessageRef : undefined}
                />
              ))
            ) : (
              <ConversationEmptyState>
                <div className="flex flex-col items-center gap-3 text-center px-4">
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm">How can I help you today?</h3>
                    <p className="text-muted-foreground text-xs">
                      {contextFile
                        ? "Ask me anything about this file or get help with your writing."
                        : "Open a file to get contextual assistance, or just chat."}
                    </p>
                  </div>
                  {canChat ? (
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs rounded-full bg-background hover:bg-accent"
                        onClick={() => void sendMessage({ text: "Summarize this note" })}
                        disabled={!contextFile}
                      >
                        Summarize
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs rounded-full bg-background hover:bg-accent"
                        onClick={() => void sendMessage({ text: "Find related notes" })}
                        disabled={!contextFile}
                      >
                        Related notes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs rounded-full bg-background hover:bg-accent"
                        onClick={() => void sendMessage({ text: "Generate action items" })}
                        disabled={!contextFile}
                      >
                        Action items
                      </Button>
                    </div>
                  ) : null}
                </div>
              </ConversationEmptyState>
            )}
          </ConversationContent>
        </Conversation>
      </div>

      {/* ChatGPT-style input area */}
      <div className="shrink-0 px-3 pb-3">
        <div className="rounded-xl border border-border/60 bg-muted/40">
          {/* Top section: Context file chip */}
          {contextFile ? (
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 border border-border/40 text-xs text-muted-foreground">
                <File className="h-3 w-3" />
                <span className="max-w-[150px] truncate">{contextFileName}</span>
                <button
                  type="button"
                  onClick={handleRemoveContext}
                  className="ml-0.5 rounded-sm hover:bg-accent/60 p-0.5 transition-colors"
                  aria-label="Remove context file"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : null}

          {/* Middle section: Textarea */}
          <div className="px-3 py-1.5">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={composerDisabled}
              className="min-h-[36px] max-h-[120px] resize-none border-0 bg-transparent p-0 text-sm shadow-none ring-0 outline-none placeholder:text-muted-foreground/60 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={1}
            />
          </div>

          {/* Bottom section: Attachments, model selector, send button */}
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    disabled
                    aria-label="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Attach file (coming soon)</TooltipContent>
              </Tooltip>

              <Select value={selectedModel} onValueChange={setSelectedModel} open={modelSelectOpen} onOpenChange={setModelSelectOpen}>
                <SelectTrigger className="h-7 w-auto gap-1 border border-border/40 rounded-md bg-background/80 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 focus:ring-0 [&>svg]:opacity-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" className="w-[19rem] max-h-[420px]">
                  <div className="sticky top-0 z-10 -mx-1 -mt-1 mb-1 border-b bg-popover/95 px-2 pt-2 pb-2 backdrop-blur">
                    <div className="flex items-center gap-1.5">
                      <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          ref={modelSearchInputRef}
                          type="text"
                          placeholder="Search models..."
                          value={modelSearchQuery}
                          onChange={(event) => setModelSearchQuery(event.target.value)}
                          onKeyDown={(event) => event.stopPropagation()}
                          className="h-8 border-border/60 bg-background pl-7 pr-7 text-xs"
                        />
                        {modelSearchQuery ? (
                          <button
                            type="button"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setModelSearchQuery("")}
                            aria-label="Clear model search"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                      {providerOptions.length > 1 ? (
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setShowProviderFilters((current) => !current)}
                          className={cn(
                            "inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors",
                            providerFilter === "all"
                              ? "border-border/60 bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                              : "border-primary/50 bg-primary/10 text-foreground hover:bg-primary/15",
                          )}
                          aria-label="Toggle provider filters"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          <span className="max-w-[78px] truncate">
                            {providerFilter === "all" ? "All" : toProviderLabel(providerFilter)}
                          </span>
                        </button>
                      ) : null}
                    </div>
                    {providerOptions.length > 1 && showProviderFilters ? (
                      <div className="mt-1.5 flex gap-1 overflow-x-auto pb-1">
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setProviderFilter("all")}
                          className={cn(
                            "shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                            providerFilter === "all"
                              ? "border-primary/50 bg-primary/10 text-foreground"
                              : "border-border/60 bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                          )}
                        >
                          All
                        </button>
                        {providerOptions.map((provider) => (
                          <button
                            key={provider}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setProviderFilter(provider)}
                            className={cn(
                              "shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                              providerFilter === provider
                                ? "border-primary/50 bg-primary/10 text-foreground"
                                : "border-border/60 bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                            )}
                          >
                            {toProviderLabel(provider)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {modelsLoading ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Loading models...</div>
                  ) : null}
                  {!modelsLoading && filteredModelGroups.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      No models match your filters.
                    </div>
                  ) : null}
                  {!modelsLoading && modelGroups.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No models available</div>
                  ) : null}
                  {filteredModelGroups.map((group, groupIndex) => (
                    <div key={group.provider}>
                      {groupIndex > 0 && <div className="my-1 h-px bg-border" />}
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {toProviderLabel(group.provider)}
                      </div>
                      {group.models.map((model) => (
                        <SelectItem key={model.id} value={model.id} className="text-xs">
                          {model.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              size="icon"
              variant={draft.trim() ? "default" : "ghost"}
              className={cn(
                "h-8 w-8 rounded-lg transition-colors",
                draft.trim() ? "" : "text-muted-foreground"
              )}
              onClick={isStreaming ? handleStop : () => void handleSubmit()}
              disabled={isStreaming ? false : composerDisabled || !draft.trim()}
            >
              {isStreaming ? (
                <Square className="h-4 w-4" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
              <span className="sr-only">{isStreaming ? "Stop" : "Send"}</span>
            </Button>
          </div>
        </div>
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

const ChatMessageRow = forwardRef<HTMLDivElement, ChatMessageRowProps>(
  function ChatMessageRow(
    { message, streaming, copying, onCopy, onInsert, onRegenerate, canRegenerate },
    ref
  ) {
    const isAssistant = message.role === "assistant";
    const text = messageToPlainText(message);
    const hasContent = Boolean(text.trim());

    const contentClasses = isAssistant ? "w-full" : "ml-auto max-w-[65%]";

    return (
      <div ref={ref}>
        <Message from={message.role} data-role={message.role}>
          <MessageContent
            variant={isAssistant ? "flat" : "contained"}
            className={contentClasses}
          >
            {isAssistant ? (
              hasContent ? <Response compact>{text}</Response> : <span className="text-muted-foreground">Waiting for response…</span>
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

function normalizeAvailableModels(models: GatewayModelsResponse["models"]): GatewayLanguageModelOption[] {
  if (!Array.isArray(models)) {
    return [];
  }

  const deduped = new Map<string, GatewayLanguageModelOption>();
  for (const model of models) {
    if (!model || model.type !== "language" || !parseModelId(model.id)) {
      continue;
    }
    if (!deduped.has(model.id)) {
      deduped.set(model.id, model);
    }
  }

  return [...deduped.values()].sort((left, right) => {
    const byProvider = left.provider.localeCompare(right.provider, undefined, { sensitivity: "base" });
    if (byProvider !== 0) {
      return byProvider;
    }
    return left.name.localeCompare(right.name, undefined, { sensitivity: "base", numeric: true });
  });
}

function resolveDefaultModel(models: GatewayLanguageModelOption[], preferredModel: string): string {
  if (models.some((model) => model.id === preferredModel)) {
    return preferredModel;
  }
  if (models.some((model) => model.id === DEFAULT_CHAT_MODEL)) {
    return DEFAULT_CHAT_MODEL;
  }
  if (models.length > 0) {
    return models[0].id;
  }
  return DEFAULT_CHAT_MODEL;
}

function groupModelsByProvider(
  models: GatewayLanguageModelOption[],
): ModelGroup[] {
  const grouped = new Map<string, GatewayLanguageModelOption[]>();

  for (const model of models) {
    const provider = model.provider || "unknown";
    const group = grouped.get(provider) || [];
    group.push(model);
    grouped.set(provider, group);
  }

  return [...grouped.entries()].map(([provider, providerModels]) => ({
    provider,
    models: providerModels,
  }));
}

function toProviderLabel(provider: string): string {
  if (!provider) {
    return "Unknown";
  }
  const normalized = provider.toLowerCase();
  if (normalized === "openai") {
    return "OpenAI";
  }
  if (normalized === "xai") {
    return "xAI";
  }
  return provider.charAt(0).toUpperCase() + provider.slice(1);
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
