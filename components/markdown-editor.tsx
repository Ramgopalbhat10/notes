"use client";

import type { AiActionSelectionSource } from "@/components/ai-actions/types";
import type { AiActionType } from "@/components/vault-workspace/types";
import { BlockNoteEditor } from "./blocknote-editor";

type MarkdownEditorProps = {
  documentKey?: string | null;
  value: string;
  onChange: (value: string) => void;
  onSelectionAction?: (action: AiActionType, source?: AiActionSelectionSource) => void;
  selectionAiBusy?: boolean;
  readOnly?: boolean;
  className?: string;
};

export function MarkdownEditor(props: MarkdownEditorProps) {
  return <BlockNoteEditor {...props} />;
}
