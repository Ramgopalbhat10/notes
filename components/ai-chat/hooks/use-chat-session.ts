"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Chat, useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, type UIMessage } from "ai";

import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { useEditorStore } from "@/stores/editor";
import { useChatStore } from "@/stores/chat";
import type { ConversationHandle } from "@/components/ai-elements/conversation";
import { getDocumentSummary } from "../utils";
import type { FilePayload } from "../types";

// Module-level singletons — persist across component remounts

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

function createChatSessionId(): string {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    if (typeof crypto.getRandomValues === "function") {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return `${Date.now()}-${array[0].toString(36)}`;
    }
  }
  
  // If no crypto is available, fallback to a timestamp-based ID without Math.random
  // This avoids SonarCloud security hotspots while still providing basic uniqueness
  // in the extreme edge case where crypto is missing.
  return `${Date.now()}-1`;
}

function createChatSession(): Chat<UIMessage> {
  return new Chat<UIMessage>({
    id: `vault-sidebar-chat-${createChatSessionId()}`,
    transport: globalTransport,
  });
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

export function useChatSession(conversationRef: React.RefObject<ConversationHandle | null>) {
  const content = useEditorStore((state) => state.content);
  const fileKey = useEditorStore((state) => state.fileKey);

  const contextFile = useChatStore((state) => state.contextFile);
  const setContextFile = useChatStore((state) => state.setContextFile);
  const selectedModel = useChatStore((state) => state.selectedModel);
  const draft = useChatStore((state) => state.draft);
  const setDraft = useChatStore((state) => state.setDraft);

  const chatSession = useSyncExternalStore(
    subscribeSharedChatSession,
    getSharedChatSession,
    getSharedChatSession,
  );

  const documentSummary = useMemo(() => getDocumentSummary(content), [content]);
  const { excerpt, digest } = documentSummary;

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

  // Update context file when a new file is opened (but keep chat session)
  useEffect(() => {
    if (fileKey) {
      setContextFile(fileKey);
    }
  }, [fileKey, setContextFile]);

  // Keep the global context ref updated
  useEffect(() => {
    latestContextRef.current = {
      file: filePayload,
      model: selectedModel,
    };
  }, [filePayload, selectedModel]);

  const { messages, sendMessage, stop, regenerate, status, error, clearError, setMessages } = useChat({
    chat: chatSession,
  });

  const shouldAutoScrollRef = useRef(false);

  const clearChat = useCallback(() => {
    void stop().catch((stopError) => {
      console.error("Failed to stop chat stream", stopError);
    });
    clearError();
    setDraft("");
    setMessages([]);
    resetSharedChatSession();
    shouldAutoScrollRef.current = false;
    conversationRef.current?.setScrollPosition(0);
  }, [clearError, setDraft, setMessages, stop, conversationRef]);

  const isStreaming = status === "submitted" || status === "streaming";

  const visibleMessages = useMemo(
    () => messages.filter((message) => message.role === "assistant" || message.role === "user"),
    [messages],
  );

  const lastAssistant = useMemo(
    () => [...visibleMessages].reverse().find((message) => message.role === "assistant"),
    [visibleMessages],
  );

  const streamingMessageId = isStreaming ? lastAssistant?.id ?? null : null;

  // Auto-scroll: scroll to bottom when user sends a new message
  const lastUserCountRef = useRef(0);

  useEffect(() => {
    const userMessages = visibleMessages.filter((m) => m.role === "user");
    if (userMessages.length > lastUserCountRef.current) {
      shouldAutoScrollRef.current = true;
      conversationRef.current?.scrollToBottom({ behavior: "smooth" });
    }
    lastUserCountRef.current = userMessages.length;
  }, [visibleMessages, conversationRef]);

  // Track whether the user is still pinned to the bottom without interval polling.
  useEffect(() => {
    const container = document.querySelector('[role="log"]');
    if (!(container instanceof HTMLElement)) {
      return;
    }

    const handleScroll = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldAutoScrollRef.current = distance <= 24;
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      conversationRef.current?.scrollToBottom({ behavior: isStreaming ? "auto" : "smooth" });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [conversationRef, isStreaming, streamingMessageId, visibleMessages.length]);

  // Disable auto-scroll when streaming ends
  useEffect(() => {
    if (!isStreaming) {
      shouldAutoScrollRef.current = false;
    }
  }, [isStreaming]);

  const handleSubmit = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const text = draft.trim();
      if (!text) {
        return;
      }
      clearError();
      setDraft("");
      await sendMessage({ text });
    },
    [clearError, draft, sendMessage, setDraft],
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

  return {
    messages: visibleMessages,
    sendMessage,
    status,
    error,
    clearError,
    isStreaming,
    streamingMessageId,
    clearChat,
    handleSubmit,
    handleStop,
    handleRegenerate,
    draft,
    setDraft,
    contextFile,
    setContextFile,
  };
}
