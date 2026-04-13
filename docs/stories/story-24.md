# Story 24 - Grouped Quick Switcher With Shadcn Command

Goal: Add a global quick switcher for the authenticated `/files` workspace so users can open notes faster with a grouped `Cmd/Ctrl+K` command menu and lightweight create actions.

## Scope
- In: shadcn `command` UI primitive, workspace-scoped quick switcher dialog, grouped file results, recent items, `Cmd/Ctrl+K` shortcut, header/menu trigger, and reuse of existing create-file/create-folder dialogs.
- Out: chat/outline/AI commands, folder-opening flows, multi-step command menus, non-`/files` routes, and any replacement of existing tree search.

## Deliverables
- `components/ui/command.tsx` added using the repo's existing shadcn-style conventions.
- New quick switcher component mounted from the app shell and wired to tree state.
- Header/menu trigger for touch and mouse discoverability.
- Story/index/progress documentation updates.

## Acceptance Criteria
- `Cmd/Ctrl+K` toggles a quick switcher in the `/files` workspace.
- The quick switcher shows a `Recent` group first, then files grouped by top-level folder, with root files under `Ungrouped` when present.
- Search matches file name and path using existing normalized tree data.
- Selecting a file uses existing tree selection flow and preserves unsaved-change safeguards.
- `New file` and `New folder` commands open the existing creation dialog with the current file's parent folder as the default target when a file is open, otherwise root.
- Existing shortcuts such as `Cmd/Ctrl+S` and `Cmd/Ctrl+J` continue to work.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-13 | feat | Added a grouped quick switcher with recent files, file groups, and create actions. |
| 2026-04-13 | docs | Added Story 24 workflow tracking and updated progress after implementation verification. |
| 2026-04-13 | fix | Stabilized shell callback wiring to stop the header render loop and added accessible dialog metadata for the quick switcher. |
| 2026-04-13 | qa | Manually verified quick switcher open, grouped search, file selection, and create-action flows in the authenticated `/files` workspace. |
| 2026-04-13 | fix | Bucketed vault-root files into the `Ungrouped` quick-switcher section to address PR review feedback. |

## Issues

| Issue | Title | Status | File |
|---|---|---|---|

---

## Story 24.1 - Command Primitive and Quick Switcher Result Model
- Components
  - `components/ui/command.tsx`
  - `components/quick-switcher.tsx`
- Behavior
  - Add the shadcn command primitive and build grouped file results from tree state, including `Recent`, top-level folder groups, and `Ungrouped`.

Sub-tasks
- [x] Add the shadcn-style `command` UI primitive.
- [x] Build grouped file results from `useTreeStore.nodes`, `rootIds`, and `viewHistory`.
- [x] Filter results to files while using folders only as group labels.
- [x] Search by file name and path.

Test Plan
- Open the quick switcher and verify recent items and grouped file sections render with and without a query.

---

## Story 24.2 - Shell Integration, Shortcuts, and Create Actions
- Components
  - `components/app-shell.tsx`
  - `components/app-shell/hooks/use-app-shell-shortcuts.ts`
  - `components/vault-workspace/sections/header.tsx`
  - `components/file-tree/index.tsx`
- Behavior
  - Mount the dialog in the shell, wire `Cmd/Ctrl+K`, add a visible trigger, and route create commands through the existing tree action dialog.

Sub-tasks
- [x] Add shell-level open state for the quick switcher.
- [x] Wire `Cmd/Ctrl+K` toggle behavior without breaking existing shortcuts.
- [x] Add a visible trigger in the workspace header actions.
- [x] Reuse the existing file-tree action dialog for `New file` and `New folder`.

Test Plan
- Verify keyboard toggle, header trigger, file selection, and create-action flows on desktop and mobile layouts.

---

## Story 24.3 - Verification and Regression Checks
- Components
  - `components/quick-switcher.tsx`
  - `components/app-shell.tsx`
  - `components/vault-workspace/sections/header.tsx`
  - `docs/stories/story-24.md`
  - `docs/PROGRESS.md`
- Behavior
  - Validate the new workflow and ensure no regressions in the shell, header, and existing shortcuts.

Sub-tasks
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [x] Manually verify quick switcher open, search, selection, and create-action behavior.

Test Plan
- Smoke test `Cmd/Ctrl+K`, `Cmd/Ctrl+J`, `Cmd/Ctrl+S`, unsaved-change prompts, and grouped result ordering.

---

## Definition of Done
- The `/files` workspace has a grouped quick switcher with recent notes and create actions.
- Existing shell and tree behaviors continue to work without regression.
- Story/index/progress docs are current.

## References
- `components/app-shell.tsx`
- `components/vault-workspace/sections/header.tsx`
- `components/file-tree/index.tsx`
- `stores/tree.ts`
