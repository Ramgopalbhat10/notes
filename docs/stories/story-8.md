# Story 8 — Document HTTP Caching

Goal: Cut redundant S3 reads by adding HTTP cache semantics to document fetches so browsers and the edge can revalidate instead of refetching.

## Scope
- In: `/api/fs/file` GET caching headers, conditional requests, client handling of 304 responses.
- Out: Offline storage, shared stateful caches (Redis/KV), prefetch strategies.

## Deliverables
- API emits `Cache-Control`, `ETag`, and `Last-Modified` for documents; supports `If-None-Match` / `If-Modified-Since` revalidation.
- Client loader respects 304 responses and keeps editor state unchanged.
- Documentation/tests covering the caching behaviour and invalidation (writes still bust cache via ETag updates).

## Acceptance Criteria
- Repeat loads for unchanged files return 304s at the edge in development (observable via Network tools).
- Saving a file yields a new ETag so the next GET pulls fresh content.
- Loading errors still surface the existing UX (toasts, banners) without regressions.

---

## Story 8.1 — API Cache Headers & Revalidation
- Forward conditional headers from client to S3 or compare locally.
- Respond with 304 + headers when ETag/Last-Modified unchanged.
- Provide sane caching policy (e.g., `public, max-age=60, stale-while-revalidate=30`).

Sub-tasks
- [x] Inspect incoming `If-None-Match` / `If-Modified-Since` and short-circuit when content unchanged.
- [x] Share ETag/Last-Modified/Cache-Control on all successful responses.
- [x] Ensure error handling and mutation endpoints are unchanged.

Test Plan
- GET a file twice; second request should return 304.
- Modify the file; subsequent GET returns 200 with a new ETag.

---

## Story 8.2 — Client Loader 304 Handling
- Update editor store to include cached ETag and last modified timestamp when requesting documents.
- Avoid re-parsing body when server indicates 304.

Sub-tasks
- [x] Send `If-None-Match` header when we have a cached ETag.
- [x] Handle 304: keep existing content/state and exit loading mode.
- [x] Ensure abort/ error handlers still behave as before.

Test Plan
- Load file → reload → confirm UI doesn’t flicker and network shows 304.
- After server returns 304, editor state remains the same (no dirty flag change).
- Error states (network failure) still show the existing error message.

---

## Definition of Done
- `/api/fs/file` supports conditional GETs and advertises cache metadata.
- Editor store issues conditional requests and honours 304 responses.
- Manual QA confirms reduced S3 traffic for repeated views without regressions.
