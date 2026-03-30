"use client";

import { useEffect, useRef, useState } from "react";

import { MarkdownPreview } from "@/components/markdown-preview";
import type { AiActionType } from "@/components/vault-workspace/types";
import { SelectionToolbar } from "./selection-toolbar";

type PreviewSelectionSurfaceProps = {
  content: string;
  busy: boolean;
  onSelectAction: (action: AiActionType, selectionText: string) => void;
};

export function PreviewSelectionSurface({
  content,
  busy,
  onSelectAction,
}: PreviewSelectionSurfaceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");

  useEffect(() => {
    const updateSelection = () => {
      const root = rootRef.current;
      const selection = window.getSelection();
      if (!root || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setSelectedText("");
        return;
      }

      const range = selection.getRangeAt(0);
      const ancestor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : (range.commonAncestorContainer as Element | null);

      if (!ancestor || !root.contains(ancestor)) {
        setSelectedText("");
        return;
      }

      setSelectedText(selection.toString().trim());
    };

    document.addEventListener("selectionchange", updateSelection);
    window.addEventListener("blur", updateSelection);

    return () => {
      document.removeEventListener("selectionchange", updateSelection);
      window.removeEventListener("blur", updateSelection);
    };
  }, []);

  useEffect(() => {
    setSelectedText("");
  }, [content]);

  return (
    <div ref={rootRef} className="relative rounded-lg w-full overflow-hidden px-4 md:px-0">
      <SelectionToolbar
        boundaryRef={rootRef}
        selectedText={selectedText}
        busy={busy}
        disabled={busy}
        onSelect={(action) => onSelectAction(action, selectedText)}
      />
      <MarkdownPreview content={content} parseIncompleteMarkdown={false} />
    </div>
  );
}
