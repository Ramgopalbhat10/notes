"use client";

import { useCallback, useEffect, useMemo } from "react";

import { useToast } from "@/hooks/use-toast";
import { extractResponseError, getErrorMessage } from "@/lib/http/client";
import { buildSelectionIdentity } from "@/lib/ai/selection-anchor";
import type { PreviewSelectionAnchor } from "@/lib/ai/selection-anchor";
import { useChatStore } from "@/stores/chat";
import { INITIAL_AI_ASSISTANT_STATE, useAiActionsStore } from "@/stores/ai-actions";
import { useEditorStore } from "@/stores/editor";
import type { AiActionType } from "@/components/vault-workspace/types";
import type {
  AiActionContextMode,
  AiActionRequestKind,
  AiActionRequestPayload,
  AiActionSourceView,
} from "../types";

const abortState: { current: AbortController | null } = { current: null };

type StartActionOptions = {
  action: AiActionType;
  contextMode: AiActionContextMode;
  requestKind?: AiActionRequestKind;
  instruction?: string;
  source?: {
    fileKey: string | null;
    documentText: string;
    selectionText: string;
    selectionBlockIds: string[];
    sourceView: AiActionSourceView;
    previewAnchor?: PreviewSelectionAnchor;
  };
};

type TriggerActionOptions = {
  source?: {
    fileKey: string | null;
    documentText: string;
    selectionText: string;
    selectionBlockIds?: string[];
    sourceView: AiActionSourceView;
    previewAnchor?: PreviewSelectionAnchor;
  };
};

function getReferenceText(documentText: string, selectionText: string, contextMode: AiActionContextMode): string {
  return contextMode === "selection" ? selectionText : documentText;
}

function buildSessionKey({
  fileKey,
  action,
  contextMode,
  selectionSignature,
}: {
  fileKey: string | null;
  action: AiActionType;
  contextMode: AiActionContextMode;
  selectionSignature: string;
}): string {
  return [fileKey ?? "no-file", action, contextMode, contextMode === "selection" ? selectionSignature : "document"].join("::");
}

function canReuseSession({
  cached,
  documentText,
  selectionText,
  selectionBlockIds,
  previewAnchor,
  contextMode,
}: {
  cached: typeof INITIAL_AI_ASSISTANT_STATE;
  documentText: string;
  selectionText: string;
  selectionBlockIds?: string[];
  previewAnchor?: PreviewSelectionAnchor;
  contextMode: AiActionContextMode;
}): boolean {
  if (!cached.action || cached.status === "streaming") {
    return false;
  }

  if (cached.contextMode !== contextMode) {
    return false;
  }

  if (cached.documentText !== documentText) {
    return false;
  }

  if (contextMode === "selection") {
    return cached.selectionSignature === buildSelectionIdentity({
      contextMode,
      selectionText,
      selectionBlockIds,
      previewAnchor,
    });
  }

  return true;
}

export function useAiActionController() {
  const { toast } = useToast();
  const fileKey = useEditorStore((state) => state.fileKey);
  const content = useEditorStore((state) => state.content);
  const status = useEditorStore((state) => state.status);
  const selectedText = useEditorStore((state) => state.selectedText);
  const selectedBlockIds = useEditorStore((state) => state.selectedBlockIds);
  const applyAiResult = useEditorStore((state) => state.applyAiResult);
  const setMode = useEditorStore((state) => state.setMode);
  const selectedModel = useChatStore((state) => state.selectedModel);
  const sessions = useAiActionsStore((state) => state.sessions);
  const session = useAiActionsStore((state) => state.session);
  const activateSession = useAiActionsStore((state) => state.activateSession);
  const setSession = useAiActionsStore((state) => state.setSession);
  const resetSession = useAiActionsStore((state) => state.resetSession);
  const resetAllSessions = useAiActionsStore((state) => state.resetAllSessions);

  useEffect(() => {
    if (!fileKey && session.fileKey) {
      resetAllSessions();
      return;
    }
    if (fileKey && session.fileKey && fileKey !== session.fileKey) {
      resetAllSessions();
    }
  }, [fileKey, resetAllSessions, session.fileKey]);

  const cancel = useCallback(() => {
    if (abortState.current) {
      abortState.current.abort();
      abortState.current = null;
      setSession({ status: "cancelled" });
    }
  }, [setSession]);

  const startAction = useCallback(
    async ({ action, contextMode, requestKind = "initial", instruction = "", source }: StartActionOptions) => {
      if (status === "loading") {
        toast({ description: "Wait for the document to finish loading.", variant: "destructive" });
        return;
      }

      const documentText = source?.documentText ?? content;
      const selectionTextSnapshot = (source?.selectionText ?? selectedText).trim();
      const selectionBlockIdsSnapshot = source?.selectionBlockIds ?? selectedBlockIds;
      const previewAnchorSnapshot = source?.previewAnchor;
      const snapshotFileKey = source?.fileKey ?? fileKey;
      const sourceView = source?.sourceView ?? (contextMode === "selection" ? "edit" : "header");
      const selectionSignature = buildSelectionIdentity({
        contextMode,
        selectionText: selectionTextSnapshot,
        selectionBlockIds: selectionBlockIdsSnapshot,
        previewAnchor: previewAnchorSnapshot,
      });
      const sessionKey = buildSessionKey({
        fileKey: snapshotFileKey,
        action,
        contextMode,
        selectionSignature,
      });

      if (!documentText.trim()) {
        toast({ description: "There is no content to process yet.", variant: "destructive" });
        return;
      }

      if (contextMode === "selection" && !selectionTextSnapshot) {
        toast({ description: "Select some text first to run a selection-based action.", variant: "destructive" });
        return;
      }

      if (requestKind === "refine" && !session.result.trim()) {
        toast({ description: "Generate a draft before refining it.", variant: "destructive" });
        return;
      }

      if (abortState.current) {
        abortState.current.abort();
      }

      const controller = new AbortController();
      abortState.current = controller;

      setSession({
        status: "streaming",
        sessionKey,
        action,
        fileKey: snapshotFileKey,
        documentText,
        selectionText: selectionTextSnapshot,
        selectionSignature,
        selectionBlockIds: selectionBlockIdsSnapshot,
        selectionContextBefore: previewAnchorSnapshot?.contextBefore ?? "",
        selectionContextAfter: previewAnchorSnapshot?.contextAfter ?? "",
        contextMode,
        sourceView,
        requestKind,
        result: "",
        truncated: false,
        processingMode: "single",
        error: null,
        model: selectedModel,
        lastInstruction: instruction,
        compareMode: false,
      }, { sessionKey });

      const payload: AiActionRequestPayload = {
        action,
        document: documentText,
        contextMode,
        selection: contextMode === "selection" ? selectionTextSnapshot : undefined,
        requestKind,
        instruction: instruction || undefined,
        previousResult: requestKind === "refine" ? session.result : undefined,
        model: selectedModel,
      };

      let aggregate = "";

      try {
        const response = await fetch("/api/ai/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await extractResponseError(response, "Failed to run AI action"));
        }

        const truncated = response.headers.get("x-ai-input-truncated") === "1";
        const processingMode = response.headers.get("x-ai-processing-mode") === "chunked" ? "chunked" : "single";
        setSession((current) => ({
          ...current,
          truncated,
          processingMode,
        }), { sessionKey });

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
          setSession((current) => ({ ...current, result: aggregate }), { sessionKey });
        }

        aggregate += decoder.decode();
        setSession((current) => ({ ...current, status: "success", result: aggregate }), { sessionKey });
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          if (abortState.current === controller) {
            setSession((current) => ({ ...current, status: "cancelled" }), { sessionKey });
            abortState.current = null;
          }
          return;
        }

        const message = getErrorMessage(error, "Failed to run AI action");
        setSession((current) => ({ ...current, status: "error", error: message }), { sessionKey });
        toast({ description: message, variant: "destructive" });
      } finally {
        if (abortState.current === controller) {
          abortState.current = null;
        }
      }
    },
    [
      content,
      fileKey,
      selectedBlockIds,
      selectedModel,
      selectedText,
      session.result,
      setSession,
      status,
      toast,
    ],
  );

  const triggerAction = useCallback(
    async (action: AiActionType, contextMode: AiActionContextMode, options?: TriggerActionOptions) => {
      const documentText = options?.source?.documentText ?? content;
      const selectionTextSnapshot = (options?.source?.selectionText ?? selectedText).trim();
      const selectionBlockIdsSnapshot = options?.source?.selectionBlockIds ?? selectedBlockIds;
      const previewAnchorSnapshot = options?.source?.previewAnchor;
      const selectionSignature = buildSelectionIdentity({
        contextMode,
        selectionText: selectionTextSnapshot,
        selectionBlockIds: selectionBlockIdsSnapshot,
        previewAnchor: previewAnchorSnapshot,
      });
      const sessionKey = buildSessionKey({
        fileKey: options?.source?.fileKey ?? fileKey,
        action,
        contextMode,
        selectionSignature,
      });
      const cached = sessions[sessionKey];

      if (
        cached
        && canReuseSession({
          cached,
          documentText,
          selectionText: selectionTextSnapshot,
          selectionBlockIds: selectionBlockIdsSnapshot,
          previewAnchor: previewAnchorSnapshot,
          contextMode,
        })
      ) {
        activateSession(sessionKey);
        return;
      }

      await startAction({
        action,
        contextMode,
        requestKind: "initial",
        source: {
          fileKey: options?.source?.fileKey ?? fileKey,
          documentText,
          selectionText: selectionTextSnapshot,
          selectionBlockIds: selectionBlockIdsSnapshot,
          sourceView: options?.source?.sourceView ?? (contextMode === "selection" ? "edit" : "header"),
          previewAnchor: previewAnchorSnapshot,
        },
      });
    },
    [activateSession, content, fileKey, selectedBlockIds, selectedText, sessions, startAction],
  );

  const rerunAction = useCallback(
    async (action?: AiActionType) => {
      if (!session.action) {
        return;
      }

      await startAction({
        action: action ?? session.action,
        contextMode: session.contextMode,
        requestKind: "initial",
        source: {
          fileKey: session.fileKey,
          documentText: session.documentText,
          selectionText: session.selectionText,
          selectionBlockIds: session.selectionBlockIds,
          sourceView: session.sourceView,
          previewAnchor: session.sourceView === "preview"
            ? {
              contextBefore: session.selectionContextBefore,
              contextAfter: session.selectionContextAfter,
            }
            : undefined,
        },
      });
    },
    [session.action, session.contextMode, session.documentText, session.fileKey, session.selectionBlockIds, session.selectionText, startAction],
  );

  const refineAction = useCallback(
    async (instruction: string) => {
      const trimmed = instruction.trim();
      if (!trimmed) {
        return;
      }

      if (!session.action) {
        toast({ description: "Choose an AI action first.", variant: "destructive" });
        return;
      }

      await startAction({
        action: session.action,
        contextMode: session.contextMode,
        requestKind: "refine",
        instruction: trimmed,
        source: {
          fileKey: session.fileKey,
          documentText: session.documentText,
          selectionText: session.selectionText,
          selectionBlockIds: session.selectionBlockIds,
          sourceView: session.sourceView,
          previewAnchor: session.sourceView === "preview"
            ? {
              contextBefore: session.selectionContextBefore,
              contextAfter: session.selectionContextAfter,
            }
            : undefined,
        },
      });
    },
    [session.action, session.contextMode, session.documentText, session.fileKey, session.selectionBlockIds, session.selectionText, startAction, toast],
  );

  const applyReplace = useCallback(async () => {
    if (session.status !== "success" || !session.result.trim()) {
      toast({ description: "No AI output available to apply.", variant: "destructive" });
      return;
    }
    setMode("edit");
    const applied = await applyAiResult(session.result, {
      strategy: "replace",
      blockIds: session.contextMode === "selection" ? session.selectionBlockIds : undefined,
      sourceText: session.contextMode === "selection" ? session.selectionText : undefined,
      previewAnchor: session.sourceView === "preview"
        ? {
          contextBefore: session.selectionContextBefore,
          contextAfter: session.selectionContextAfter,
        }
        : undefined,
    });
    toast({
      description: applied
        ? session.contextMode === "selection"
          ? "Replaced the selected content."
          : "Replaced the document draft."
        : "Could not locate the original selection in the current note.",
      variant: applied ? "default" : "destructive",
    });
  }, [applyAiResult, session.contextMode, session.result, session.selectionBlockIds, session.selectionContextAfter, session.selectionContextBefore, session.selectionText, session.sourceView, session.status, setMode, toast]);

  const applyInsert = useCallback(async () => {
    if (session.status !== "success" || !session.result.trim()) {
      toast({ description: "No AI output available to insert.", variant: "destructive" });
      return;
    }
    setMode("edit");
    const applied = await applyAiResult(session.result, {
      strategy: "insert",
      blockIds: session.contextMode === "selection" ? session.selectionBlockIds : undefined,
      sourceText: session.contextMode === "selection" ? session.selectionText : undefined,
      previewAnchor: session.sourceView === "preview"
        ? {
          contextBefore: session.selectionContextBefore,
          contextAfter: session.selectionContextAfter,
        }
        : undefined,
    });
    toast({
      description: applied
        ? session.contextMode === "selection"
          ? "Inserted AI draft below the selection."
          : "Inserted AI draft at the cursor."
        : "Could not locate the original selection in the current note.",
      variant: applied ? "default" : "destructive",
    });
  }, [applyAiResult, session.contextMode, session.result, session.selectionBlockIds, session.selectionContextAfter, session.selectionContextBefore, session.selectionText, session.sourceView, session.status, setMode, toast]);

  const copyResult = useCallback(async () => {
    if (!session.result.trim()) {
      toast({ description: "No AI output to copy.", variant: "destructive" });
      return;
    }

    try {
      await navigator.clipboard.writeText(session.result);
      toast({ description: "Copied AI draft to clipboard." });
    } catch {
      toast({ description: "Unable to access clipboard.", variant: "destructive" });
    }
  }, [session.result, toast]);

  const originalText = useMemo(
    () => getReferenceText(session.documentText, session.selectionText, session.contextMode),
    [session.contextMode, session.documentText, session.selectionText],
  );

  const canApply = session.status === "success" && session.result.trim().length > 0;
  const hasDocumentContent = content.trim().length > 0;

  const clearSession = useCallback(() => {
    cancel();
    resetSession();
  }, [cancel, resetSession]);

  return {
    session,
    originalText,
    isStreaming: session.status === "streaming",
    canApply,
    hasDocumentContent,
    triggerAction,
    rerunAction,
    refineAction,
    cancel,
    applyReplace,
    applyInsert,
    copyResult,
    clearSession,
    setCompareMode: (compareMode: boolean) => setSession({ compareMode }),
    resetSession: clearSession,
    hasActiveSession: session.status !== INITIAL_AI_ASSISTANT_STATE.status || Boolean(session.action),
  };
}
