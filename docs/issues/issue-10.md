# Issue 10 — Optimize IndexedDB Deletion in Persistent Document Cache

## Type
- performance

## Status
- resolved

## Related Story
- None

## Description
- The `removePersistentDocumentsWithPrefix` function in `lib/persistent-document-cache.ts` currently uses a cursor to iterate over all keys with a given prefix and deletes them one by one. This is inefficient as it results in N delete operations where N is the number of documents with the prefix.

## Root Cause
- Iterating with a cursor and calling `cursor.delete()` for each entry is slower than using `IDBObjectStore.delete(range)` which can delete multiple entries in a single operation.

## Fix / Approach
- Replace cursor iteration with `tx.store.getAllKeys(range)` to retrieve keys for eviction notification, and `tx.store.delete(range)` for bulk deletion.

## Files Changed
- `lib/persistent-document-cache.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2025-05-15 | perf | Initialized issue and started planning optimization. |
| 2025-05-15 | perf | Optimized `removePersistentDocumentsWithPrefix` with bulk deletion and verified with lint and type checks. |

## Test Plan
- Manual verification of the logic.
- Rationale for performance improvement:
  1. `cursor.continue()` and `cursor.delete()` each involve asynchronous operations that need to go through the IndexedDB event loop/transaction management for each item.
  2. `tx.store.delete(range)` is a single operation that the browser can optimize internally to delete all matching records in one go.
  3. For N items, the current approach is O(N) in terms of IndexedDB operations. The proposed approach is O(1) bulk delete operation (plus O(1) for `getAllKeys` to maintain the eviction notification).
  4. Even with `getAllKeys`, the total number of operations sent to the IDB engine is reduced from 2N to 2.
- Note: Automated benchmarking with `fake-indexeddb` was attempted but is impractical in this environment due to network restrictions and known unreliability of `fake-indexeddb` transaction lifecycle in this setup.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- None
