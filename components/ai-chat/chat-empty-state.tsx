"use client";

import { ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Button } from "@/components/ui/button";

type ChatEmptyStateProps = {
  contextFile: string | null;
  canChat: boolean;
  onSendMessage: (text: string) => void;
};

export function ChatEmptyState({ contextFile, canChat, onSendMessage }: ChatEmptyStateProps) {
  return (
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
              onClick={() => onSendMessage("Summarize this note")}
              disabled={!contextFile}
            >
              Summarize
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-full bg-background hover:bg-accent"
              onClick={() => onSendMessage("Find related notes")}
              disabled={!contextFile}
            >
              Related notes
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs rounded-full bg-background hover:bg-accent"
              onClick={() => onSendMessage("Generate action items")}
              disabled={!contextFile}
            >
              Action items
            </Button>
          </div>
        ) : null}
      </div>
    </ConversationEmptyState>
  );
}
