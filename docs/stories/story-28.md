# Story 28 — Markdown File Version History & Rollback

Goal: Let users view the latest 5 saved versions of any markdown file (plus the current state) in a right-sidebar panel, preview a historical version in the main view, and roll back to any version — without losing the current content as a new history entry.

## Scope
- In:
  - New `file_versions` table in Turso (SQLite) storing snapshot content + metadata.
  - Version capture on save (server action + REST route), with content-hash dedup and prune-to-5.
  - Version cleanup hooks in file delete, folder delete, and move/rename routes.
  - New "History" right-sidebar panel listing Current + latest 5 versions.
  - Read-only version preview in the main view with a banner (Rollback / Copy-to-editor / Close).
  - Rollback server action that preserves the current state as a new version first.
- Out:
  - Infinite retention (capped at 5 versions per file).
  - S3 native object versioning.
  - Version diff visualization (future enhancement).
  - Multi-file / bulk rollback.

## Deliverables
- `drizzle/app-schema.ts` — `fileVersions` table (separate from auth schema).
- `drizzle/migrations/*` — generated migration.
- `lib/fs/file-versions.ts` — capture/list/get/rollback/delete/rename logic.
- `app/actions/file-versions.ts` — auth-gated server actions.
- `app/actions/documents.ts` — capture hook on save.
- `app/api/fs/file/route.ts` — capture hook on PUT, cleanup on DELETE.
- `app/api/fs/folder/route.ts` — cleanup on folder delete.
- `app/api/fs/move/route.ts` — rename on move.
- `stores/layout.ts` — `"versions"` panel type.
- `stores/editor.ts` — version-preview state.
- `components/version-history/version-history-sidebar.tsx` — sidebar panel.
- `components/vault-workspace/sections/workspace-body.tsx` — preview banner.
- `components/vault-workspace/sections/header.tsx` — History toolbar button.
- `app/files/[[...path]]/page.tsx` — panel switch.
- `components/app-shell/hooks/use-right-sidebar-panel.tsx` — panel title.

## Acceptance Criteria
- After saving a file multiple times, the History sidebar shows Current + up to 5 version entries (newest first).
- Identical saves (no content change) do not create duplicate versions.
- Selecting a version renders its content read-only in the main view with a banner.
- "Roll back to this version" overwrites S3 with the selected version's content; the prior current content appears as the newest version entry.
- "Copy to editor" loads the version content as an unsaved edit (dirty=true) without writing to S3.
- Deleting a file removes its version history.
- Deleting a folder removes version history for all files under it.
- Renaming/moving a file transfers its version history to the new key.
- Rollback is disabled while the editor is in a conflict state.
- Lint and build pass.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-07-13 | feat | Added `file_versions` table to `drizzle/app-schema.ts` (split from auth schema for `auth:schema` safety), updated `drizzle.config.ts` for multi-schema, generated & applied migration `0001_eminent_forge.sql` |
| 2026-07-13 | feat | Implemented `lib/fs/file-versions.ts` — `captureFileVersion` (dedup via content-hash + prune-to-5), `getFileVersions`, `getFileVersionContent`, `deleteFileVersions`, `deleteFileVersionsByPrefix`, `renameFileVersions`. Rollback orchestration deferred to server action for clean separation (action fetches current → captures → writes old version → updates cache). |
| 2026-07-13 | feat | Created `app/actions/file-versions.ts` — `getFileVersionsAction`, `getFileVersionContentAction`, `rollbackToVersionAction` (all auth-gated via `getServerSession` + `isAllowedUser`). Rollback preserves current content as a version before overwriting S3, then revalidates caches + manifest. Added `readFileContent` helper to `lib/fs/file-cache.ts` (plain async, no `use cache`) for reading current file content in mutation contexts. |
| 2026-07-13 | feat | Wired `captureFileVersion` into both save entry points (`saveDocumentAction` + `PUT /api/fs/file`). Before writing, reads the current (soon-to-be-previous) content via `readFileContent`. After successful write + cache/manifest updates, captures the previous content as a version snapshot (skipped if identical to new content). Version capture is wrapped in try-catch and never blocks a successful save. |
| 2026-07-13 | feat | Added cleanup hooks: `deleteFileVersions(key)` in file DELETE route, `deleteFileVersionsByPrefix(prefix)` in folder DELETE route, `renameFileVersions(oldKey, newKey)` in move route (both file and folder paths). All follow the existing `void deleteFileMeta` / `void renameFileMeta` fire-and-forget pattern. |
| 2026-07-13 | feat | Implemented full UI for version history: (1) `"versions"` panel type in `stores/layout.ts` + `viewingVersion` state in `stores/editor.ts` (reset on `loadFile`); (2) `version-history-sidebar.tsx` — Current row + up to 5 version entries with relative/absolute timestamps, size, rollback button, loading skeletons, empty states; (3) Read-only version preview in `workspace-body.tsx` with amber banner showing version date + Close button, rendered via `MarkdownPreview`; (4) History toolbar button in `header.tsx` (desktop tooltip + mobile dropdown item) with `History` lucide icon; (5) Threaded `openVersionHistorySidebar` callback through `use-right-mobile-sheet.ts` → `app-shell.tsx` → `page.tsx` → `vault-workspace/index.tsx` → `use-workspace-header.tsx` → `header.tsx`; (6) Panel title "History" in `use-right-sidebar-panel.tsx`; (7) Panel switch in `page.tsx` wiring `VersionHistorySidebar` for the `"versions"` panel. |

## Issues

| Issue | Title | Status | File |
|---|---|---|---|
| 43 | @libsql/client fails to load in Turbopack serverless bundles (500 on save) | resolved | `docs/issues/issue-43.md` |
| 44 | @libsql/client hashed Turbopack external still 500s after createRequire fix | resolved | `docs/issues/issue-44.md` |

---

## Story 28.1 — Version Storage Schema & Migration
- Components
  - `drizzle/app-schema.ts`
    - `drizzle.config.ts`
    - `drizzle/migrations/*`
- Behavior
  - Add `file_versions` table to `drizzle/app-schema.ts` (separate from auth `drizzle/schema.ts` to survive `auth:schema` regen). Update `drizzle.config.ts` to include both schema files. Generate and apply the migration.

Sub-tasks
- [x] Add `fileVersions` table to `drizzle/schema.ts`
- [x] Run `pnpm db:generate` to create the migration
- [x] Run `pnpm db:migrate` to apply the migration

Test Plan
- Verify migration SQL file is created with `CREATE TABLE file_versions` and the index.
- Verify `pnpm db:migrate` completes without errors.

---

## Story 28.2 — Version Capture & Lifecycle Library
- Components
  - `lib/fs/file-versions.ts`
- Behavior
  - Implement `captureFileVersion` (insert + dedup + prune-to-5), `getFileVersions` (latest 5 metadata), `getFileVersionContent`, `deleteFileVersions`, `deleteFileVersionsByPrefix`, `renameFileVersions`. Rollback orchestration (preserve current as version → write old content to S3) is handled by the server action for clean separation of concerns.

Sub-tasks
- [x] Implement `lib/fs/file-versions.ts` with all CRUD + lifecycle functions

Test Plan
- Manual verification in Phase 3 when wired into the save flow.

---

## Story 28.3 — Server Actions & Capture Hooks
- Components
  - `app/actions/file-versions.ts`
  - `app/actions/documents.ts`
  - `app/api/fs/file/route.ts`
  - `app/api/fs/folder/route.ts`
  - `app/api/fs/move/route.ts`
- Behavior
  - Create auth-gated server actions for listing versions, fetching version content, and rollback. Wire `captureFileVersion` into the save path (server action + REST PUT). Add cleanup hooks in file delete, folder delete, and move routes.

Sub-tasks
- [x] Create `app/actions/file-versions.ts` with `getFileVersionsAction`, `getFileVersionContentAction`, `rollbackToVersionAction`
- [x] Wire `captureFileVersion` into `saveDocumentAction`
- [x] Wire `captureFileVersion` into `PUT /api/fs/file`
- [x] Add `deleteFileVersions` to file DELETE route
- [x] Add `deleteFileVersionsByPrefix` to folder DELETE route
- [x] Add `renameFileVersions` to move route (file + folder)

Test Plan
- Save a file, verify a version row is created in Turso.
- Delete a file, verify version rows are removed.
- Move a file, verify version rows transfer to the new key.

---

## Story 28.4 — History Sidebar & Version Preview UI
- Components
  - `stores/layout.ts`
  - `stores/editor.ts`
  - `components/version-history/version-history-sidebar.tsx`
  - `components/vault-workspace/sections/workspace-body.tsx`
  - `components/vault-workspace/sections/header.tsx`
  - `app/files/[[...path]]/page.tsx`
  - `components/app-shell/hooks/use-right-sidebar-panel.tsx`
- Behavior
  - Add "versions" panel type to the layout store. Create a History sidebar that lists Current + 5 versions. Add version-preview state to the editor store. Render a read-only preview with a banner (Rollback / Copy-to-editor / Close) in the workspace body. Add a History toolbar button.

Sub-tasks
- [x] Add `"versions"` to `RightSidebarPanel` in `stores/layout.ts`
- [x] Add version-preview state to `stores/editor.ts`
- [x] Create `components/version-history/version-history-sidebar.tsx`
- [x] Add preview rendering + banner to `workspace-body.tsx`
- [x] Add History button to `header.tsx` (desktop + mobile)
- [x] Wire panel switch in `page.tsx` + `use-right-sidebar-panel.tsx`

Test Plan
- Open History sidebar, verify Current + version entries appear.
- Select a version, verify read-only preview with banner.
- Click Rollback, verify content reverts and version list updates.
- Click Copy-to-editor, verify editor loads content as dirty.
- Switch files, verify version preview clears.

---

## Story 28.5 — Verification and Regression Checks
- Components
  - All modified files
- Behavior
  - Validate lint and build pass with all changes.

Sub-tasks
- [x] Run `pnpm lint`
- [x] Run `pnpm build`

Test Plan
- Smoke test: save flow, version list, preview, rollback, delete, move, mobile sidebar.

---

## Definition of Done
- Acceptance criteria met.
- Dev Log updated for each unit of work.
- Progress updated in `docs/PROGRESS.md`.

## References
- Analysis plan: version history discussion (Turso vs S3 vs hybrid).
- Architecture: `lib/fs/file-writer.ts`, `lib/fs/file-cache.ts`, `lib/platform/db.ts`.
