# Issue 22 — Consolidate duplicated route helper utilities

## Type
- cleanup

## Status
- resolved

## Related Story
- None

## Description
- Multiple server routes still duplicate small helper functions for error status parsing, error message extraction, JSON response creation, and string normalization.
- `lib/tree/utils.ts` still contains a local ETag sanitization helper that duplicates `lib/etag.ts` behavior.

## Root Cause
- Small route-local helpers were added incrementally near their call sites, which made the original implementations convenient but left duplicate logic spread across unrelated modules.
- Earlier cleanup work resolved similar duplication in adjacent areas, but these remaining helpers were left behind.

## Fix / Approach
- Extract shared error parsing helpers for filesystem routes and server actions into `lib/http/errors.ts`.
- Extract the shared JSON response helper into `lib/http/response.ts` and reuse `safeString` from `lib/utils.ts` in AI routes.
- Move the remaining tree ETag formatting/normalization usage to `lib/etag.ts` and remove the duplicate tree-local implementation.
- Preserve all existing responses, fallback messages, and call-site behavior.

## Subtasks
- [x] Extract shared error status/message helpers and update filesystem routes plus `app/actions/documents.ts`.
- [x] Extract shared AI JSON/string helpers and update both AI routes.
- [x] Consolidate the duplicate tree ETag helper into `lib/etag.ts`.
- [x] Run `pnpm lint` and `pnpm build`.
- [x] Update issue/progress docs and resolve the issue.

## Files Changed
- `app/actions/documents.ts`
- `app/api/ai/action/route.ts`
- `app/api/ai/models/route.ts`
- `app/api/fs/file/route.ts`
- `app/api/fs/folder/route.ts`
- `app/api/fs/mkdir/route.ts`
- `app/api/fs/move/route.ts`
- `lib/etag.ts`
- `lib/http/errors.ts`
- `lib/http/response.ts`
- `lib/tree/manifest-client.ts`
- `lib/tree/utils.ts`
- `lib/utils.ts`
- `docs/issues/issue-22.md`
- `docs/issues/README.md`
- `docs/PROGRESS.md`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-03-26 | cleanup | Opened Issue 22 for the reported route/helper duplication findings, scoped the shared utility extraction, and started implementation on `refactor/shared-route-helper-cleanup`. |
| 2026-03-26 | cleanup | Extracted shared HTTP error parsing helpers to `lib/http/errors.ts`, shared JSON response formatting to `lib/http/response.ts`, promoted `safeString` to `lib/utils.ts`, consolidated remaining tree ETag helpers into `lib/etag.ts`, updated all flagged call sites, and verified with `pnpm lint` plus `pnpm build`. |

## Test Plan
- Run `pnpm lint`.
- Run `pnpm build`.
- Manually verify AI route responses, filesystem route errors, and tree ETag handling continue to behave the same.

## Definition of Done
- The reported duplicate helpers are consolidated without changing behavior.
- Lint and build pass.
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- `docs/issues/issue-5.md`
- `docs/issues/issue-18.md`
