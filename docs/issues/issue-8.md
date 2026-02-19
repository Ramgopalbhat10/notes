# Issue 8 — O(N²) Complexity in Delete Folder Manifest Update

## Type
- performance

## Status
- resolved

## Related Story
- None

## Description
- The `deleteFolder` function in `lib/manifest-updater.ts` uses a BFS loop to collect all descendant node IDs to remove. Inside the loop, `manifest.nodes.find(...)` performs a full O(N) linear scan per iteration, and `queue.shift()` is also O(N) per dequeue. Together, these make the BFS O(N²) for a subtree of size N.

## Root Cause
- `manifest.nodes.find((n) => n.id === currentId)` runs inside a `while` loop — one linear scan per BFS step.
- `queue.shift()` reallocates/shifts the array each step — also O(N) per dequeue.
- No lookup index is built before the traversal.

## Fix / Approach
- [x] Build a `Map<FileTreeNodeId, FileTreeNode>` from `manifest.nodes` once before the BFS loop — O(N) one-time cost.
- [x] Replace `manifest.nodes.find(...)` with `nodeById.get(currentId)` — O(1) per step.
- [x] Replace `queue.shift()` + while with an index variable (`qi++`) — O(1) per dequeue.
- [x] Net result: O(N²) → O(N) for the traversal.

## Files Changed
- `lib/manifest-updater.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-19 | perf | Replaced O(N) find+shift in deleteFolder BFS with Map lookup and index-based queue traversal |

## Test Plan
- Manually delete a folder with nested children and verify the manifest updates correctly.
- `pnpm lint` and `pnpm build` pass with 0 errors.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- `lib/manifest-updater.ts` lines 288–296
