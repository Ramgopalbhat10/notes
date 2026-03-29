"use client";

import { useCallback, useEffect, useRef } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import type { BlockNoteEditor as BlockNoteEditorView } from "@blocknote/core";
import "@blocknote/mantine/style.css";
import { useEditorStore } from "@/stores/editor";

type BlockNoteEditorProps = {
  documentKey?: string | null;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
};

export function BlockNoteEditor({
  documentKey,
  value,
  onChange,
  readOnly,
  className,
}: BlockNoteEditorProps) {
  const registerEditorView = useEditorStore((state) => state.registerEditorView);
  const setSelection = useEditorStore((state) => state.setSelection);
  const setSelectedText = useEditorStore((state) => state.setSelectedText);
  const syncTimeoutRef = useRef<number | null>(null);

  const editor = useCreateBlockNote({
    initialContent: undefined,
  });

  const flushEditorMarkdown = useCallback(async () => {
    if (!editor) {
      return;
    }
    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    onChange(markdown);
  }, [editor, onChange]);

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };
  }, []);

  // Re-hydrate when the active file changes, not on each debounced content sync.
  useEffect(() => {
    if (!editor || !documentKey) {
      return;
    }

    let cancelled = false;
    const loadContent = async () => {
      const blocks = await editor.tryParseMarkdownToBlocks(value);
      if (!cancelled) {
        editor.replaceBlocks(editor.document, blocks);
      }
    };

    void loadContent();

    return () => {
      cancelled = true;
    };
  }, [documentKey, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    registerEditorView(editor as BlockNoteEditorView);

    const handleSelectionChange = async () => {
      const selection = editor.getSelection();
      const blocks = selection?.blocks ?? [];
      if (blocks.length === 0) {
        setSelection(null);
        setSelectedText("");
        return;
      }

      setSelection(null);
      const selectedMarkdown = await editor.blocksToMarkdownLossy(blocks);
      setSelectedText(selectedMarkdown);
    };

    editor.onSelectionChange(handleSelectionChange);
    void handleSelectionChange();

    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
        void flushEditorMarkdown();
      }
      registerEditorView(null);
      setSelection(null);
      setSelectedText("");
    };
  }, [editor, flushEditorMarkdown, registerEditorView, setSelectedText, setSelection]);

  const handleChange = useCallback(() => {
    if (!editor) {
      return;
    }
    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = window.setTimeout(() => {
      syncTimeoutRef.current = null;
      void flushEditorMarkdown();
    }, 250);
  }, [editor, flushEditorMarkdown]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-12rem)] w-full flex-1">
      <BlockNoteView
        editor={editor}
        editable={!readOnly}
        onChange={handleChange}
        className={className}
      />
    </div>
  );
}
