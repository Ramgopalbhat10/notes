# Issue 16 — Massive Refactor Roadmap Execution (Stability-First)

## Type
- refactor

## Status
- in-progress

## Related Story
- None

## Description
- Execute the large-scale refactor roadmap to simplify logic, remove duplication, improve module boundaries, and preserve existing behavior.
- Current units cover Phase 1 completion and Phase 2 kickoff (`VaultWorkspace` decomposition).

## Root Cause
- Client-side stores/components repeated network I/O and error parsing patterns (`fetch` + `response.ok` + JSON error extraction + unknown-error normalization) across multiple files.
- This duplication increases maintenance cost and creates inconsistent error behavior.

## Fix / Approach
- Introduced shared HTTP helpers in `lib/http/client.ts`:
  - `extractResponseError`
  - `getErrorMessage`
  - `parseJsonOrFallback`
- Migrated existing stores/components to these helpers without changing user-facing behavior.
- Kept compatibility wrapper (`extractTreeError`) in tree manifest client while delegating to shared helper.
- Continue roadmap in next units (Phase 2+ decomposition and feature-module organization).

## Subtasks
- [x] Create shared HTTP helper module for response/error parsing.
- [x] Migrate tree/editor/settings/public stores to shared helper usage.
- [x] Migrate file tree + AI workspace/chat components to shared helper usage.
- [x] Run quality checks (`pnpm lint`, `pnpm build`).
- [x] Start Phase 2 decomposition of `components/vault-workspace/index.tsx` into focused hooks/modules.
- [x] Continue Phase 2 by extracting route-path resolution and sibling navigation concerns into dedicated hooks.
- [x] Continue Phase 2 by extracting settings-sync and editor-load orchestration concerns into dedicated hooks.
- [x] Continue Phase 2 by extracting body rendering concerns into `WorkspaceBody`.
- [x] Continue Phase 2 by decomposing `WorkspaceHeader` composition concerns from `VaultWorkspace`.
- [x] Start Phase 3 decomposition of `components/app-shell.tsx` into responsive/layout/shortcut modules.
- [x] Continue Phase 3 by extracting global keyboard shortcut orchestration from `AppShell`.
- [x] Continue Phase 3 by extracting right sidebar mobile sheet state/handlers from `AppShell`.
- [x] Continue Phase 3 by extracting main scroll metrics/handlers from `AppShell`.
- [x] Continue Phase 3 by extracting right sidebar panel derivation (`title`, `new chat action`, outline render wiring).
- [x] Continue Phase 3 by extracting status/reading-time utility logic from `AppShell`.
- [x] Continue Phase 3 by extracting desktop sidebar shell sections (left/right) into dedicated components.
- [x] Continue Phase 3 by extracting auth/settings footer controls and auto-collapse behavior from `AppShell`.
- [x] Close Phase 3 by extracting `MainHeader` and `MainFooter` into dedicated app-shell modules.
- [x] Start Phase 4 decomposition of `stores/tree.ts` internals into focused modules.
- [x] Continue Phase 4 by extracting additional tree state mutator helpers from `stores/tree.ts`.
- [x] Continue Phase 4 by extracting route selection/history helpers from `stores/tree.ts`.
- [ ] Continue Phase 4 by extracting snapshot creation and editor-store lookup helpers from `stores/tree.ts`.

## Files Changed
- `lib/http/client.ts`
- `stores/settings.ts`
- `stores/public.ts`
- `stores/editor.ts`
- `stores/tree.ts`
- `lib/tree/manifest-client.ts`
- `lib/tree/mutation-queue.ts`
- `components/vault-workspace/use-ai-session.ts`
- `components/vault-workspace/use-file-sharing.ts`
- `components/vault-workspace/use-resolved-path.ts`
- `components/vault-workspace/use-sibling-navigation.ts`
- `components/vault-workspace/use-workspace-settings-sync.ts`
- `components/vault-workspace/use-workspace-file-sync.ts`
- `components/vault-workspace/use-workspace-header.tsx`
- `components/vault-workspace/workspace-body.tsx`
- `components/vault-workspace/index.tsx`
- `components/app-shell/use-left-sidebar-layout.ts`
- `components/app-shell/use-app-shell-shortcuts.ts`
- `components/app-shell/use-right-mobile-sheet.ts`
- `components/app-shell/use-main-scroll.ts`
- `components/app-shell/use-right-sidebar-panel.tsx`
- `components/app-shell/status-utils.ts`
- `components/app-shell/left-desktop-sidebar.tsx`
- `components/app-shell/right-desktop-sidebar.tsx`
- `components/app-shell/left-sidebar-footer.tsx`
- `components/app-shell/sidebar-auto-collapse.tsx`
- `components/app-shell/main-header.tsx`
- `components/app-shell/main-footer.tsx`
- `components/app-shell.tsx`
- `lib/tree/state-from-manifest.ts`
- `lib/tree/state-mutators.ts`
- `lib/tree/store-selection.ts`
- `stores/tree.ts`
- `components/file-tree/tree-nodes.tsx`
- `components/file-tree/hooks/use-modal-submit.ts`
- `components/ai-chat/sidebar-chat.tsx`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-03-02 | refactor | Completed Phase 1 shared client I/O + error handling extraction and migrated core stores/components to shared helpers. |
| 2026-03-02 | refactor | Started Phase 2 by extracting file sharing state/effects/handlers from `VaultWorkspace` into `use-file-sharing` hook while preserving behavior. |
| 2026-03-02 | refactor | Continued Phase 2 by extracting route-path resolution (`use-resolved-path`) and sibling navigation (`use-sibling-navigation`) concerns from `VaultWorkspace`. |
| 2026-03-02 | refactor | Continued Phase 2 by extracting settings-sync (`use-workspace-settings-sync`) and editor file-sync/dirty unload guards (`use-workspace-file-sync`) from `VaultWorkspace`. |
| 2026-03-02 | refactor | Continued Phase 2 by extracting workspace body rendering to `workspace-body.tsx` and simplifying `VaultWorkspace` composition. |
| 2026-03-02 | refactor | Continued Phase 2 by extracting header composition to `use-workspace-header.tsx`, reducing `VaultWorkspace` orchestration complexity. |
| 2026-03-02 | refactor | Started Phase 3 by extracting responsive left sidebar width/layout calculations from `AppShell` into `use-left-sidebar-layout`. |
| 2026-03-02 | refactor | Continued Phase 3 by extracting AppShell global keyboard shortcut orchestration into `use-app-shell-shortcuts`. |
| 2026-03-02 | refactor | Continued Phase 3 by extracting right mobile sheet state/handlers into `use-right-mobile-sheet` and wiring `AppShell` to use it. |
| 2026-03-02 | refactor | Continued Phase 3 by extracting main scroll metrics/behavior into `use-main-scroll`. |
| 2026-03-02 | refactor | Continued Phase 3 by extracting right panel derivation into `use-right-sidebar-panel` and status/read-time helpers into `status-utils`. |
| 2026-03-02 | refactor | Continued Phase 3 by extracting desktop left/right sidebar shell sections into `left-desktop-sidebar` and `right-desktop-sidebar` components. |
| 2026-03-02 | refactor | Continued Phase 3 by extracting auth/settings footer controls to `left-sidebar-footer` and moving auto-collapse behavior to `sidebar-auto-collapse`. |
| 2026-03-02 | refactor | Closed Phase 3 by extracting `main-header` and `main-footer` modules and simplifying `AppShell` to orchestration composition. |
| 2026-03-02 | refactor | Started Phase 4 by extracting `buildStateFromManifest` from `stores/tree.ts` into `lib/tree/state-from-manifest.ts`. |
| 2026-03-02 | refactor | Continued Phase 4 by extracting tree `addNodeToState`/`removeNodeFromState` mutators into `lib/tree/state-mutators.ts`. |
| 2026-03-02 | refactor | Continued Phase 4 by extracting tree route selection/history helpers (`parentKey`, `appendToHistoryIfNew`, `persistLastViewedFile`) into `lib/tree/store-selection.ts`. |

## Test Plan
- Run `pnpm lint`.
- Run `pnpm build`.
- Manual checks:
  - Open files, edit/save workflow.
  - Create/rename/move/delete from file tree modals.
  - Toggle public sharing state.
  - Run AI action panel and sidebar chat model loading.

## Definition of Done
- Refactor units in this issue preserve existing behavior.
- Lint/build pass for each unit.
- Dev Log updated for each completed unit.
- `docs/PROGRESS.md` reflects current and next actionable tasks.
- Status moved to `resolved` when roadmap execution tracked by this issue is complete.

## References
- `/home/jarvis/.windsurf/plans/massive-refactor-roadmap-03cd4a.md`
- `docs/WORKFLOW.md`
- `docs/WORKFLOW_LABELS.md`
