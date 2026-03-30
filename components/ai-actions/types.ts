import type { AiActionType } from "@/components/vault-workspace/types";

export type AiActionContextMode = "selection" | "document";

export type AiActionRequestKind = "initial" | "refine";

export type AiAssistantStatus = "idle" | "streaming" | "success" | "error" | "cancelled";

export type AiActionSourceView = "edit" | "preview" | "header";

export type AiAssistantSessionState = {
  status: AiAssistantStatus;
  sessionKey: string | null;
  action: AiActionType | null;
  fileKey: string | null;
  documentText: string;
  selectionText: string;
  selectionSignature: string;
  selectionBlockIds: string[];
  contextMode: AiActionContextMode;
  sourceView: AiActionSourceView;
  requestKind: AiActionRequestKind;
  result: string;
  truncated: boolean;
  processingMode: "single" | "chunked";
  error: string | null;
  model: string;
  lastInstruction: string;
  compareMode: boolean;
};

export type AiActionRequestPayload = {
  action: AiActionType;
  document: string;
  selection?: string;
  contextMode: AiActionContextMode;
  requestKind?: AiActionRequestKind;
  instruction?: string;
  previousResult?: string;
  model?: string | null;
};
