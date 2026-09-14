# Story 30 — Move via Folder Tree and Sidebar Drag-and-Drop

Goal: Let users move files and folders by picking a destination folder in a tree, or by dragging an item onto a folder in the left sidebar, instead of typing a path.

## Scope
- In: Move dialog folder picker (folders + vault root), sidebar HTML5 drag-and-drop onto folders/root, client-side destination validation (self, subtree, collision, current location).
- Out: Reordering siblings, multi-select moves, creating a folder from the move dialog, touch-specific drag handles, changing the move API.

## Deliverables
- `lib/tree/move-destination.ts` — shared destination rules used by the store, dialog, and drag-and-drop.
- `components/file-tree/folder-picker.tsx` — folder tree used by the Move dialog.
- `components/file-tree/hooks/use-tree-drag-drop.ts` — sidebar drag state and drop handling.
- Updates to the file tree nodes, action dialog, modal submit hook, and `moveNode` store action.

## Acceptance Criteria
- Move dialog shows a folder tree (including Vault root), not a free-text path field.
- Invalid destinations are visible but not selectable: current folder, the item itself, descendants of a folder being moved, and name collisions.
- Dragging a file or folder onto a valid sidebar folder (or Vault root) moves it and shows a success toast.
- Keyboard Move (⇧⌘M / context menu) still works through the dialog.
- `pnpm lint` and `pnpm build` pass.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-09-14 | feat | Replaced the Move path input with a searchable folder tree, added sidebar drag-and-drop onto folders/Vault root, and shared destination validation (self, subtree, collision). |

## Issues

| Issue | Title | Status | File |
|---|---|---|---|

---

## Story 30.1 — Destination picker in the Move dialog
- Components
  - `components/file-tree/action-dialog.tsx`
  - `components/file-tree/folder-picker.tsx`
  - `components/file-tree/hooks/use-modal-submit.ts`
  - `lib/tree/move-destination.ts`
  - `stores/tree.ts`
- Behavior
  - Replace the destination path input with a searchable, expandable folder tree and a Vault root row.
  - Preselect the current parent; disable Move until a different valid folder is chosen.
  - Block folder-into-self and folder-into-descendant before the API call.

Sub-tasks
- [x] Add shared move-destination helpers and store-side validation.
- [x] Render a folder picker in the Move dialog and submit the selected parent id.

Test Plan
- Open Move on a nested file: tree shows ancestors expanded, current folder marked, Move disabled until another folder is selected.
- Move a file into another folder via the dialog; it appears under that folder.
- Attempt to move a folder into itself or a child; the destination is disabled / Move stays off.

---

## Story 30.2 — Sidebar drag-and-drop moves
- Components
  - `components/file-tree/tree-nodes.tsx`
  - `components/file-tree/index.tsx`
  - `components/file-tree/hooks/use-tree-drag-drop.ts`
- Behavior
  - Files and folders in the left sidebar are draggable.
  - Folders and Vault root are drop targets; dropping on a file targets that file’s parent folder.
  - Valid targets highlight; invalid targets show a not-allowed state; successful drops toast like the dialog.

Sub-tasks
- [x] Wire HTML5 drag-and-drop on sidebar rows with destination highlighting.
- [x] Auto-expand a closed folder after hovering it during a drag.

Test Plan
- Drag a file onto another folder; it moves and a toast appears.
- Drag a folder onto Vault root; it lands at the top level.
- Drag a folder onto itself or a descendant; the drop is rejected without a move.
- Drag onto a file: the file’s parent highlights and receives the drop.

---

## Story 30.3 — Verification and Regression Checks
- Components
  - File tree sidebar and Move dialog
- Behavior
  - Validate the new move flows and ensure create/rename/delete and keyboard shortcuts still work.

Sub-tasks
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [ ] Manually verify dialog picker, sidebar drag-and-drop, and existing tree actions.

Test Plan
- Create, rename, delete, and keyboard Move still work.
- Name collision at the destination surfaces an error instead of a 409-only surprise.
- Mobile/small view: Move dialog picker remains usable (drag-and-drop is a desktop enhancement).

---

## Definition of Done
- Acceptance criteria met.
- Dev Log updated for each unit of work.
- Progress updated in `docs/PROGRESS.md`.

## References
- Predecessor: `docs/stories/story-2.md` (minimal path-input Move dialog)
- Nested folder guard: `docs/issues/issue-47.md`
