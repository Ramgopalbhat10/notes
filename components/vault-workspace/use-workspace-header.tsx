import { useMemo, type ReactNode } from "react";

import { WorkspaceHeader } from "./header";
import type { AiActionType, BreadcrumbSegment } from "./types";

type SharingState = {
  isPublic: boolean;
  loading: boolean;
  updating: boolean;
  shareUrl: string | null;
};

type UseWorkspaceHeaderOptions = {
  segments: BreadcrumbSegment[];
  mode: "preview" | "edit";
  onToggleMode: () => void;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
  aiBusy: boolean;
  aiDisabled: boolean;
  onTriggerAction: (action: AiActionType) => void;
  hasFile: boolean;
  onOpenChatSidebar?: () => void;
  onOpenOutlineSidebar?: () => void;
  sharingState?: SharingState;
  onTogglePublic?: () => void;
  onCopyPublicLink?: () => void;
  centered: boolean;
  onToggleCentered: () => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onDownload?: (format: "markdown" | "text" | "pdf") => void;
  onDelete?: () => void;
};

export function useWorkspaceHeader(options: UseWorkspaceHeaderOptions): ReactNode {
  const {
    segments,
    mode,
    onToggleMode,
    onSave,
    canSave,
    saving,
    aiBusy,
    aiDisabled,
    onTriggerAction,
    hasFile,
    onOpenChatSidebar,
    onOpenOutlineSidebar,
    sharingState,
    onTogglePublic,
    onCopyPublicLink,
    centered,
    onToggleCentered,
    canNavigatePrev,
    canNavigateNext,
    onNavigatePrev,
    onNavigateNext,
    onDownload,
    onDelete,
  } = options;

  return useMemo(
    () => (
      <WorkspaceHeader
        segments={segments}
        mode={mode}
        onToggleMode={onToggleMode}
        onSave={onSave}
        canSave={canSave}
        saving={saving}
        aiBusy={aiBusy}
        aiDisabled={aiDisabled}
        onTriggerAction={onTriggerAction}
        hasFile={hasFile}
        onOpenChatSidebar={onOpenChatSidebar}
        onOpenOutlineSidebar={onOpenOutlineSidebar}
        sharingState={hasFile ? sharingState : undefined}
        onTogglePublic={hasFile ? onTogglePublic : undefined}
        onCopyPublicLink={hasFile ? onCopyPublicLink : undefined}
        centered={centered}
        onToggleCentered={onToggleCentered}
        canNavigatePrev={canNavigatePrev}
        canNavigateNext={canNavigateNext}
        onNavigatePrev={onNavigatePrev}
        onNavigateNext={onNavigateNext}
        onDownload={hasFile ? onDownload : undefined}
        onDelete={hasFile ? onDelete : undefined}
      />
    ),
    [
      segments,
      mode,
      onToggleMode,
      onSave,
      canSave,
      saving,
      aiBusy,
      aiDisabled,
      onTriggerAction,
      hasFile,
      onOpenChatSidebar,
      onOpenOutlineSidebar,
      sharingState,
      onTogglePublic,
      onCopyPublicLink,
      centered,
      onToggleCentered,
      canNavigatePrev,
      canNavigateNext,
      onNavigatePrev,
      onNavigateNext,
      onDownload,
      onDelete,
    ],
  );
}
