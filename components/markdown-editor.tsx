"use client";

import { BlockNoteEditor } from "./blocknote-editor";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
};

export function MarkdownEditor(props: MarkdownEditorProps) {
  return <BlockNoteEditor {...props} />;
}
