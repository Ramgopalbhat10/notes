# Story 10 — Shared Manifest & Snappy Tree Mutations

Goal: Serve a consistent, low-latency file tree by caching the manifest in Upstash Redis, streaming files through Next.js incremental cache, and making all tree mutations optimistic while background jobs keep S3 + Redis in sync.

## Scope
- In: manifest generation/upload pipeline, `/api/tree`, `/api/tree/refresh`, `/api/tree/status`, `/api/fs/*` mutation routes, file-tree store, Redis integration, mutation UX.
- Out: markdown editor rendering, AI sidebar features, non-tree related caching strategies.

## Deliverables
- Manifest persisted in Upstash Redis (`file-tree:manifest`), populated from S3, consumed by `/api/tree`, and invalidated via `revalidateTag`.
- `lib/file-tree-builder` generates a manifest that includes empty folders represented by zero-byte S3 objects; `/api/fs/list` mirrors the same structure.
- Client tree store powered by an optimistic mutation queue: UI updates instantly, backend jobs run sequentially, a debounced `/api/tree/refresh` harmonises S3 + Redis, and rollbacks restore the previous state on failure.
- File content requests (`/api/fs/file`) leverage Next.js `unstable_cache` with per-file tags and participate in the same invalidation scheme.
- Tooling updates (`tree:refresh -- --push-redis`, README, runbook) so developers and CI can build/upload the manifest and inspect Redis entries confidently.

## Acceptance Criteria
- Manifest reads always come from Redis (S3 is only a fallback seed); `/api/tree` shows `X-Manifest-Source: redis` under normal operation.
- Any tree mutation (create, rename, move, delete) updates the UI immediately; the refresh icon reflects queued work; if the backend call fails the UI rolls back and surfaces an error.
- Empty folders created via the UI appear instantly and survive manifest refreshes thanks to placeholder support.
- `pnpm tree:refresh -- --push-redis` uploads `file-tree.json` to S3 **and** syncs Redis; developers without Redis credentials can still run `tree:build`.
- `/api/fs/file` returns 304 on repeat requests (`X-File-Cache: HIT`) until mutated actions invalidate the relevant tags.

---

## Story 10.1 — Manifest Stored in Upstash Redis & Optimistic Mutations
- `lib/manifest-store` replaces the legacy disk cache, encapsulating Redis read/write logic (with schema validation) and S3 fallback/seed.
- `/api/tree` is wrapped in `unstable_cache`, keyed on `file-tree-manifest`, revalidated via `revalidateTag`, and reports the source (`redis` vs `s3` fallback).
- `/api/tree/refresh` rebuilds the manifest (sequential S3 crawl → upload to S3 → write to Redis) and revalidates the cache tag synchronously.
- Empty folders (S3 objects ending with `/`) are surfaced both in `/api/fs/list` responses and the generated manifest.
- Client store exposes an optimistic mutation queue shared by all actions: mutations apply locally, enqueue background jobs that call `/api/fs/*`, and schedule a debounced `/api/tree/refresh`. Rollbacks revert snapshots and emit toasts when backend calls fail.

Sub-tasks
- [x] Add Upstash Redis client (`lib/redis-client.ts`) with env validation for `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
- [x] Implement `readManifestFromRedis()` / `writeManifestToRedis()` with schema enforcement and S3 seeding.
- [x] Refactor `tree-refresh.ts` + `/api/tree/refresh` to use the Redis helper and `revalidateTag`.
- [x] Update `/api/tree` to consume Redis via `unstable_cache` and normalised headers.
- [x] Teach `/api/fs/list` and `lib/file-tree-builder` to include placeholder folders.
- [x] Add optimistic mutation queue, debounced manifest refresh, snapshot rollbacks, and background job processing in `stores/tree.ts`.
- [x] Update the file-tree UI to show success/error toasts for mutation-driven refreshes and treat queue errors differently from manual refresh failures.

Test Plan
- Trigger each mutation (create/rename/move/delete for files & folders) and confirm: UI updates instantly, refresh icon spins, on success the tree stays accurate after `/api/tree` rehydration, on failure state rolls back and an error toast appears.
- Verify empty folders propagate: create folder → placeholder object exists in S3 (`HEAD`), `/api/tree` manifest includes it, tree shows it post-refresh.
- Clear Redis (`curl -X DELETE ... file-tree:manifest`); next `/api/tree` request seeds from S3 and rehydrates Redis.
- Inspect `/api/tree` headers after refresh: `ETag` changes, `X-Manifest-Source: redis`, `x-vercel-cache: HIT` on second request.

---

## Story 10.2 — File Content Caching (`/api/fs/file`)
- Files fetched via `/api/fs/file` are cached with `unstable_cache`, keyed by `file:${relativePath}` and tagged so mutations invalidate them.
- Conditional requests (If-None-Match / If-Modified-Since) short-circuit to 304 with `X-File-Cache: HIT`; first loads show `MISS`.
- File/folder mutations trigger `revalidateFileTags` for affected paths and `revalidateTag("file-tree-manifest")` to keep the manifest consistent.

Sub-tasks
- [x] Create `lib/file-cache.ts` (`getCachedFile`, `revalidateFileTags`, `toRelativeKeys`) layered on Next.js incremental cache.
- [x] Refactor `/api/fs/file` GET to read via the helper and emit diagnostic headers.
- [x] Ensure every mutation route (`/api/fs/file`, `/api/fs/folder`, `/api/fs/move`, `/api/fs/mkdir`) revalidates the appropriate tags.
- [x] Adjust the client store to rely on cached fetches instead of blocking on `/api/fs/list` during optimistic mutations.

Test Plan
- Fetch the same file twice: first response 200 + `X-File-Cache: MISS`, second response 304 + `X-File-Cache: HIT`.
- Edit or delete a file: subsequent fetch returns fresh content with `MISS`.
- Move/rename a folder with children: nested files are invalidated (`revalidateFileTags` run with child keys) and new paths produce fresh cache entries.

---

## Story 10.3 — Tooling & Operations
- `pnpm tree:refresh -- --push-redis` uploads the manifest to S3 and writes the same payload to Redis (canonical JSON, timestamped).
- README documents the new workflow, environment variables, and curl commands to inspect or purge the Redis entry.
- Runbook guidance covers ignoring `.cache/file-tree/` in deploys and coordinating manifest refreshes in CI/CD.

Sub-tasks
- [x] Extend `scripts/build-file-tree.ts` (`--push-redis`) with env validation and Upstash write logic.
- [x] Document Upstash env keys, CLI usage, inspection/purge commands, and deployment tips in README.
- [x] Add troubleshooting + deployment notes for Redis and remind teams to run the refresh script post-deploy.

Test Plan
- Local developer without Upstash env vars runs `pnpm tree:build` successfully (`--push-redis` guarded by validation).
- CI pipeline uses `pnpm tree:refresh -- --push-redis` to sync S3 + Redis; operations can inspect the manifest via the documented curl commands.

---

## Definition of Done
- Manifest served from Redis (validated via `/api/tree` headers) and synchronised with S3 after each mutation batch.
- Tree mutations feel instantaneous; background jobs complete without blocking dialogs; failures revert state and notify the user.
- File content cache honours Next.js incremental cache semantics and invalidates on every mutation.
- Documentation and tooling enable new contributors and CI/CD pipelines to manage manifests and caches without reverting to per-instance storage.
