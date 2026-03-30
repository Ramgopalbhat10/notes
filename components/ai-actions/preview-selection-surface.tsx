"use client";

import { useEffect, useRef, useState } from "react";

import { MarkdownPreview } from "@/components/markdown-preview";
import { buildPreviewSelectionAnchor, normalizeAnchorText } from "@/lib/ai/selection-anchor";
import type { AiActionSelectionSource } from "@/components/ai-actions/types";
import type { AiActionType } from "@/components/vault-workspace/types";
import { SelectionToolbar } from "./selection-toolbar";

type PreviewSelectionSurfaceProps = {
  content: string;
  busy: boolean;
  onSelectAction: (action: AiActionType, source: AiActionSelectionSource) => void;
};

function getTextOffsetWithin(root: HTMLElement, container: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(container, offset);
  return range.toString().length;
}

export function PreviewSelectionSurface({
  content,
  busy,
  onSelectAction,
}: PreviewSelectionSurfaceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectedSource, setSelectedSource] = useState<AiActionSelectionSource | null>(null);

  useEffect(() => {
    const updateSelection = () => {
      const root = rootRef.current;
      const selection = window.getSelection();
      if (!root || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setSelectedSource(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const ancestor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : (range.commonAncestorContainer as Element | null);

      if (!ancestor || !root.contains(ancestor)) {
        setSelectedSource(null);
        return;
      }

      const fullText = root.textContent ?? "";
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;
      const startOffset = getTextOffsetWithin(root, startContainer, range.startOffset);
      const endOffset = getTextOffsetWithin(root, endContainer, range.endOffset);
      const selected = normalizeAnchorText(fullText.slice(startOffset, endOffset));

      if (!selected) {
        setSelectedSource(null);
        return;
      }

      setSelectedSource({
        selectionText: selected,
        sourceView: "preview",
        previewAnchor: buildPreviewSelectionAnchor(fullText, startOffset, endOffset),
      });
    };

    document.addEventListener("selectionchange", updateSelection);
    window.addEventListener("blur", updateSelection);

    return () => {
      document.removeEventListener("selectionchange", updateSelection);
      window.removeEventListener("blur", updateSelection);
    };
  }, []);

  useEffect(() => {
    setSelectedSource(null);
  }, [content]);

  return (
    <div ref={rootRef} className="relative rounded-lg w-full overflow-hidden px-4 md:px-0">
      <SelectionToolbar
        boundaryRef={rootRef}
        selectedText={selectedSource?.selectionText ?? ""}
        busy={busy}
        disabled={busy}
        onSelect={(action) => {
          if (!selectedSource) {
            return;
          }
          onSelectAction(action, selectedSource);
        }}
      />
      <MarkdownPreview content={content} parseIncompleteMarkdown={false} />
    </div>
  );
}
