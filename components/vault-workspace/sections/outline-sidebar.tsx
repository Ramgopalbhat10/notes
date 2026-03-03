"use client";

import { MarkdownOutlinePanel } from "@/components/outline/markdown-outline-panel";
import { useEditorStore } from "@/stores/editor";

export function OutlineSidebar({ onNavigateToSection }: { onNavigateToSection?: () => void }) {
  const fileKey = useEditorStore((state) => state.fileKey);
  const content = useEditorStore((state) => state.content);
  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);

  if (!fileKey) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
        Select a file to view its outline.
      </div>
    );
  }

  return (
    <MarkdownOutlinePanel
      content={content}
      contextKey={fileKey}
      mode={mode}
      setMode={setMode}
      onNavigateToSection={onNavigateToSection}
      scrollBehaviorMode="instant"
    />
  );
}
