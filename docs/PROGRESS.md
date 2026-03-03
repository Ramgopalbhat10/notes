# Progress

Current issue: `docs/issues/issue-17.md`

Current section: Issue 17 — App-Wide Folder Restructuring

Previous tasks (latest completed batch only):
- [x] Restructured `components/app-shell/` into `hooks/` and `sections/` subfolders.
- [x] Restructured `components/vault-workspace/` into `hooks/` and `sections/` subfolders.
- [x] Restructured `lib/` into domain-based subfolders (`fs/`, `cache/`, `content/`, `platform/`).
- [x] Updated all imports across the codebase (~40 files).
- [x] Fixed infinite re-render bug caused by Zustand store destructuring without selectors.
- [x] Fixed root-cause infinite re-render: unstable inline callbacks in VaultWorkspace → useCallback.
- [x] Fixed stale manifest cache issues with Next.js 16 stale-while-revalidate semantics.
- [x] Ran quality gate checks (`pnpm lint`, `pnpm build`) successfully.

Next tasks:
- None - all tasks completed.

Bug fix details:
- Root cause: `revalidateTag(tag, "max")` in Next.js 16 uses stale-while-revalidate, serving stale cached data on first request after invalidation.
- Mutations no longer reload manifest (optimistic state preserved, manifestEtag cleared for next natural load).
- Manual refresh returns full manifest in response, bypassing stale "use cache" layer.
- Fixed `fetchManifest` to respect force parameter (skip If-None-Match header when force=true).

Notes:
- Follows consistent pattern established in `components/file-tree/hooks/`.
- Domain grouping for lib/: fs, cache, content, platform.
- Issue 16 (massive refactor phases 1-4) complete and merged.
