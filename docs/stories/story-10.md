# Story 10 — Upstash Manifest & Files Cache

Goal: Replace per-instance file tree caching with Upstash Redis, serve manifests directly from it on load, and move file content delivery onto Vercel's incremental cache so every deploy node shares the same tree metadata and `/files` loads stay hot.

## Scope
- In: manifest generation/upload pipeline, `/api/tree`, `/api/tree/refresh`, `/api/tree/status`, `/api/fs/*` routes that mutate content, client tree store refresh logic.
- Out: editor rendering performance, AI sidebar behavior, migration of legacy `.cache` tooling outside file tree flows.

- Shared Upstash Redis entry (`file-tree:manifest`) containing the latest serialized manifest + metadata + S3 ETag, with typed read/write helpers and env validation; `/api/tree` + client bootstraps always read from this source first.
- Refresh path that rebuilds the manifest from Tigris, uploads to S3, writes to Redis, and revalidates cache tags without background job polling (refresh icon triggers the full workflow).
- Cached `/api/fs/file` reads backed by `unstable_cache` + tagging so `/files` navigation reuses rendered payloads until mutations invalidate them.
- Optimistic tree mutation flow that updates UI state immediately, then in parallel persists changes to Tigris and Redis; failures roll back the UI and surface actionable errors.
- Ops docs + .env.sample guidance covering Upstash REST URL/token requirements and local fallbacks.

## Acceptance Criteria
- Manifest reads always hit Redis first; all app instances see updates within <2s of a refresh.
- `/api/tree/refresh` (and the refresh icon) returns once the manifest is live everywhere and no longer exposes job polling.
- `/api/fs/file` serves repeated reads from Vercel cache (confirmed via response headers) and revalidation triggers on PUT/DELETE/move/rename.
- Tree mutations update the sidebar instantly; if Redis or S3 persistence fails, the change is reverted and an error toast explains the failure.
- `tree:build` works locally with or without Redis credentials (falls back to disk cache when missing).

---

## Story 10.1 — Manifest Stored in Upstash Redis
- Replace `lib/file-tree-cache` usage with `lib/manifest-store` helpers backed by Upstash Redis `file-tree:manifest` key.
- Initial tree load (`/api/tree` + client hydration) reads straight from Redis; if the key is missing, fall back to S3 and immediately seed Redis before responding.
- On refresh (manual icon, cron, CLI), generate manifest from Tigris, upload to S3, `SET file-tree:manifest { etag, body, metadata }` in Redis, and `revalidateTag("file-tree-manifest")`.
- `/api/tree` reads from Redis via `unstable_cache`; S3 is only used on cache miss or schema mismatch.
- Remove in-memory job queue from `lib/tree-refresh` in favor of direct `refreshFileTree()` returning `{ etag, metadata }`.

Sub-tasks
- [x] Add `@upstash/redis` dependency and `lib/redis-client.ts` with env safety checks (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
- [x] Implement `readManifestFromRedis()` / `writeManifestToRedis()` helpers with schema validation, logging, and S3 fallback.
- [x] Refactor `tree-refresh.ts` and `/api/tree/refresh` to use the new helpers, return immediate status, and call `revalidateTag`.
- [x] Update `/api/tree` route to read from Redis cache-first, normalize etag headers, and watch `file-tree-manifest` tag.

Test Plan
- Refresh route returns 200/202 with manifest metadata and persists to Redis (inspect via CLI or mocked client).
- Hitting `/api/tree` twice returns `x-vercel-cache: HIT` on the second request.
- Removing the key in Redis triggers S3 fallback + re-population.
- Manual refresh icon triggers full rebuild; UI waits for new manifest checksum before rendering tree update.

---

## Story 10.2 — `/files` Route Content Caching
- Wrap S3 `GetObject` work in Next.js incremental cache via `unstable_cache`, using `file:${key}` tags and short TTL; reuse cached payloads across servers.
- On mutations (`PUT`, `DELETE`, `move`, `rename`, `mkdir`, `rmdir`), call `revalidateTag("file:${key}")` (and related folder tags) plus `revalidateTag("file-tree-manifest")` to keep tree + file caches coherent.
- Ensure cache metadata (`ETag`, `Last-Modified`) travels through to client so the browser can leverage conditional requests.
- Provide helper utilities to fetch cached files and invalidate tags for a set of keys (e.g., folder operations).
- Tree UI fires `optimisticUpdateManifest(diff)` immediately, while `persistManifestChanges(diff)` runs `Promise.all` of Tigris + Redis writes; any rejection triggers `rollbackManifest(diff)` and user notification.

Sub-tasks
- [x] Introduce `lib/file-cache.ts` exporting `getCachedFile(key)` and `revalidateFileTags(keys)`, wrapping `unstable_cache` with tag usage.
- [x] Refactor `/api/fs/file` GET to use the cached helper, set diagnostics headers, and rely on cache tags.
- [x] Update file/folder mutation routes to compute affected keys and call `revalidateFileTags`, plus `revalidateTag("file-tree-manifest")`.
- [x] Adjust client tree store to hydrate from the Redis-backed manifest, stop polling status jobs, and manage optimistic + rollback flows for tree mutations.

Test Plan
- Navigate the same file twice and confirm second response is a cache hit (header `x-vercel-cache` or timing).
- After editing a file via PUT, the subsequent GET returns fresh content and `x-vercel-cache: MISS`.
- Folder rename invalidates all nested keys (verified via scripted integration test).
- Force Redis or Tigris write failures during optimistic mutations and verify UI reverts with descriptive error toast.

---

## Story 10.3 — Tooling & Documentation
- Document Upstash setup steps (project REST URL/token) and `.env` updates.
- Update `tree:build` CLI to read/write Redis when credentials exist; otherwise fall back to local `.cache`.
- Refresh onboarding docs to mention new caching behavior and how to trigger manual revalidation if needed.

Sub-tasks
- [x] Extend `scripts/build-file-tree.ts` to optionally push to Redis when not in `--dry-run`.
- [x] Add README instructions for configuring Upstash credentials.
- [x] Write migration checklist for removing `.cache/file-tree/manifest.json` from deploy artifacts.
- [x] Create runbook section covering cache inspection (`curl`/Upstash Console) and manual invalidation.

Test Plan
- Local developer without tokens can still run `tree:build` and work offline.
- Documentation reviewed with sample Upstash REST commands.
- Runbook steps validated in staging (Redis update reflects in <2s).

---

## Definition of Done
- Manifest and file caches are centralized, tagged, and verified in staging.
- Operations docs + sample envs keep new developers from regressing to per-instance caches.
- Automated tests (units/integration) cover manifest fetch, file cache hit/miss, and mutation-triggered revalidation.
- Optimistic tree updates roll back correctly on simulated persistence failures in staging.
