"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, type UIMessage } from "ai";
import { ArrowDownLeft, BrainCircuit, Check, ChevronDown, Copy, Eye, File, FileText, ImageIcon, Loader2, Paperclip, RefreshCcw, Search, SendHorizontal, SlidersHorizontal, Square, Wrench, X } from "lucide-react";

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useEditorStore } from "@/stores/editor";
import { useChatStore } from "@/stores/chat";

const MAX_EXCERPT_CHARS = 6_000;
const MODELS_CACHE_STORAGE_KEY = "sidebar-chat-models-cache-v1";
const MODELS_CACHE_TTL_MS = 12 * 60 * 60 * 1_000;

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

type ModelFeatureIcon = {
  tag: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

type CachedModelsState = {
  availableModels: GatewayLanguageModelOption[];
  gatewayDefaultModel: string;
  cachedAt: number;
};

export type SidebarChatHandle = {
  clearChat: () => void;
};

type SidebarChatProps = {
  onNewChatRef?: (handle: SidebarChatHandle | null) => void;
};

const MODEL_FEATURE_ICONS: ModelFeatureIcon[] = [
  { tag: "vision", label: "Vision", Icon: Eye },
  { tag: "tool-use", label: "Tool use", Icon: Wrench },
  { tag: "reasoning", label: "Reasoning", Icon: BrainCircuit },
  { tag: "image-generation", label: "Image generation", Icon: ImageIcon },
  { tag: "file-input", label: "File input", Icon: FileText },
];

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
let sharedModelsState: CachedModelsState | null = null;
let sharedModelsPromise: Promise<CachedModelsState> | null = null;

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

function isModelsCacheFresh(value: CachedModelsState): boolean {
  return Date.now() - value.cachedAt <= MODELS_CACHE_TTL_MS;
}

function buildCachedModelsState(payload: GatewayModelsResponse): CachedModelsState {
  const models = normalizeAvailableModels(payload.models);
  const normalizedDefault = parseModelId(payload.defaultModel) || DEFAULT_CHAT_MODEL;
  return {
    availableModels: models.length > 0 ? models : FALLBACK_LANGUAGE_MODELS,
    gatewayDefaultModel: normalizedDefault,
    cachedAt: Date.now(),
  };
}

function readModelsStateFromStorage(): CachedModelsState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(MODELS_CACHE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      availableModels?: GatewayLanguageModelOption[];
      gatewayDefaultModel?: string;
      cachedAt?: number;
    };
    if (!parsed || typeof parsed.cachedAt !== "number") {
      return null;
    }

    const normalizedModels = normalizeAvailableModels(parsed.availableModels);
    const gatewayDefaultModel = parseModelId(parsed.gatewayDefaultModel) || DEFAULT_CHAT_MODEL;
    return {
      availableModels: normalizedModels.length > 0 ? normalizedModels : FALLBACK_LANGUAGE_MODELS,
      gatewayDefaultModel,
      cachedAt: parsed.cachedAt,
    };
  } catch {
    return null;
  }
}

function writeModelsStateToStorage(value: CachedModelsState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(MODELS_CACHE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage errors (quota/private mode).
  }
}

async function loadModelsState(): Promise<CachedModelsState> {
  if (sharedModelsState && isModelsCacheFresh(sharedModelsState)) {
    return sharedModelsState;
  }

  const stored = readModelsStateFromStorage();
  if (stored && isModelsCacheFresh(stored)) {
    sharedModelsState = stored;
    return stored;
  }

  if (sharedModelsPromise) {
    return sharedModelsPromise;
  }

  sharedModelsPromise = (async () => {
    const response = await fetch("/api/ai/models");
    if (!response.ok) {
      throw new Error(`Failed to load models (${response.status})`);
    }
    const payload = (await response.json()) as GatewayModelsResponse;
    const nextState = buildCachedModelsState(payload);
    sharedModelsState = nextState;
    writeModelsStateToStorage(nextState);
    return nextState;
  })();

  try {
    return await sharedModelsPromise;
  } finally {
    sharedModelsPromise = null;
  }
}

export function SidebarChat({ onNewChatRef }: SidebarChatProps) {
  const isMobile = useIsMobile();
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
  const [availableModels, setAvailableModels] = useState<GatewayLanguageModelOption[]>(
    sharedModelsState?.availableModels ?? FALLBACK_LANGUAGE_MODELS,
  );
  const [gatewayDefaultModel, setGatewayDefaultModel] = useState(
    sharedModelsState?.gatewayDefaultModel ?? DEFAULT_CHAT_MODEL,
  );
  const [modelsLoading, setModelsLoading] = useState(() => sharedModelsState === null);
  const [modelSelectOpen, setModelSelectOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [featureFilter, setFeatureFilter] = useState<string>("all");
  const [showModelFilters, setShowModelFilters] = useState(false);
  const chatSession = useSyncExternalStore(
    subscribeSharedChatSession,
    getSharedChatSession,
    getSharedChatSession,
  );
  const sidebarChatRootRef = useRef<HTMLDivElement>(null);
  const modelSearchInputRef = useRef<HTMLInputElement>(null);
  const providerFiltersScrollRef = useRef<HTMLDivElement>(null);
  const [modelSelectPortalContainer, setModelSelectPortalContainer] = useState<HTMLElement | null>(null);
  const composerContainerRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);

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
    let active = true;

    const loadModels = async () => {
      try {
        const state = await loadModelsState();
        if (!active) {
          return;
        }

        setAvailableModels(state.availableModels);
        setGatewayDefaultModel(state.gatewayDefaultModel);
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("Failed to fetch AI Gateway models", error);
        setAvailableModels(FALLBACK_LANGUAGE_MODELS);
        setGatewayDefaultModel(DEFAULT_CHAT_MODEL);
      } finally {
        if (active) {
          setModelsLoading(false);
        }
      }
    };

    void loadModels();

    return () => {
      active = false;
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
  const featureOptions = useMemo(() => {
    const availableTags = new Set<string>();
    for (const model of availableModels) {
      for (const tag of deriveModelFeatureTags(model)) {
        availableTags.add(tag);
      }
    }
    return MODEL_FEATURE_ICONS.filter((feature) => availableTags.has(feature.tag));
  }, [availableModels]);
  const hasActiveFilters = providerFilter !== "all" || featureFilter !== "all";
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
          const featureTags = deriveModelFeatureTags(model);
          const featureMatch = featureFilter === "all" || featureTags.has(featureFilter);
          return providerMatch && featureMatch && matchesQuery(model);
        }),
      }))
      .filter((group) => group.models.length > 0);
  }, [modelGroups, modelSearchQuery, providerFilter, featureFilter]);
  const selectedModelName = useMemo(
    () => availableModels.find((model) => model.id === selectedModel)?.name ?? selectedModel,
    [availableModels, selectedModel],
  );

  useEffect(() => {
    if (providerFilter === "all") {
      return;
    }
    if (!providerOptions.includes(providerFilter)) {
      setProviderFilter("all");
    }
  }, [providerFilter, providerOptions]);

  useEffect(() => {
    if (featureFilter === "all") {
      return;
    }
    if (!featureOptions.some((feature) => feature.tag === featureFilter)) {
      setFeatureFilter("all");
    }
  }, [featureFilter, featureOptions]);

  useEffect(() => {
    if (!modelSelectOpen) {
      setModelSearchQuery("");
      setProviderFilter("all");
      setFeatureFilter("all");
      setShowModelFilters(false);
      return;
    }
    // Avoid force-focusing on touch devices, which can trigger keyboard-driven dismissals.
    const usesCoarsePointer = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    if (isMobile || usesCoarsePointer) {
      return;
    }
    const frameId = requestAnimationFrame(() => {
      modelSearchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frameId);
  }, [isMobile, modelSelectOpen]);

  useEffect(() => {
    const root = sidebarChatRootRef.current;
    if (!root) {
      setModelSelectPortalContainer(null);
      return;
    }
    const sheetContent = root.closest("[data-slot='sheet-content']");
    setModelSelectPortalContainer(
      sheetContent instanceof HTMLElement ? sheetContent : null,
    );
  }, [isMobile]);

  const ensureComposerVisible = useCallback(() => {
    requestAnimationFrame(() => {
      composerContainerRef.current?.scrollIntoView({
        block: "end",
      });
    });
  }, []);

  const handleProviderFiltersWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (isMobile) {
      return;
    }
    const element = event.currentTarget;
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    if (maxScrollLeft <= 0) {
      return;
    }
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }
    const nextScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(0, element.scrollLeft + event.deltaY),
    );
    if (nextScrollLeft !== element.scrollLeft) {
      if (event.cancelable) {
        event.preventDefault();
      }
      element.scrollLeft = nextScrollLeft;
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || typeof window === "undefined" || !window.visualViewport) {
      return;
    }
    const viewport = window.visualViewport;
    const handleViewportChange = () => {
      if (document.activeElement !== composerInputRef.current) {
        return;
      }
      ensureComposerVisible();
    };
    viewport.addEventListener("resize", handleViewportChange);
    viewport.addEventListener("scroll", handleViewportChange);
    return () => {
      viewport.removeEventListener("resize", handleViewportChange);
      viewport.removeEventListener("scroll", handleViewportChange);
    };
  }, [ensureComposerVisible, isMobile]);

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
    <div ref={sidebarChatRootRef} className="flex h-full flex-col text-[13px]">
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
      <div ref={composerContainerRef} className="shrink-0 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
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
              ref={composerInputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (isMobile) {
                  ensureComposerVisible();
                }
              }}
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

              <Popover open={modelSelectOpen} onOpenChange={setModelSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 gap-1 border-border/40 bg-background/80 px-2 text-xs font-normal text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  >
                    <span className="max-w-[140px] truncate">{selectedModelName}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align={isMobile ? "center" : "start"}
                  side="top"
                  sideOffset={8}
                  avoidCollisions
                  collisionPadding={8}
                  className="w-[min(24rem,calc(100vw-2rem))] max-h-[min(70dvh,460px)] overflow-hidden p-0"
                  container={modelSelectPortalContainer ?? undefined}
                >
                  <div className="border-b bg-popover px-2 py-1.5">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5">
                      <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          ref={modelSearchInputRef}
                          type="text"
                          placeholder="Search models..."
                          value={modelSearchQuery}
                          onChange={(event) => setModelSearchQuery(event.target.value)}
                          className="h-8 border-border/60 bg-background pl-7 pr-7 text-xs"
                        />
                        {modelSearchQuery ? (
                          <button
                            type="button"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            onClick={() => setModelSearchQuery("")}
                            aria-label="Clear model search"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                      {providerOptions.length > 1 || featureOptions.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setShowModelFilters((current) => !current)}
                          className={cn(
                            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                            hasActiveFilters
                              ? "border-primary/50 bg-primary/10 text-foreground hover:bg-primary/15"
                              : "border-border/60 bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                          )}
                          aria-label="Toggle model filters"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                    {(providerOptions.length > 1 || featureOptions.length > 0) && showModelFilters ? (
                      <div className="mt-1.5 space-y-1.5">
                        {providerOptions.length > 1 ? (
                          <div
                            ref={providerFiltersScrollRef}
                            onWheel={handleProviderFiltersWheel}
                            className={cn(
                              "w-full overflow-x-auto overflow-y-hidden pb-1 pr-1",
                              isMobile
                                ? "[scrollbar-width:none] [-ms-overflow-style:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
                                : "[scrollbar-width:thin] [touch-action:auto] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80 [&::-webkit-scrollbar-track]:bg-transparent",
                            )}
                          >
                            <div className="flex w-max min-w-full gap-1">
                              <button
                                type="button"
                                onClick={() => setProviderFilter("all")}
                                className={cn(
                                  "shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                                  providerFilter === "all"
                                    ? "border-primary/50 bg-primary/10 text-foreground"
                                    : "border-border/60 bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                                )}
                              >
                                All providers
                              </button>
                              {providerOptions.map((provider) => (
                                <button
                                  key={provider}
                                  type="button"
                                  onClick={() => setProviderFilter(provider)}
                                  className={cn(
                                    "max-w-[140px] shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                                    providerFilter === provider
                                      ? "border-primary/50 bg-primary/10 text-foreground"
                                      : "border-border/60 bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                                  )}
                                >
                                  <span className="block truncate">{toProviderLabel(provider)}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {featureOptions.length > 0 ? (
                          <div
                            onWheel={handleProviderFiltersWheel}
                            className={cn(
                              "w-full overflow-x-auto overflow-y-hidden pb-1 pr-1",
                              isMobile
                                ? "[scrollbar-width:none] [-ms-overflow-style:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
                                : "[scrollbar-width:thin] [touch-action:auto] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80 [&::-webkit-scrollbar-track]:bg-transparent",
                            )}
                          >
                            <div className="flex w-max min-w-full gap-1">
                              <button
                                type="button"
                                onClick={() => setFeatureFilter("all")}
                                className={cn(
                                  "shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                                  featureFilter === "all"
                                    ? "border-primary/50 bg-primary/10 text-foreground"
                                    : "border-border/60 bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                                )}
                              >
                                Any feature
                              </button>
                              {featureOptions.map((feature) => (
                                <button
                                  key={feature.tag}
                                  type="button"
                                  onClick={() => setFeatureFilter(feature.tag)}
                                  className={cn(
                                    "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                                    featureFilter === feature.tag
                                      ? "border-primary/50 bg-primary/10 text-foreground"
                                      : "border-border/60 bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                                  )}
                                >
                                  <feature.Icon className="h-3 w-3" />
                                  <span>{feature.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="max-h-[min(62dvh,420px)] overflow-y-auto px-1 pb-1">
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
                        {group.models.map((model) => {
                          const isSelected = model.id === selectedModel;
                          const features = getModelFeatureIcons(model);
                          return (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() => {
                                setSelectedModel(model.id);
                                setModelSelectOpen(false);
                              }}
                              className={cn(
                                "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors",
                                isSelected
                                  ? "bg-accent text-accent-foreground"
                                  : "text-foreground hover:bg-accent/80",
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate">{model.name}</span>
                              <span className="flex shrink-0 items-center gap-1">
                                {features.length > 0 ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-1.5 py-0.5 text-muted-foreground">
                                    {features.map((feature) => (
                                      <span key={`${model.id}-${feature.tag}`} className="inline-flex" title={feature.label}>
                                        <feature.Icon className="h-3 w-3" aria-hidden="true" />
                                        <span className="sr-only">{feature.label}</span>
                                      </span>
                                    ))}
                                  </span>
                                ) : null}
                                {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
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

function getModelFeatureIcons(model: GatewayLanguageModelOption): ModelFeatureIcon[] {
  const featureTags = deriveModelFeatureTags(model);
  return MODEL_FEATURE_ICONS.filter((feature) => featureTags.has(feature.tag));
}

function deriveModelFeatureTags(model: GatewayLanguageModelOption): Set<string> {
  const tags = new Set(
    (Array.isArray(model.tags) ? model.tags : [])
      .map((tag) => normalizeFeatureTag(tag))
      .filter(Boolean),
  );

  const description = (model.description || "").toLowerCase();
  if (!description) {
    return tags;
  }

  if (description.includes("vision")) {
    tags.add("vision");
  }
  if (description.includes("reasoning")) {
    tags.add("reasoning");
  }
  if (description.includes("tool")) {
    tags.add("tool-use");
  }
  if (description.includes("image generation") || description.includes("image-generation")) {
    tags.add("image-generation");
  }
  if (description.includes("file input") || description.includes("file-input")) {
    tags.add("file-input");
  }

  return tags;
}

function normalizeFeatureTag(value: string): string {
  return value.toLowerCase().trim();
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
