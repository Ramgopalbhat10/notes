"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";

import { useToast } from "@/hooks/use-toast";
import { useEditorStore } from "@/stores/editor";
import { useTreeStore } from "@/stores/tree";
import {
  collectVaultMutations,
  hasMutatingVaultActivity,
  toastForMutations,
} from "@/components/ai-chat/tool-activity";

function pathWasDeleted(fileKey: string, deletes: string[]): boolean {
  return deletes.some((deleted) => {
    if (fileKey === deleted) {
      return true;
    }
    return deleted.endsWith("/") && fileKey.startsWith(deleted);
  });
}

function relocatedPath(fileKey: string, from: string, to: string): string | null {
  if (fileKey === from) {
    return to;
  }
  if (from.endsWith("/") && fileKey.startsWith(from)) {
    return `${to}${fileKey.slice(from.length)}`;
  }
  return null;
}

function applyMoves(fileKey: string, moves: Array<{ from: string; to: string }>): string | null {
  let current = fileKey;
  let changed = false;
  for (const move of moves) {
    const next = relocatedPath(current, move.from, move.to);
    if (next) {
      current = next;
      changed = true;
    }
  }
  return changed ? current : null;
}

export function useVaultMutationSync(messages: UIMessage[], isStreaming: boolean): void {
  const { toast } = useToast();
  const previousStreaming = useRef(false);
  const lastSignature = useRef("");

  useEffect(() => {
    const wasStreaming = previousStreaming.current;
    previousStreaming.current = isStreaming;
    if (isStreaming || !wasStreaming) {
      return;
    }

    const summary = collectVaultMutations(messages);
    if (!hasMutatingVaultActivity(summary)) {
      return;
    }

    const signature = JSON.stringify(summary);
    if (signature === lastSignature.current) {
      return;
    }
    lastSignature.current = signature;

    void (async () => {
      await useTreeStore.getState().reloadManifest();

      const editor = useEditorStore.getState();
      const fileKey = editor.fileKey;
      const dirty = editor.dirty;

      if (fileKey && pathWasDeleted(fileKey, summary.deletes)) {
        const previous = useTreeStore.getState().getPreviousInHistory();
        editor.reset();
        if (previous && useTreeStore.getState().nodes[previous]) {
          useTreeStore.getState().select(previous);
        } else {
          useTreeStore.setState({ selectedId: null, selectionOrigin: "user", routeTarget: null });
        }
      } else if (fileKey) {
        const movedTo = applyMoves(fileKey, summary.moves);
        if (movedTo) {
          if (dirty) {
            editor.retargetFileKey(movedTo);
            useTreeStore.setState({ selectedId: movedTo, selectionOrigin: "user", routeTarget: null });
          } else {
            editor.forgetCachedDocument(fileKey);
            editor.forgetCachedDocument(movedTo);
            useTreeStore.getState().select(movedTo);
          }
        } else {
          const touched =
            summary.writes.includes(fileKey) ||
            summary.edits.includes(fileKey) ||
            summary.rollbacks.includes(fileKey);
          if (touched) {
            if (dirty) {
              toast({
                title: "Vault copy changed",
                description: "Chat updated this file on disk. Your unsaved editor buffer was kept.",
              });
            } else {
              editor.forgetCachedDocument(fileKey);
              await editor.loadFile(fileKey);
            }
          }
        }
      }

      const toastPayload = toastForMutations(summary);
      if (toastPayload) {
        toast(toastPayload);
      }
    })();
  }, [isStreaming, messages, toast]);
}
