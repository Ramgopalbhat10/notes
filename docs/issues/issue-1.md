# Issue 1 — Refactor Duplicated Path Utilities

## Type
- refactor

## Status
- resolved

## Related Story
- None

## Description
- `basename` and parent path logic are duplicated across `lib/manifest-updater.ts`, `lib/file-tree-builder.ts`, and `lib/tree/utils.ts`.
- This increases maintenance burden and risk of inconsistency.

## Root Cause
- Code evolution led to copy-pasting of utility functions.

## Fix / Approach
- Create `lib/paths.ts` with `basename` and `getParentPath`.
- Refactor all usages to import from `lib/paths.ts`.
- Remove redundant implementations.
- Update `stores/tree.ts` to use the unified `getParentPath` logic.

## Files Changed
- `lib/paths.ts` (new)
- `lib/manifest-updater.ts`
- `lib/file-tree-builder.ts`
- `lib/tree/utils.ts`
- `stores/tree.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-17 | refactor | Created `lib/paths.ts`, refactored `manifest-updater`, `file-tree-builder`, `tree/utils`, and `stores/tree` to use shared path utils. Verified with unit tests. |

## Test Plan
- Unit tests for `lib/paths.ts` (created and run, then removed as per environment constraints).
- Manual verification of code logic.
- Lint check.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
