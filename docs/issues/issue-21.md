# Issue 21 — Optimize folder move and manifest update hot paths

## Type
- performance

## Status
- resolved

## Related Story
- None

## Description
- Large folder move operations in `app/api/fs/move/route.ts` currently copy S3 objects sequentially and delete S3 chunks sequentially, which slows down moves with many files.
- `lib/manifest-updater.ts` still performs repeated linear `manifest.nodes.find(...)` scans in hot helper methods, which causes unnecessary O(N) work inside operations that can run many times per update.

## Root Cause
- The move route performs one S3 copy request at a time and one delete-chunk request at a time, even when requests are independent and can safely run with bounded parallelism.
- The manifest updater stores nodes primarily as an array and repeatedly scans that array for parent and child lookups instead of using a request-local index.
- The current implementation preserves correctness but scales poorly as folder size and manifest size grow.

## Fix / Approach
- Add bounded concurrency to folder-copy work in `app/api/fs/move/route.ts`.
- Execute independent delete-chunk requests concurrently while preserving chunk sizing and failure propagation.
- Add a request-local node lookup index inside the `Manifest` helper in `lib/manifest-updater.ts` and keep it synchronized across mutations.
- Preserve persisted manifest shape, API behavior, cache invalidation, and metadata rename side effects.

## Subtasks
- [x] Optimize S3 folder copy and delete sequencing in `app/api/fs/move/route.ts`.
- [x] Replace repeated manifest node array scans with request-local indexed lookups in `lib/manifest-updater.ts`.
- [x] Run `pnpm lint` and `pnpm build`.
- [x] Update issue/progress docs and resolve the issue.

## Files Changed
- `app/api/fs/move/route.ts`
- `lib/manifest-updater.ts`
- `docs/issues/issue-21.md`
- `docs/issues/README.md`
- `docs/PROGRESS.md`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-03-26 | perf | Opened Issue 21 for the reported S3 move-route and manifest-updater hotspots, scoped the fix to bounded concurrency plus request-local manifest indexing, and started implementation on `fix/move-manifest-performance-hotspots`. |
| 2026-03-26 | perf | Added bounded concurrency for folder copy/delete S3 work, introduced request-local manifest node indexing for repeated lookups, and verified the change with `pnpm lint` and `pnpm build`. |

## Test Plan
- Run `pnpm lint`.
- Run `pnpm build`.
- Manually move folders/files and confirm results remain correct while reducing sequential bottlenecks in the code path.
- Verify manifest updates still reflect folder/file moves correctly after the optimization.

## Definition of Done
- All four reported hotspots are fixed without changing user-visible behavior.
- Lint and build pass.
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- `app/api/fs/move/route.ts`
- `lib/manifest-updater.ts`
- `/home/jarvis/.windsurf/plans/perf-hotspots-4e82d0.md`
