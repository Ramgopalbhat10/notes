"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { normalizeFolderPrefix } from "@/lib/fs-validation";
import { encodePath } from "@/lib/utils";
import type { NodeId } from "@/stores/tree";
import type { ModalState } from "../types";

export type UseModalSubmitParams = {
  modal: ModalState | null;
  modalInput: string;
  setModal: (modal: ModalState | null) => void;
  setModalError: (error: string | null) => void;
  setModalSubmitting: (submitting: boolean) => void;
  createFolderAction: (parentId: NodeId | null, name: string) => Promise<void>;
  createFileAction: (parentId: NodeId | null, name: string) => Promise<void>;
  renameNodeAction: (nodeId: NodeId, name: string) => Promise<void>;
  moveNodeAction: (nodeId: NodeId, destination: NodeId | null) => Promise<void>;
  deleteNodeAction: (nodeId: NodeId) => Promise<void>;
  selectedId: NodeId | null;
  getPreviousInHistory: () => NodeId | null;
  removeFromHistory: (nodeId: NodeId) => void;
  idToSlug: Record<NodeId, string>;
  router: AppRouterInstance;
  toast: (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
  formatPathLabel: (path: string | null | undefined) => string;
};

export function useModalSubmit(params: UseModalSubmitParams) {
  const {
    modal,
    modalInput,
    setModal,
    setModalError,
    setModalSubmitting,
    createFolderAction,
    createFileAction,
    renameNodeAction,
    moveNodeAction,
    deleteNodeAction,
    selectedId,
    getPreviousInHistory,
    removeFromHistory,
    idToSlug,
    router,
    toast,
    formatPathLabel,
  } = params;

  const handleModalSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!modal) {
      return;
    }

    setModalSubmitting(true);
    setModalError(null);

    try {
      switch (modal.type) {
        case "create-folder": {
          const name = modalInput.trim();
          if (!name) {
            setModalError("Folder name is required.");
            setModalSubmitting(false);
            return;
          }
          await createFolderAction(modal.parentId, name);
          toast({ title: "Folder created", description: `Created "${name}"` });
          break;
        }
        case "create-file": {
          const name = modalInput.trim();
          if (!name) {
            setModalError("File name is required.");
            setModalSubmitting(false);
            return;
          }
          await createFileAction(modal.parentId, name);
          toast({ title: "File created", description: `Created "${name}"` });
          break;
        }
        case "rename": {
          const name = modalInput.trim();
          if (!name) {
            setModalError("Name is required.");
            setModalSubmitting(false);
            return;
          }
          await renameNodeAction(modal.nodeId, name);
          toast({ title: "Renamed", description: `Renamed to "${name}"` });
          break;
        }
        case "move": {
          const value = modalInput.trim();
          let destination: NodeId | null = null;
          if (value) {
            try {
              const candidate = value.endsWith("/") ? value : `${value}/`;
              destination = normalizeFolderPrefix(candidate);
            } catch (error) {
              setModalError(error instanceof Error ? error.message : "Invalid destination path.");
              setModalSubmitting(false);
              return;
            }
          }
          await moveNodeAction(modal.nodeId, destination);
          const destLabel = formatPathLabel(destination);
          toast({ title: "Moved", description: `Moved to ${destLabel}` });
          break;
        }
        case "delete": {
          const wasSelected = selectedId === modal.nodeId;
          const previousId = wasSelected ? getPreviousInHistory() : null;

          await deleteNodeAction(modal.nodeId);
          removeFromHistory(modal.nodeId);

          if (wasSelected) {
            if (previousId) {
              const slug = idToSlug[previousId] ?? previousId;
              router.push(`/files/${encodePath(slug)}`, { scroll: false });
            } else {
              router.push("/files", { scroll: false });
            }
          }

          toast({ title: "Deleted", description: `Deleted "${modal.name}"` });
          break;
        }
      }

      setModal(null);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      toast({ title: "Action failed", description: message, variant: "destructive" });
    } finally {
      setModalSubmitting(false);
    }
  };

  return { handleModalSubmit };
}
