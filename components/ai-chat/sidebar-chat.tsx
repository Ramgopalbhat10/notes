"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";

import { cn } from "@/lib/utils";
import {
  Conversation,
  ConversationContent,
  type ConversationHandle,
} from "@/components/ai-elements/conversation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useEditorStore } from "@/stores/editor";
import { ChatErrorBanner } from "./chat-error-banner";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatMessageRow } from "./chat-message";
import { ChatComposer } from "./chat-composer";
import { useChatSession } from "./hooks/use-chat-session";
import { messageToPlainText } from "./utils";
import type { SidebarChatProps } from "./types";

export type { SidebarChatHandle } from "./types";

export function SidebarChat({ onNewChatRef }: SidebarChatProps) {
  const isMobile = useIsMobile();
  const editorStatus = useEditorStore((state) => state.status);
  const applyAiResult = useEditorStore((state) => state.applyAiResult);
  const { toast } = useToast();

  const conversationRef = useRef<ConversationHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const {
    messages,
    sendMessage,
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
  } = useChatSession(conversationRef);

  const [copyingId, setCopyingId] = useState<string | null>(null);
  const canChat = editorStatus !== "loading";

  // Expose clearChat to parent
  useEffect(() => {
    onNewChatRef?.({ clearChat });
    return () => {
      onNewChatRef?.(null);
    };
  }, [clearChat, onNewChatRef]);

  // Detect portal container for model selector popover (inside sheet on mobile)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      setPortalContainer(null);
      return;
    }
    const sheetContent = root.closest("[data-slot='sheet-content']");
    setPortalContainer(sheetContent instanceof HTMLElement ? sheetContent : null);
  }, [isMobile]);

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

  const handleRemoveContext = useCallback(() => {
    setContextFile(null);
  }, [setContextFile]);

  const hasMessages = messages.length > 0;
  const composerDisabled = !canChat || isStreaming;

  return (
    <div ref={rootRef} className="flex h-full flex-col text-[13px]">
      <ChatErrorBanner error={error} onDismiss={clearError} />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Conversation ref={conversationRef} className="absolute inset-0">
          <ConversationContent className={cn("space-y-2 pb-6", hasMessages ? "pt-2" : "pt-4")}>
            {hasMessages ? (
              messages.map((message) => (
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
              <ChatEmptyState
                contextFile={contextFile}
                canChat={canChat}
                onSendMessage={(text) => void sendMessage({ text })}
              />
            )}
          </ConversationContent>
        </Conversation>
      </div>

      <ChatComposer
        contextFile={contextFile}
        onRemoveContext={handleRemoveContext}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={() => void handleSubmit()}
        onStop={() => void handleStop()}
        isStreaming={isStreaming}
        disabled={composerDisabled}
        portalContainer={portalContainer}
      />
    </div>
  );
}
