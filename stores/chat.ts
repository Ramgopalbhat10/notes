import { create } from "zustand";
import type { UIMessage } from "ai";

import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";

export type SetSelectedModelOptions = {
  source?: "user" | "system";
};

import type { EnabledTools } from "@/lib/ai/tools";

type ChatState = {
  messages: UIMessage[];
  setMessages: (messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void;
  addMessage: (message: UIMessage) => void;
  clearMessages: () => void;
  draft: string;
  setDraft: (draft: string) => void;
  selectedModel: string;
  modelUserOverridden: boolean;
  setSelectedModel: (model: string, options?: SetSelectedModelOptions) => void;
  contextFile: string | null;
  setContextFile: (file: string | null) => void;
  scrollPosition: number;
  setScrollPosition: (position: number) => void;
  enabledTools: EnabledTools;
  toggleToolProvider: (toolId: string, providerId: string, enabled: boolean) => void;
};

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
  selectedModel: DEFAULT_CHAT_MODEL,
  modelUserOverridden: false,
  setSelectedModel: (selectedModel, options) =>
    set((state) => ({
      selectedModel,
      modelUserOverridden:
        options?.source === "system" ? state.modelUserOverridden : true,
    })),
  contextFile: null,
  setContextFile: (contextFile) => set({ contextFile }),
  scrollPosition: 0,
  setScrollPosition: (scrollPosition) => set({ scrollPosition }),
  enabledTools: {},
  toggleToolProvider: (toolId, providerId, enabled) =>
    set((state) => {
      const current = state.enabledTools[toolId] ?? [];
      const next = enabled
        ? [...new Set([...current, providerId])]
        : current.filter((id) => id !== providerId);
      return {
        enabledTools: {
          ...state.enabledTools,
          [toolId]: next.length > 0 ? next : [],
        },
      };
    }),
}));
