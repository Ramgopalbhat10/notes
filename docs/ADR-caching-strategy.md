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
- For file reads from the editor, force conditional revalidation on every request:
  - Edit `stores/editor.ts` to call `fetch(..., { cache: "no-cache" })` when hitting `/api/fs/file`.
- For the file content API, require revalidation and prevent shared caching:
  - In `app/api/fs/file/route.ts`, set `Cache-Control` to `private, no-cache, must-revalidate`.
- Switch server-side file content cache to tag-only revalidation (`revalidate: false`) and rely on tag invalidation.
- Keep manifest caching behavior as-is (short HTTP TTL + tag invalidation + client `no-store`).

## Details
- File data caching
  - Server cache: `lib/file-cache.ts` uses `unstable_cache` with key `file-cache:${key}` and tag `file:${key}`. `revalidate: false` (tag-only revalidation).
  - Invalidation: `revalidateFileTags([...])` is called from write endpoints: 
    - `app/api/fs/file/route.ts`
    - `app/api/fs/folder/route.ts`
    - `app/api/fs/move/route.ts`
  - Client fetch: `stores/editor.ts` now requests with `cache: "no-cache"` so the browser revalidates with ETag on each load and receives `304 Not Modified` when appropriate.
  - API response headers: `Cache-Control: private, no-cache, must-revalidate`, plus `ETag` and `Last-Modified`.

- Manifest caching
  - Server cache: `app/api/tree/route.ts` uses `unstable_cache` keyed by `file-tree-manifest`, tagged with `MANIFEST_CACHE_TAG`, `revalidate: false` (tag-only revalidation).
  - Invalidation: `revalidateTag(MANIFEST_CACHE_TAG)` in write endpoints and `lib/tree-refresh.ts`.
  - API headers: `Cache-Control: public, max-age=30, s-maxage=300, stale-while-revalidate=60` with `ETag`.
  - Client fetch: `lib/tree/manifest-client.ts` uses `cache: "no-store"` and `If-None-Match` for lightweight revalidation.

## TTL Alignment Rationale
- File content
  - Server cache uses tag-only revalidation (`revalidate: false`), so entries persist until explicitly invalidated, minimizing periodic misses across instances. Writes trigger tag invalidation to evict stale entries immediately.
  - Browser always revalidates ("no-cache" + ETag) so user never sees stale content after a write. Most refreshes return `304`.
- Manifest
  - Short HTTP TTLs are acceptable for list/navigation UX while tag invalidation ensures freshness after writes.
  - Client "no-store" ensures router/request memoization doesn’t mask updates.

## Alternatives Considered
- Using `cache: "no-store"` for editor file reads: guarantees network round-trip but removes `304` wins. "no-cache" keeps conditional GET benefits.
- Using a TTL for server file cache: provides periodic refresh but introduces avoidable misses; tag-only revalidation preferred since writes already trigger tag invalidation.
- Enabling Dynamic IO + `use cache`: not adopted now; current approach with `unstable_cache` is stable and explicit.

## Consequences
- Slightly more network validations from the editor, but responses are often `304` and fast.
- Predictable freshness after writes with minimal S3 cost due to server cache + tags.

## How to Change Later
- If bandwidth is a concern, consider switching editor to `cache: "no-store"` only for specific flows or increasing server `revalidate`.
- If manifest freshness needs to be stricter, lower `max-age` or adopt `private, no-cache, must-revalidate` for that route as well.
