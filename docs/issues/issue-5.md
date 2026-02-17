# Issue 5 - Consolidate ETag Sanitization Utilities

## Type
- refactor

## Status
- resolved

## Related Story
- None

## Description
- Duplicate ETag sanitization logic exists in multiple files (`lib/manifest-store.ts`, `lib/file-cache.ts`, and `lib/file-tree-builder.ts`) instead of using the shared utility in `lib/etag.ts`.

## Root Cause
- ETag normalization was implemented locally in feature modules over time, which caused repeated utility functions and inconsistent normalization behavior.

## Fix / Approach
- Replace local `sanitizeEtag` functions with imports of `normalizeEtag` from `lib/etag.ts`.
- Keep existing call sites returning `string | undefined` by using `normalizeEtag(value) ?? undefined`.
- Remove duplicate local helper functions.

## Files Changed
- `lib/manifest-store.ts`
- `lib/file-cache.ts`
- `lib/file-tree-builder.ts`
- `docs/issues/README.md`
- `docs/issues/issue-5.md`
- `docs/PROGRESS.md`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-17 | refactor | Replaced duplicated `sanitizeEtag` helpers in manifest/file cache/build paths with shared `normalizeEtag` utility from `lib/etag.ts`. |

## Test Plan
- Run `pnpm lint`.
- Run `pnpm build` (shared utility import and normalization behavior touched).
- Manual sanity check of manifest/file fetch paths that consume ETags.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- If related to a story, story's Issues section updated with resolved status.

## References
- Code health finding: duplicated `sanitizeEtag` in `lib/manifest-store.ts`
