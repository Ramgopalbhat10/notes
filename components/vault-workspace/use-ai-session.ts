import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AiActionType, AiSessionState } from "./types";

const INITIAL_STATE: AiSessionState = {
  status: "idle",
  action: null,
  result: "",
  truncated: false,
  error: null,
  range: null,
  usedSelection: false,
};

export type UseAiSessionOptions = {
  fileKey: string | null;
  content: string;
  selection: { from: number; to: number } | null;
  status: "idle" | "loading" | "saving" | "error" | "conflict";
  hasDocumentContent: boolean;
  toast: (opts: { description: string; variant?: "default" | "destructive" }) => void;
  applyAiResult: (text: string, options?: { range?: { from: number; to: number } | null; strategy?: "replace" | "insert" }) => void;
  setMode: (mode: "preview" | "edit") => void;
};

export type UseAiSessionReturn = {
  state: AiSessionState;
  panelOpen: boolean;
  isStreaming: boolean;
  start(action: AiActionType): Promise<void>;
  cancel(): void;
  closePanel(): void;
  retry(): void;
  applyReplace(): void;
  applyInsert(): void;
  copyResult(): Promise<void>;
  canApply: boolean;
};

export function useAiSession({
  fileKey,
  content,
  selection,
  status,
  hasDocumentContent,
  toast,
  applyAiResult,
  setMode,
}: UseAiSessionOptions): UseAiSessionReturn {
  const [state, setState] = useState<AiSessionState>(INITIAL_STATE);
  const [panelOpen, setPanelOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const resetSession = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setPanelOpen(false);
    setState(INITIAL_STATE);
  }, []);

  useEffect(() => {
    resetSession();
  }, [fileKey, resetSession]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setState((prev) => ({ ...prev, status: "cancelled" }));
    }
  }, []);

  const closePanel = useCallback(() => {
    if (state.status === "streaming") {
      cancel();
    }
    setPanelOpen(false);
    setState((prev) => ({ ...prev, status: prev.status === "streaming" ? "cancelled" : prev.status }));
  }, [cancel, state.status]);

  const start = useCallback(
    async (action: AiActionType) => {
      if (status === "loading") {
        toast({ variant: "destructive", description: "Wait for the document to finish loading." });
        return;
      }

      if (!hasDocumentContent) {
        toast({ variant: "destructive", description: "There is no content to process yet." });
        return;
      }

      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      const selectionRange = selection ? { ...selection } : null;
      const selectionText = selectionRange ? content.slice(selectionRange.from, selectionRange.to) : "";
      const useSelection = Boolean(selectionText.trim().length);

      const payload: {
        action: AiActionType;
        content: string;
        selection?: string;
      } = {
        action,
        content,
      };

      if (useSelection) {
        payload.selection = selectionText;
      }

      setPanelOpen(true);
      setState({
        status: "streaming",
        action,
        result: "",
        truncated: false,
        error: null,
        range: selectionRange,
        usedSelection: useSelection,
      });

      let aggregate = "";

      try {
        const response = await fetch("/api/ai/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message = typeof errorBody?.error === "string" ? errorBody.error : "Failed to run AI action";
          throw new Error(message);
        }

        const truncated = response.headers.get("x-ai-input-truncated") === "1";
        setState((prev) => ({ ...prev, truncated }));

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Received empty AI response");
        }
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          aggregate += decoder.decode(value, { stream: true });
          setState((prev) => ({ ...prev, result: aggregate }));
        }

        aggregate += decoder.decode();
        setState((prev) => ({ ...prev, status: "success", result: aggregate }));
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          if (abortRef.current === controller) {
            setState((prev) => ({ ...prev, status: "cancelled" }));
            abortRef.current = null;
          }
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to run AI action";
        setState((prev) => ({ ...prev, status: "error", error: message }));
        toast({ variant: "destructive", description: message });
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [content, hasDocumentContent, selection, status, toast],
  );

  const retry = useCallback(() => {
    if (state.action) {
      void start(state.action);
    }
  }, [start, state.action]);

  const applyReplace = useCallback(() => {
    if (state.status !== "success" || !state.result.trim()) {
      toast({ variant: "destructive", description: "No AI output available to apply." });
      return;
    }
    setMode("edit");
    const range = state.usedSelection ? state.range : null;
    applyAiResult(state.result, { range: range ?? undefined, strategy: "replace" });
    toast({ description: "Applied AI result." });
  }, [applyAiResult, setMode, state.range, state.result, state.status, state.usedSelection, toast]);

  const applyInsert = useCallback(() => {
    if (state.status !== "success" || !state.result.trim()) {
      toast({ variant: "destructive", description: "No AI output available to insert." });
      return;
    }
    setMode("edit");
    applyAiResult(state.result, { range: state.range ?? undefined, strategy: "insert" });
    toast({ description: "Inserted AI result." });
  }, [applyAiResult, setMode, state.range, state.result, state.status, toast]);

  const copyResult = useCallback(async () => {
    if (!state.result) {
      toast({ variant: "destructive", description: "No AI output to copy." });
      return;
    }
    try {
      await navigator.clipboard.writeText(state.result);
      toast({ description: "Copied AI result to clipboard." });
    } catch (error) {
      void error;
      toast({ variant: "destructive", description: "Unable to access clipboard." });
    }
  }, [state.result, toast]);

  const canApply = useMemo(() => state.status === "success" && state.result.trim().length > 0, [state.result, state.status]);

  return {
    state,
    panelOpen,
    isStreaming: state.status === "streaming",
    start,
    cancel,
    closePanel,
    retry,
    applyReplace,
    applyInsert,
    copyResult,
    canApply,
  };
}

export { INITIAL_STATE as INITIAL_AI_STATE };
