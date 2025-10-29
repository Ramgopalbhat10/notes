# ADR: Caching Strategy and TTL Alignment

## Status
Accepted – 2025-10-24

## Context
The app uses Next.js 15 App Router with:
- Server-side data caching via `unstable_cache` with tag-based invalidation.
- API routes that serve ETag/Last-Modified for conditional requests.
- Client-side fetches for the editor and the file-tree manifest.

We observed a risk of the browser serving locally cached file content for up to 60s despite server-side revalidation after writes.

## Decision
- File content is cached cluster-wide in Upstash Redis (read-through on GET; write-through on PUT), with no TTL. Freshness relies on tag invalidation + Redis key delete, not time.
- Next.js Incremental Cache (`unstable_cache`) is used for per-instance dedupe with `revalidate: false` (tag-only invalidation) on both file content and manifest.
- The file content API requires client revalidation and prevents shared browser caching: `Cache-Control: private, no-cache, must-revalidate`.
- Editor reads implement two client optimizations:
  - Manifest-gated skip: if the tree manifest `etag` for a file equals the IndexedDB `etag`, skip the network.
  - First-open revalidation: on the first open per file per session (when an `etag` exists), force a one-time conditional GET to confirm freshness.
- Manifest reads prefer Redis (seeded from S3). A stale-304 safeguard checks the latest manifest before replying 304 when `If-None-Match` matches the cached entry.

## Details
- File data caching
  - Redis (Upstash): `file-cache:v1:<key>` stores `{ content, etag, lastModified, fetchedAt }`. No TTL; entries persist until invalidated.
  - Server dedupe: `lib/file-cache.ts` wraps loads in `unstable_cache` (`key=file-cache:<key>`, `tag=file:<key>`, `revalidate=false`). Loader flow: Redis → S3 (on miss) → write to Redis.
  - Invalidation on writes: `revalidateFileTags([...])` deletes Redis keys for affected files and calls `revalidateTag(file:<key>)` to evict Next cache. For PUT, we then write-through the fresh record to Redis.
  - Client fetch policy: `stores/editor.ts` uses `cache: "no-cache"` and conditional GETs. It also:
    - Skips the network entirely when IndexedDB `etag ===` manifest `etag` (manifest-gated skip).
    - Forces a single conditional GET on the first open per file per session (first-open revalidation).
  - API response headers: `Cache-Control: private, no-cache, must-revalidate`, `ETag`, `Last-Modified`, and diagnostic `X-File-Cache: HIT|MISS`.

- Manifest caching
  - Source of truth: Redis key `file-tree:manifest`, seeded from S3 (`file-tree.json`).
  - Server dedupe: `unstable_cache` keyed by `file-tree-manifest`, tagged with `MANIFEST_CACHE_TAG`, `revalidate: false`.
  - Invalidation: `revalidateTag(MANIFEST_CACHE_TAG)` in mutation routes and during `lib/tree-refresh.ts`.
  - 304 safeguard: when `If-None-Match` matches the cached record, the route double-checks `loadLatestManifest()` and serves 200 with the latest body if the ETag changed.
  - API headers: `Cache-Control: public, max-age=30, s-maxage=300, stale-while-revalidate=60`, plus `ETag` and `X-Manifest-Source: redis|s3`.

## TTL Alignment Rationale
- File content
  - Redis has no TTL; freshness is maintained by explicit invalidations on writes (delete + tag). This avoids time-driven misses and reduces S3 reads across regions.
  - Next cache uses `revalidate: false`; writes evict by tag. First read per instance after invalidation re-runs the loader (likely hits Redis, not S3).
  - Client uses conditional requests, plus manifest-gated skip and first-open revalidation to balance freshness vs. calls.
- Manifest
  - Short HTTP TTLs plus tag invalidation are sufficient for navigation; the 304 safeguard prevents stale responses during rare propagation races.

## Alternatives Considered
- Using `cache: "no-store"` for editor file reads: guarantees network round-trip but removes `304` wins. "no-cache" keeps conditional GET benefits.
- Using a TTL for Redis: provides periodic refresh but introduces avoidable misses; we prefer explicit invalidation and write-through on PUT.
- Enabling Dynamic IO + `use cache`: not adopted now; current approach with `unstable_cache` is stable and explicit.
- Push updates (SSE/WebSocket) and BroadcastChannel for cross-tab/device instant invalidation: desirable later; current single-user scenario relies on conditional GETs and local skip heuristics.

## Consequences
- Most editor opens skip the network when IndexedDB matches the manifest; first open per file per session performs one lightweight validation (often 304).
- Predictable freshness after writes with minimal S3 cost: Redis write-through + tag invalidation keeps reads regional and fast.

## How to Change Later
- If bandwidth is a concern, increase reliance on manifest-gated skip and add a small staleness window; or add push updates to avoid polling entirely.
- If manifest freshness needs to be stricter, lower `max-age` or consider a small manifest staleness guard on focus.

---

## Architecture (ASCII)

File GET (read-through, tag-only invalidation, conditional GET)

```
Client (Editor)
  ├─ Check IndexedDB + Manifest ETag
  │    ├─ First open this session with cached ETag? → Force conditional GET
  │    └─ Else if ETag matches → Skip network (render from IndexedDB)
  └─ Conditional GET /api/fs/file?key=K  (Cache-Control: private, no-cache)
         │ If-None-Match: <etag?>
         ▼
Server /api/fs/file
  ├─ unstable_cache(key=file-cache:K, tag=file:K, revalidate=false)
  │    └─ Loader: Redis file-cache:v1:K → S3 (on miss) → write to Redis
  ├─ If ETag unchanged → 304 with ETag/Last-Modified
  └─ Else 200 JSON { content, etag, lastModified } + X-File-Cache: HIT|MISS
```

File PUT (write-through, delete+tag invalidate, local caches update)

```
Client (Editor)
  └─ PUT /api/fs/file { key, content, ifMatchEtag? }
         ▼
Server
  ├─ S3 PutObject → HeadObject ⇒ newETag, lastModified
  ├─ revalidateFileTags([K])  // delete Redis key + revalidateTag(file:K)
  ├─ setFileCacheRecord(K, { content, etag, lastModified, fetchedAt }) // write-through
  ├─ revalidateTag(MANIFEST_CACHE_TAG) // keep manifest cache coherent
  └─ 200 { etag }

Client (saving tab)
  ├─ Update editor state + IndexedDB with new content/etag/lastModified
  └─ Update tree node metadata (etag/lastModified)
```

Manifest Refresh (structure mutations)

```
Mutation routes (/api/fs/move, /api/fs/folder, deletes)
  ├─ S3 changes
  ├─ revalidateFileTags([...affected files...])
  └─ POST /api/tree/refresh
         ▼
lib/tree-refresh
  ├─ generate manifest → upload S3(file-tree.json)
  ├─ write Redis file-tree:manifest
  └─ revalidateTag(MANIFEST_CACHE_TAG)

/api/tree GET
  ├─ unstable_cache(key=file-tree-manifest, tag=MANIFEST_CACHE_TAG)
  ├─ If If-None-Match matches cached ETag → double-check latest
  │      ├─ same ETag → 304
  │      └─ changed   → 200 latest body
  └─ Else 200 cached body
```
