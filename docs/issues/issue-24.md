# Issue 24 - Parallelize AI and S3 hot paths, and trim startup overhead

## Type
- performance

## Status
- resolved

## Related Story
- None

## Description
- Several high-latency paths still perform independent work sequentially, which makes AI actions, large folder operations, and full tree refreshes slower than necessary.
- The startup path also still contains a duplicated settings fetch even though only one request is needed to bootstrap workspace behavior.

## Root Cause
- AI chunk processing still serializes multi-chunk model calls even when chunk fan-out is already capped.
- Folder delete and full tree rebuild paths keep independent S3 work on a single sequential path.
- The workspace boot path requests settings from two different effects even though the store already centralizes the fetch state.

## Fix / Approach
- Add shared bounded-concurrency helpers for server-side async work.
- Parallelize chunked AI summary/rewrite generation with conservative concurrency while preserving output order and current response contracts.
- Reuse the shared helper in folder delete, keep move copy-before-delete semantics, and overlap only safe move preflight work.
- Rebuild the manifest with concurrent prefix scanning while keeping per-prefix pagination sequential and manifest output deterministic.
- Remove the duplicate client settings fetch and preserve the existing manifest -> route -> file load flow.

## Subtasks
- [x] Add shared bounded-concurrency helpers and parallelize AI chunk processing.
- [x] Reuse bounded concurrency in S3 folder operations and tighten move preflight sequencing.
- [x] Convert manifest rebuild scanning to a concurrency-limited worker pool.
- [x] Remove the duplicate startup settings fetch.
- [x] Run `pnpm lint` and `pnpm build`.
- [x] Update issue/progress docs and resolve the issue.

## Files Changed
- `app/api/ai/action/route.ts`
- `app/api/fs/folder/route.ts`
- `app/api/fs/move/route.ts`
- `components/vault-workspace/hooks/use-workspace-settings-sync.ts`
- `components/vault-workspace/index.tsx`
- `lib/async/concurrency.ts`
- `lib/file-tree-builder.ts`
- `docs/issues/issue-24.md`
- `docs/issues/README.md`
- `docs/PROGRESS.md`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-09 | perf | Opened Issue 24 for the AI chunking, S3 hot-path, tree-refresh, and startup-fetch performance pass; created branch `fix/performance-parallel-hot-paths`; and started implementation. |
| 2026-04-09 | perf | Added shared bounded-concurrency helpers, parallelized safe AI/S3/tree-refresh hot paths, removed the duplicate settings fetch, and verified with `pnpm lint` plus `pnpm build` using temporary placeholder GitHub auth env vars because the local shell lacked `GH_CLIENT_ID`/`GH_CLIENT_SECRET`. |
| 2026-04-09 | fix | Restored the folder-move destination emptiness check to run after source listing for `overwrite=false` so the performance pass does not widen the pre-copy race window flagged in PR review. |

## Test Plan
- Run `pnpm lint`.
- Run `pnpm build` with required auth env vars available.
- Manually verify multi-chunk AI actions preserve output order and fail cleanly on errors.
- Manually verify large folder delete/move behavior and manifest consistency after mutations.
- Manually verify `/api/tree/refresh` still returns the expected manifest shape and stable ordering.
- Manually verify the `/files` startup flow still restores the last file and only issues one settings fetch.

## Definition of Done
- The targeted sequential hot paths are parallelized where safe without changing user-visible behavior.
- Lint and build pass.
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- `docs/issues/issue-21.md`
- `docs/issues/issue-23.md`
- `app/api/ai/action/route.ts`
- `app/api/fs/folder/route.ts`
- `app/api/fs/move/route.ts`
- `lib/file-tree-builder.ts`
