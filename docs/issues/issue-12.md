# Issue 12 — O(N²) Queue Dequeue in File Tree Builder

## Type
- performance

## Status
- resolved

## Related Story
- None

## Description
- `buildContext` in `lib/file-tree-builder.ts` dequeues folders with `Array.shift()` inside a loop.
- `shift()` is O(N), so repeated dequeues can degrade traversal to O(N²).

## Root Cause
- The queue traversal uses a front-dequeue pattern on a plain array (`shift()`), which forces element reindexing on every dequeue.

## Fix / Approach
- Preserve BFS traversal behavior.
- Replace `shift()` dequeue with an index pointer (`qi++`) over the same array.
- Keep `push()` enqueue behavior and `visited` dedupe logic unchanged.

## Files Changed
- `lib/file-tree-builder.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-23 | perf | Planned BFS-preserving queue optimization for `buildContext` by replacing `shift()` with index-based dequeue. |
| 2026-02-23 | perf | Replaced `shift()` with index-based dequeue (`queueIndex++`) in `buildContext`, preserving BFS while removing O(N) dequeue overhead. |

## Test Plan
- Generate file-tree manifest via existing flow and verify folder/file discovery remains correct.
- Confirm no duplicate processing from `visited`.
- Run `pnpm lint`.
- Run `pnpm build`.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- `lib/file-tree-builder.ts:52`
- `docs/issues/issue-8.md`
