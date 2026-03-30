"use client";

import type { AiActionType } from "@/components/vault-workspace/types";
import { BlockNoteEditor } from "./blocknote-editor";

type MarkdownEditorProps = {
  documentKey?: string | null;
  value: string;
  onChange: (value: string) => void;
  onSelectionAction?: (action: AiActionType, source?: { selectionText: string; sourceView: "edit" }) => void;
  selectionAiBusy?: boolean;
  readOnly?: boolean;
  className?: string;
};

export function MarkdownEditor(props: MarkdownEditorProps) {
  return <BlockNoteEditor {...props} />;
}
