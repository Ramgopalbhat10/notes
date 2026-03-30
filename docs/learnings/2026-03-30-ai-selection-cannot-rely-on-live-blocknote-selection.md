# 2026-03-30-ai-selection-cannot-rely-on-live-blocknote-selection

- Area: `ai`
- Context: Moving AI actions from an inline result card to a right-sidebar review workspace means users leave the editor before applying the generated draft.
- Symptom: Replacing a selected passage with AI output can fail or insert in the wrong place if the implementation relies on the live BlockNote selection at apply time.
- Root cause: BlockNote selection is transient UI state. Once focus moves into the sidebar, the live selection can collapse or point somewhere else.
- Fix:
  - Snapshot selected block IDs when the AI action starts.
  - Re-find those blocks in the editor document when applying `replace` or `insert below`.
  - Use whole-document replacement only when the action was document-scoped.
- Guardrails:
  - Do not depend on `editor.getSelection()` for deferred apply flows that involve leaving the editor surface.
  - Preserve a stable editor-side anchor whenever AI output is reviewed outside the editor column.
- References:
  - `components/blocknote-editor.tsx`
  - `stores/editor.ts`
  - `components/ai-actions/hooks/use-ai-action-controller.ts`
