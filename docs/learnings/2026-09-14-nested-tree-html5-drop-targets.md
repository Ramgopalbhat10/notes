# 2026-09-14-nested-tree-html5-drop-targets

- Area: `tree`
- Context: Sidebar file/folder moves now use HTML5 drag-and-drop on a nested tree. Dropping between items or onto a nested folder must resolve to that folder, not bubble to Vault root.
- Symptom: Without stopping propagation on row `dragover`/`drop`, the tree container treats the event as a root drop and files jump to the top level.
- Root cause: Nested drag-and-drop targets share the same event path; the outer tree is also a valid root drop zone.
- Fix: Child rows and expanded folder groups call `preventDefault` and `stopPropagation` on `dragover`/`drop`, and destination highlighting is driven by React state (`dropParentId`) rather than CSS `:hover` alone.
- Guardrails: Any new drop target inside the file tree must stop propagation. Keep destination checks in `lib/tree/move-destination.ts` so the dialog picker, drag-and-drop, and `moveNode` share the same self/subtree/collision rules.
- References: `components/file-tree/hooks/use-tree-drag-drop.ts`, `components/file-tree/tree-nodes.tsx`, `lib/tree/move-destination.ts`
