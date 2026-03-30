# 2026-03-30-preview-selection-apply-needs-stable-context

- Area: `ai`
- Context: Preview-mode AI actions let users highlight rendered markdown and review the draft in the assistant sidebar before applying it back to the note source.
- Symptom: Applying a preview-scoped draft can replace the wrong occurrence or append to the end of the note when the selected text is formatted or repeated elsewhere.
- Root cause: Rendered preview text is not a stable source anchor. The raw markdown may include formatting markers or duplicate text, so first-occurrence string replacement is not sufficient.
- Fix:
  - Snapshot short normalized context before and after the selected preview text.
  - Use that context to derive a stable selection identity for session reuse.
  - Resolve preview apply operations back into markdown source ranges before replacing or inserting.
- Guardrails:
  - Do not key preview selections by selected text alone when duplicates can exist in the same note.
  - Do not apply preview selections by naive `indexOf` on raw markdown.
- References:
  - `components/ai-actions/preview-selection-surface.tsx`
  - `components/ai-actions/hooks/use-ai-action-controller.ts`
  - `stores/editor.ts`
  - `lib/ai/selection-anchor.ts`
