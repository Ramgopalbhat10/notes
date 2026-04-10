# Issue 25 — Parallelize cache invalidation and manifest updates

## Type
- performance

## Status
- resolved

## Related Story
- None

## Description
- Cache invalidation calls (revalidateTag) were executed sequentially in bulk operations, causing delays during folder delete/move operations
- Manifest node updates in moveFolder were processed sequentially, causing slow performance for large folder operations

## Root Cause
- revalidateFileTags and deleteFileMetas used sequential for loops to invalidate cache tags
- moveFolder processed all node updates sequentially even when operations were independent

## Fix / Approach
- Parallelized revalidateFileTags in lib/fs/file-cache.ts using mapWithConcurrencyLimit with concurrency of 10
- Parallelized deleteFileMetas in lib/fs/file-meta.ts using mapWithConcurrencyLimit with concurrency of 10
- Added concurrency to moveFolder in lib/manifest-updater.ts using mapWithConcurrencyLimit with threshold of 50 nodes and concurrency limit of 6
- Added threshold check comment to deleteFolder noting BFS traversal must remain sequential for correctness

## Files Changed
- `lib/fs/file-cache.ts`
- `lib/fs/file-meta.ts`
- `lib/manifest-updater.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-10 | perf | Parallelized cache invalidation calls and manifest node updates with concurrency limits |

## Test Plan
- Run `pnpm lint` - passes
- Run `pnpm build` - passes
- Manual testing of folder delete/move operations to verify cache invalidation works correctly

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- Performance analysis plan at C:\Users\ramgo\.windsurf\plans\performance-implementation-ed9e95.md
