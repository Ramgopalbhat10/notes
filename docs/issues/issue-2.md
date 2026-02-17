# Issue 2 — Refactor Path Utilities

## Type
- refactor

## Status
- resolved

## Related Story
- None

## Description
- Duplicate path utility functions (`basename`, `parentIdFromPath`, `parentPathFromKey`, `parentPathFromFolderKey`) exist across `lib/manifest-updater.ts`, `lib/file-tree-builder.ts`, and `lib/tree/utils.ts`.

## Root Cause
- Common utility functions were implemented locally in multiple files instead of being centralized.

## Fix / Approach
- Create `lib/paths.ts` to house `basename` and `getParentPath`.
- Refactor existing files to use these shared utilities.
- Remove duplicate implementations.

## Files Changed
- `lib/paths.ts` (new)
- `lib/manifest-updater.ts`
- `lib/file-tree-builder.ts`
- `lib/tree/utils.ts`
- `stores/tree.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2024-05-24 | refactor | Centralized `basename` and `getParentPath` in `lib/paths.ts` and updated consumers. |

## Test Plan
- Run `npm run build` to verify type safety.
- Verify file tree navigation and operations (create, move, delete) still work as expected.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- If related to a story, story's Issues section updated with resolved status.

## References
- None
