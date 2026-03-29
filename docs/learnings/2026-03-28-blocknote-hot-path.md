# 2026-03-28-blocknote-hot-path

- Area: `editor`
- Context: Implemented Issue 23 Phase 1 performance work for the personal vault editor and file-open flow.
- Symptom: Typing and selection in BlockNote could stall because the client converted the full document back to markdown on each change and walked every block again to derive selection offsets.
- Root cause: The editor store treated markdown as the immediate source of truth during edit mode, so common edit interactions paid full-document serialization costs instead of limiting markdown conversion to explicit boundaries.
- Fix:
  - Debounce full-document markdown sync from BlockNote into the editor store.
  - Serialize only the selected blocks for AI selection context instead of recomputing document-wide character offsets.
  - Flush the active editor document immediately on save and on editor unmount so preview/save behavior stays correct.
- Guardrails:
  - In BlockNote edit mode, keep the native editor state hot and treat markdown as a derived representation.
  - If another feature needs selected text during edit mode, prefer selected-block serialization over synthetic document offsets.
  - When switching away from the editor, flush pending debounced content so preview and persistence paths do not lag behind.
- References:
  - `components/blocknote-editor.tsx`
  - `stores/editor.ts`
