# Story 16 — Desktop Header File Navigation (Sibling Files Only)

Goal: Add desktop-only previous/next file navigation controls to the workspace header that move within file siblings in the current parent folder while preserving existing unsaved-change safeguards.

## Scope
- In: sibling-file navigation state derivation in workspace state, desktop header arrow buttons (`left` and `right`), button enabled/disabled rules, separator grouping with expand-width control, route transition via existing tree selection flow, and story/index documentation updates.
- Out: mobile/tablet navigation UI changes, keyboard shortcut additions for prev/next, tree sorting behavior changes, wrap-around navigation (first to last), and root-level file navigation.

## Deliverables
- `components/vault-workspace/index.tsx` updated with sibling-file navigation derivation and handlers using `useTreeStore().select`.
- `components/vault-workspace/header.tsx` updated with new desktop-only arrow icon controls and separator before expand-width icon.
- `docs/stories/story-16.md` added with implementation breakdown and verification checklist.
- `docs/stories/README.md` updated with Story 16 index entry.

## Acceptance Criteria
- Header shows left/right arrow navigation controls only on `lg` and above.
- Navigation buttons are enabled only when sibling files exist in the current parent folder.
- Left button is disabled for first file; right button is disabled for last file.
- For folders containing both files and folders, navigation moves only among file siblings.
- For parent folders containing one or zero files, both buttons are disabled.
- For root-level files (no parent folder), both buttons are disabled.
- Clicking navigation uses existing `select()` flow and preserves unsaved/conflict confirmation behavior.
- Existing edit/preview/save/help/actions behavior remains unchanged.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-13 | feat | Desktop header sibling-file navigation (arrows, desktop-only). |
| 2026-02-13 | docs | Workflow/progress/learnings docs + AGENTS pointer refresh. |
| 2026-02-13 | docs | Learnings moved to `docs/learnings/` (index + per-item files). |
| 2026-02-13 | docs | Decisions live in `docs/decisions/` (index + moved ADRs). |
| 2026-02-13 | docs | Added story template `docs/stories/template.md` and updated workflow docs. |

---

## Story 16.1 — State Derivation in VaultWorkspace
- Components
  - `components/vault-workspace/index.tsx`
- Behavior
  - Determine previous and next file IDs from the selected file's parent folder children.
  - Exclude folders from sibling navigation.
  - Return disabled state when no valid navigation target exists.

Sub-tasks
- [x] Read selected node from tree state and ensure it is a file.
- [x] Require non-null `parentId` (disable navigation for root files).
- [x] Resolve parent folder and filter child nodes to files only.
- [x] Compute index-based `prevId` and `nextId`.
- [x] Expose `canNavigatePrev` and `canNavigateNext` booleans.

Test Plan
- Verify first/middle/last file state transitions for a folder with 3 files.
- Verify disabled states for single-file folder and for root-level file.
- Verify mixed file/folder parent navigates only across files.

---

## Story 16.2 — Header UI (Arrow Buttons + Separator, Desktop-Only)
- Components
  - `components/vault-workspace/header.tsx`
- Behavior
  - Add left/right arrow icon buttons to the left of expand-width icon.
  - Keep controls desktop-only (`hidden lg:inline-flex`), aligned with expand icon visibility.
  - Add a vertical separator between navigation group and expand-width control.

Sub-tasks
- [x] Extend `WorkspaceHeaderProps` with navigation booleans and callbacks.
- [x] Import and render `ArrowLeft` and `ArrowRight` buttons with tooltips.
- [x] Wire `disabled` state to navigation booleans and callback presence.
- [x] Insert separator between nav controls and expand-width button.
- [x] Keep breadcrumb chevrons unchanged.

Test Plan
- Validate nav controls appear on `lg+` and are hidden below `lg`.
- Validate separator placement/grouping in header.
- Validate help/menu/edit/save controls still render and function.

---

## Story 16.3 — Navigation Behavior + Unsaved Guard Preservation
- Components
  - `components/vault-workspace/index.tsx`
  - `app/files/[[...path]]/page.tsx` (existing route synchronization behavior)
- Behavior
  - Navigation handlers call `select(targetId)` instead of direct routing.
  - Existing unsaved-change confirmation logic remains authoritative.
  - Existing route synchronization updates URL after selection.

Sub-tasks
- [x] Implement `handleNavigatePrev` and `handleNavigateNext` via `select`.
- [x] Pass navigation props and handlers into `WorkspaceHeader`.
- [x] Keep non-wrapping behavior at boundaries (first/last).

Test Plan
- With unsaved edits, click next/prev and verify confirmation prompt appears.
- Cancel prompt and verify current file remains selected.
- Confirm prompt and verify route + content switch to target file.

---

## Story 16.4 — Verification and Regression Checks
- Components
  - `components/vault-workspace/index.tsx`
  - `components/vault-workspace/header.tsx`
  - `docs/stories/README.md`
  - `docs/stories/story-16.md`
- Behavior
  - Validate functional scenarios and ensure no regressions to existing header and workspace behavior.

Sub-tasks
- [x] Run lint checks.
- [x] Run production build checks.
- [x] Manually validate the documented navigation scenarios.
- [x] Update stories index entry.

Test Plan
- Run `pnpm lint`.
- Run `pnpm build`.
- Smoke test navigation state matrix and desktop-only rendering behavior.

---

## Definition of Done
- Desktop header includes file-sibling left/right arrow navigation controls with proper grouping and separator.
- Button states correctly reflect sibling-file position and file availability in parent folder.
- Navigation preserves existing unsaved-change and route synchronization behavior.
- Story 16 document is present and the stories index includes Story 16.
- Lint/build checks pass.

## References
- `components/vault-workspace/index.tsx`
- `components/vault-workspace/header.tsx`
- `app/files/[[...path]]/page.tsx`
- `docs/stories/README.md`
