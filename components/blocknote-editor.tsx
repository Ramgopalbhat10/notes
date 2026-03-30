"use client";

import { useCallback, useEffect, useRef } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import type { BlockNoteEditor as BlockNoteEditorView } from "@blocknote/core";
import "@blocknote/mantine/style.css";
import { useEditorStore } from "@/stores/editor";
import { SelectionToolbar } from "@/components/ai-actions/selection-toolbar";
import type { AiActionType } from "@/components/vault-workspace/types";

type BlockNoteEditorProps = {
  documentKey?: string | null;
  value: string;
  onChange: (value: string) => void;
  onSelectionAction?: (action: AiActionType, source?: { selectionText: string; sourceView: "edit" }) => void;
  selectionAiBusy?: boolean;
  readOnly?: boolean;
  className?: string;
};

export function BlockNoteEditor({
  documentKey,
  value,
  onChange,
  onSelectionAction,
  selectionAiBusy = false,
  readOnly,
  className,
}: BlockNoteEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const registerEditorView = useEditorStore((state) => state.registerEditorView);
  const setSelection = useEditorStore((state) => state.setSelection);
  const setSelectedText = useEditorStore((state) => state.setSelectedText);
  const setSelectedBlockIds = useEditorStore((state) => state.setSelectedBlockIds);
  const selectedText = useEditorStore((state) => state.selectedText);
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
        setSelectedBlockIds([]);
        return;
      }

      setSelection(null);
      setSelectedBlockIds(
        blocks
          .map((block) => (typeof block.id === "string" ? block.id : ""))
          .filter(Boolean),
      );
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
      setSelectedBlockIds([]);
    };
  }, [editor, flushEditorMarkdown, registerEditorView, setSelectedBlockIds, setSelectedText, setSelection]);

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
    <div ref={containerRef} className="relative flex min-h-[calc(100vh-12rem)] w-full flex-1">
      {!readOnly && onSelectionAction ? (
        <SelectionToolbar
          boundaryRef={containerRef}
          preferredPlacement="below"
          selectedText={selectedText}
          busy={selectionAiBusy}
          disabled={selectionAiBusy}
          onSelect={(action) => onSelectionAction(action, { selectionText: selectedText, sourceView: "edit" })}
        />
      ) : null}
      <BlockNoteView
        editor={editor}
        editable={!readOnly}
        onChange={handleChange}
        className={className}
      />
    </div>
  );
}
