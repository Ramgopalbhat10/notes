import { create } from "zustand";
import type { UIMessage } from "ai";

type ChatState = {
  messages: UIMessage[];
  setMessages: (messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void;
  addMessage: (message: UIMessage) => void;
  clearMessages: () => void;
  draft: string;
  setDraft: (draft: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  contextFile: string | null;
  setContextFile: (file: string | null) => void;
  scrollPosition: number;
  setScrollPosition: (position: number) => void;
};

const DEFAULT_MODEL = "openai/gpt-oss-120b";

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  setMessages: (messages) =>
    set((state) => ({
      messages: typeof messages === "function" ? messages(state.messages) : messages,
    })),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  clearMessages: () => set({ messages: [], draft: "" }),
  draft: "",
  setDraft: (draft) => set({ draft }),
  selectedModel: DEFAULT_MODEL,
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  contextFile: null,
  setContextFile: (contextFile) => set({ contextFile }),
  scrollPosition: 0,
  setScrollPosition: (scrollPosition) => set({ scrollPosition }),
}));
