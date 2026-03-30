import { create } from "zustand";

import type { AiAssistantSessionState } from "@/components/ai-actions/types";

export const INITIAL_AI_ASSISTANT_STATE: AiAssistantSessionState = {
  status: "idle",
  sessionKey: null,
  action: null,
  fileKey: null,
  documentText: "",
  selectionText: "",
  selectionSignature: "",
  selectionBlockIds: [],
  contextMode: "document",
  sourceView: "header",
  requestKind: "initial",
  result: "",
  truncated: false,
  processingMode: "single",
  error: null,
  model: "",
  lastInstruction: "",
  compareMode: false,
};

type AiActionsStore = {
  sessions: Record<string, AiAssistantSessionState>;
  activeSessionKey: string | null;
  session: AiAssistantSessionState;
  activateSession: (sessionKey: string) => boolean;
  setSession: (
    value: Partial<AiAssistantSessionState> | ((current: AiAssistantSessionState) => AiAssistantSessionState),
    options?: { sessionKey?: string | null },
  ) => void;
  resetSession: (sessionKey?: string | null) => void;
  resetAllSessions: () => void;
};

export const useAiActionsStore = create<AiActionsStore>((set) => ({
  sessions: {},
  activeSessionKey: null,
  session: INITIAL_AI_ASSISTANT_STATE,
  activateSession: (sessionKey) => {
    let activated = false;
    set((state) => {
      const next = state.sessions[sessionKey];
      if (!next) {
        return state;
      }
      activated = true;
      return {
        ...state,
        activeSessionKey: sessionKey,
        session: next,
      };
    });
    return activated;
  },
  setSession: (value, options) =>
    set((state) => {
      const targetKey = options?.sessionKey ?? state.activeSessionKey;
      const nextSession = typeof value === "function" ? value(state.session) : { ...state.session, ...value };

      if (!targetKey) {
        return {
          ...state,
          session: nextSession,
          activeSessionKey: nextSession.sessionKey,
        };
      }

      return {
        ...state,
        activeSessionKey: targetKey,
        session: nextSession,
        sessions: {
          ...state.sessions,
          [targetKey]: nextSession,
        },
      };
    }),
  resetSession: (sessionKey) =>
    set((state) => {
      const targetKey = sessionKey ?? state.activeSessionKey;
      if (!targetKey) {
        return {
          ...state,
          session: INITIAL_AI_ASSISTANT_STATE,
          activeSessionKey: null,
        };
      }

      const nextSessions = { ...state.sessions };
      delete nextSessions[targetKey];

      const nextActiveKey = state.activeSessionKey === targetKey ? null : state.activeSessionKey;
      const nextSession = nextActiveKey ? nextSessions[nextActiveKey] ?? INITIAL_AI_ASSISTANT_STATE : INITIAL_AI_ASSISTANT_STATE;

      return {
        ...state,
        sessions: nextSessions,
        activeSessionKey: nextActiveKey,
        session: nextSession,
      };
    }),
  resetAllSessions: () =>
    set({
      sessions: {},
      activeSessionKey: null,
      session: INITIAL_AI_ASSISTANT_STATE,
    }),
}));
