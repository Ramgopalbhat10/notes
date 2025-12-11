import type { LucideIcon } from "lucide-react";

export type BreadcrumbSegment = {
  label: string;
  path: string | null; // null for the last segment (current file/folder), string for navigable parent folders
};

export type AiActionType = "improve" | "summarize" | "expand";

export type AiSessionStatus = "idle" | "streaming" | "success" | "error" | "cancelled";

export type AiSessionState = {
  status: AiSessionStatus;
  action: AiActionType | null;
  result: string;
  truncated: boolean;
  error: string | null;
  range: { from: number; to: number } | null;
  usedSelection: boolean;
};

export type AiActionDefinition = {
  value: AiActionType;
  label: string;
  icon: LucideIcon;
};
