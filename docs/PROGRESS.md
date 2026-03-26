# Progress

Current issue: `docs/issues/issue-21.md`

Current section: Issue 21 — Optimize folder move and manifest update hot paths

Previous tasks (latest completed batch only):
- [x] Optimized bounded concurrency for S3 folder copy/delete work in `app/api/fs/move/route.ts`.
- [x] Replaced repeated manifest node array scans with request-local indexed lookups in `lib/manifest-updater.ts`.
- [x] Ran `pnpm lint` and `pnpm build`, then updated Issue 21 docs as resolved.

Next tasks:
- None - all tasks completed.

Notes:
- Branch: `fix/move-manifest-performance-hotspots`
- Scope is limited to the four reported hotspots in `app/api/fs/move/route.ts` and `lib/manifest-updater.ts`, plus only small adjacent cleanup in those files.
- The manifest lookup index must remain request-local and server-only; it is not persisted or shared across instances.
