# Issue 6 — Optimize Redis Deletion in File Cache

## Type
- performance

## Status
- resolved

## Related Story
- None

## Description
- The `revalidateFileTags` function in `lib/file-cache.ts` currently iterates over a list of keys and calls `redis.del()` for each one sequentially.
- This results in $N$ network round trips for $N$ keys, which is inefficient, especially when invalidating folders or large sets of files.

## Root Cause
- Sequential deletion loop in `revalidateFileTags`.

## Fix / Approach
- Replace the sequential loop with a single batch `redis.del(...keys)` call.
- Preserve the individual `revalidateTag` calls as they are required by Next.js cache API.
- Add error handling for the batch operation.

## Files Changed
- `lib/file-cache.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2024-05-22 | performance | Implemented batch Redis deletion, verified with benchmark script (43x speedup). |

## Test Plan
- Create a benchmark script to measure the difference (simulating 5ms latency).
- Verify correctness using a temporary test file mocking Redis.
- Verify no regressions using `scripts/build-file-tree.ts --dry-run`.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- If related to a story, story's Issues section updated with resolved status.

## References
- Redis `DEL` command documentation.
