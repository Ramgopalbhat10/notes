# Issue 17 — App-Wide Folder Restructuring

## Type
- refactor

## Status
- resolved

## Related Story
- None

## Description
- Restructure component and lib folders to follow consistent organizational patterns.
- Move hooks into `hooks/` subfolders and UI sections into `sections/` subfolders for component modules.
- Group lib modules into domain-based subfolders (fs, cache, content, platform).

## Root Cause
- Current folder structure is inconsistent: `file-tree` has a `hooks/` subfolder but `app-shell` and `vault-workspace` have flat structures with hooks mixed alongside components.
- `lib/` has ~20 top-level files without clear domain grouping, making navigation harder.

## Fix / Approach
- Restructure `components/app-shell/` into:
  - `hooks/` — custom hooks (`use-*.ts`)
  - `sections/` — UI section components (sidebars, header, footer)
  - Keep `status-utils.ts` at root as shared utility
- Restructure `components/vault-workspace/` into:
  - `hooks/` — custom hooks (`use-*.ts`)
  - `sections/` — UI section components (body, header, panels)
  - Keep `constants.ts` and `types.ts` at root
- Restructure `lib/` into domain subfolders:
  - `lib/fs/` — filesystem utilities (file-cache, file-meta, file-writer, fs-validation, s3, s3-body)
  - `lib/cache/` — caching utilities (manifest-store, redis-client)
  - `lib/content/` — content processing (markdown-outline, markdown-image-policy, reading-time, slug-resolver)
  - `lib/platform/` — platform utilities (db, paths, persistent-document-cache, persistent-preferences, site-metadata)
  - Keep existing grouped folders: `lib/tree/`, `lib/http/`, `lib/auth/`, `lib/ai/`
- Update all imports across the codebase to reflect new paths.
- Preserve all existing functionality.

## Subtasks
- [x] Restructure `components/app-shell/` into hooks/ and sections/ subfolders.
- [x] Restructure `components/vault-workspace/` into hooks/ and sections/ subfolders.
- [x] Restructure `lib/` into domain-based subfolders.
- [x] Run quality checks (`pnpm lint`, `pnpm build`).

## Files Changed
- `components/app-shell/*` (moved to subfolders)
- `components/vault-workspace/*` (moved to subfolders)
- `lib/*` (moved to domain subfolders)
- All files with updated imports

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-03-03 | refactor | Restructured `components/app-shell/` into `hooks/` (5 hooks) and `sections/` (6 components), updated imports in `app-shell.tsx`. |
| 2026-03-03 | refactor | Restructured `components/vault-workspace/` into `hooks/` (7 hooks) and `sections/` (6 components), updated imports in `index.tsx` and `app/files/[[...path]]/page.tsx`. |
| 2026-03-03 | refactor | Restructured `lib/` into domain subfolders: `fs/` (6 files), `cache/` (2 files), `content/` (4 files), `platform/` (5 files). Updated ~40 files with new import paths. |
| 2026-03-03 | fix | Fixed infinite re-render bug in `LeftSidebarFooter` caused by Zustand store destructuring without selectors. |
| 2026-03-03 | fix | Fixed root-cause infinite re-render: inline arrow functions for `onToggleMode`/`onTriggerAction` in VaultWorkspace created new refs every render, invalidating `useWorkspaceHeader`'s `useMemo`, causing `setHeader` to fire every render cycle. Wrapped in `useCallback`. |
| 2026-03-03 | fix | Fixed stale manifest cache bug: `revalidateTag(tag, "max")` in Next.js 16 uses stale-while-revalidate semantics, serving stale cached data on first request after invalidation. Mutations no longer reload manifest (preserves optimistic state), manual refresh returns full manifest in response (bypasses stale cache), and `fetchManifest` now respects force parameter. Fixes folder creation disappearing and deletion reappearing. |
| 2026-03-03 | fix | Fixed Sonar security and code review issues: localeCompare for sort stability, keyboard listener on interactive div, Promise misuse in copy-to-clipboard handler, ReDoS-safe regex patterns, and move API field mismatch (from/to → fromKey/toKey). |

## Test Plan
- Run `pnpm lint`.
- Run `pnpm build`.
- Manual checks:
  - Open files, edit/save workflow.
  - Create/rename/move/delete from file tree modals.
  - Toggle public sharing state.
  - Run AI action panel and sidebar chat.

## Definition of Done
- All folder restructuring complete.
- All imports updated and verified.
- Lint/build pass.
- Dev Log updated for each completed unit.
- `docs/PROGRESS.md` reflects current and next actionable tasks.
- Status moved to `resolved` when complete.

## References
- `docs/issues/issue-16.md` (predecessor refactor)
- `docs/WORKFLOW.md`
