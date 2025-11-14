"use client";

import { useCallback, useEffect, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  type ViewUpdate,
  type KeyBinding,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
};

const baseExtensions = [
  lineNumbers(),
  history(),
  drawSelection(),
  highlightActiveLine(),
  highlightActiveLineGutter(),
  EditorView.lineWrapping,
  markdown({ base: markdownLanguage }),
];

const baseKeyBindings: KeyBinding[] = [
  ...defaultKeymap,
  ...historyKeymap,
  indentWithTab,
];

const sharedKeymap = keymap.of(baseKeyBindings);

const editorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--card)",
      color: "var(--foreground)",
      fontFamily: "var(--font-mono)",
      fontSize: "0.875rem",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-mono)",
      lineHeight: "1.6",
      backgroundColor: "var(--card)",
    },
    ".cm-content": {
      backgroundColor: "var(--card)",
      padding: "1.25rem",
    },
    ".cm-lineNumbers": {
      color: "var(--muted-foreground)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--card)",
      borderRight: `1px solid var(--border)`,
      color: "var(--muted-foreground)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "color-mix(in srgb, var(--muted) 25%, transparent)",
      color: "var(--foreground)",
    },
    ".cm-activeLine": {
      backgroundColor: "color-mix(in srgb, var(--muted) 30%, transparent)",
    },
    ".cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "color-mix(in srgb, var(--primary) 50%, var(--card))",
    },
    "&.cm-focused .cm-selectionBackground, &.cm-focused .cm-content ::selection": {
      backgroundColor: "color-mix(in srgb, var(--primary) 60%, var(--card))",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "var(--background)",
      border: "1px solid var(--border)",
      color: "var(--muted-foreground)",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--primary)",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--popover)",
      color: "var(--popover-foreground)",
      border: `1px solid var(--border)`
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "var(--border)",
    },
    ".ͼc" : {
      color: "#7764ff"
    }
  },
  { dark: true },
);

export function MarkdownEditor({ value, onChange, readOnly, className }: MarkdownEditorProps) {
  const extensions = useMemo(() => {
    return [EditorState.tabSize.of(2), ...baseExtensions, sharedKeymap, editorTheme];
  }, []);

  const registerEditorView = useEditorStore((state) => state.registerEditorView);
  const setSelection = useEditorStore((state) => state.setSelection);

  const handleChange = useCallback(
    (next: string, _update: ViewUpdate) => {
      void _update;
      onChange(next);
    },
    [onChange],
  );

  const handleCreateEditor = useCallback(
    (view: EditorView) => {
      registerEditorView(view);
      const main = view.state.selection.main;
      setSelection({ from: main.from, to: main.to });
    },
    [registerEditorView, setSelection],
  );

  const handleUpdate = useCallback(
    (update: ViewUpdate) => {
      if (update.selectionSet) {
        const main = update.state.selection.main;
        setSelection({ from: main.from, to: main.to });
      }
    },
    [setSelection],
  );

  useEffect(() => {
    return () => {
      registerEditorView(null);
      setSelection(null);
    };
  }, [registerEditorView, setSelection]);

  return (
    <div className={cn("rounded-lg border bg-background w-full", className)}>
      <CodeMirror
        value={value}
        extensions={extensions}
        onChange={handleChange}
        onCreateEditor={handleCreateEditor}
        onUpdate={handleUpdate}
        editable={!readOnly}
        height="100%"
        minHeight="480px"
        theme="none"
        basicSetup={{
          autocompletion: false,
          bracketMatching: true,
          foldGutter: true,
          highlightActiveLine: false,
          highlightSelectionMatches: false,
        }}
      />
    </div>
  );
}
