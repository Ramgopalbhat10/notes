# Progress

Current issue: `docs/issues/issue-22.md`

Current section: Issue 22 — Consolidate duplicated route helper utilities

Previous tasks (latest completed batch only):
- [x] Extracted shared HTTP error parsing helpers and updated filesystem routes plus `app/actions/documents.ts`.
- [x] Extracted shared AI response/string helpers and updated both AI routes.
- [x] Consolidated remaining tree ETag helpers into `lib/etag.ts`.
- [x] Ran `pnpm lint` and `pnpm build`.
- [x] Updated issue/progress docs and resolved Issue 22.

Next tasks:
- None - all tasks completed.

Notes:
- Branch: `refactor/shared-route-helper-cleanup`
- Scope is limited to the reported duplicate helpers in AI routes, filesystem routes/server actions, and tree ETag utilities.
- Preserve existing response payloads, fallback messages, and ETag behavior while consolidating implementations.
