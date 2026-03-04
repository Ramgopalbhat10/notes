import type { UIMessage } from "ai";

export const MAX_EXCERPT_CHARS = 6_000;

export type FilePayload = {
  key: string;
  contentDigest: string | null;
  excerpt: string | null;
};

export type SidebarChatHandle = {
  clearChat: () => void;
};

export type SidebarChatProps = {
  onNewChatRef?: (handle: SidebarChatHandle | null) => void;
};

export type ChatMessageRowProps = {
  message: UIMessage;
  streaming: boolean;
  copying: boolean;
  onCopy: (message: UIMessage) => void;
  onInsert: (message: UIMessage) => void;
  onRegenerate: (messageId: string | undefined) => void;
  canRegenerate: boolean;
};
