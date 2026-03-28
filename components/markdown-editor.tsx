"use client";

import { BlockNoteEditor } from "./blocknote-editor";

type MarkdownEditorProps = {
  documentKey?: string | null;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
};

export function MarkdownEditor(props: MarkdownEditorProps) {
  return <BlockNoteEditor {...props} />;
}
