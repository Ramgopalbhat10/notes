# Story 7 — Cached File Tree & Routing

Goal: Replace live S3 directory walks with a cached JSON map (stored in bucket root) that powers the file tree, enables instant search, and supports deep-link routing per file.

## Scope
- In: Static file-tree JSON served from API, refresh workflow and script, client-side routing updates.
- Out: Real-time collaborative edits, multi-tenant file trees (future).

## Deliverables
- `file-tree.json` stored at the root of the S3 bucket (hidden from tree listing) containing node ids, paths, types, etags, and timestamps.
- API endpoint `/api/tree` (GET) streaming the cached JSON with strong caching headers; refresh endpoint `/api/tree/refresh` triggering rebuild and persisting to S3.
- Node scripts/utilities to rebuild the JSON from S3 and write it back to the bucket (and optionally local cache for dev).
- File tree store refactor to hydrate from JSON, support instant search without expanding nodes.
- Workspace routing: selecting a file updates the URL (`/files/[...path]`), initial load opens file from URL.
- UI refresh control (icon/button) that triggers a rebuild and reloads the tree once ready; disabled while refresh runs.
- Update filesystem mutation routes (create/move/delete) to refresh or patch the JSON cache.

## Acceptance Criteria
- App boots without S3 traversal; tree loads from JSON under 100ms locally.
- Refresh button rebuilds tree: user sees spinner/toast, tree updates when finished.
- Tree search works on collapsed nodes using JSON metadata only.
- Selecting a file updates the URL and deep-links correctly on reload.
- JSON stays consistent with S3 after file operations (auto-refresh or targeted patching); hidden manifest never appears in tree UI.

---

## Story 7.1 — JSON Tree Source & API
- Structure: array of nodes `{ id, type: 'file'|'folder', name, path, parentId, childrenIds?, etag?, lastModified }` with manifest metadata (version, generatedAt, checksum).
- Storage: `s3://<bucket>/file-tree.json` (bucket root). File is excluded from UI tree results and protected via IAM.
- Endpoints: `GET /api/tree` (fetches JSON from S3 with local cache + `ETag`), `POST /api/tree/refresh` (auth-guarded, rebuilds JSON, writes to S3, returns status + new checksum).

Sub-tasks
- [x] Author JSON schema & helper types; document expected node attributes.
- [x] Implement `scripts/build-file-tree.ts` to walk S3 (using existing fs APIs) and emit JSON + checksum, then upload to `file-tree.json` (root).
- [x] Implement `/api/tree` to fetch/stream cached JSON from S3 with `ETag`/`Cache-Control`, falling back to local cache on failure.
- [x] Implement `/api/tree/refresh` to invoke build script (background job/promise), write new manifest to S3, and return progress (202 + status endpoint).
- [x] Add `npm run tree:build` + `tree:refresh` scripts for local use (with AWS creds guard rails).

Test Plan
- Script builds identical JSON twice (idempotent) for unchanged buckets.
- API responds within 50ms locally and respects caching headers.
- Refresh endpoint returns 202 + status link or 200 upon completion.

---

## Story 7.2 — Client Tree Hydration & Search
- Tree store consumes JSON, indexes nodes by id/path, builds hierarchy once; manifest entries filtered out.
- Search: fuzzy match across nodes without expanding tree; results list shows breadcrumb context.
- Refresh icon triggers `/api/tree/refresh`, polls `/api/tree/status` (or checks `ETag`) until manifest version changes, then rehydrates.

Sub-tasks
- [x] Add tree store loader/hydrator from JSON (w/ id/path maps, parent-child relationships).
- [x] Implement instant search using precomputed metadata (e.g., lowercased names, tags).
- [x] Add toolbar refresh icon with loading state + error fallback.
- [x] Update mutations (create/move/delete/rename) to patch cache locally and optionally call refresh; ensure hidden manifest not exposed in UI.
- [x] Add optimistic toast banners for refresh success/failure.

Test Plan
- Tree renders immediately from JSON; expanding large folders requires no network round trip.
- Search results show even deeply nested files without expanding.
- Refresh button rebuilds tree; UI updates after completion.
- Hidden manifest never appears in tree UI; IAM prevents unauthorized reads.

---

## Story 7.3 — Routing & Workspace Integration
- Pages: `/files/[...path]` with catch-all route; `app/page.tsx` redirects to first file or placeholder.
- Selecting a file updates route; back/forward works.
- Direct URL load hydrates tree, loads file via existing API, highlights node.

Sub-tasks
- [x] Create `/files/[...path]/page.tsx` (RSC entry) that renders workspace + passes initial path.
- [x] Update tree selection handler to push router state (Next.js useRouter hook).
- [x] On hydration, tree store selects node based on URL; fallback to placeholder if missing.
- [x] Ensure deep link to folder gracefully selects first child or shows message.
- [ ] Update analytics/error tracking to log missing files (console warning available, formal tracking pending).

Test Plan
- Navigating directly to `/files/foo/bar.md` loads file & highlights node.
- Back/forward switches files without reload.
- Missing file routes show "Not found" message and prompt refresh.

---

## Story 7.4 — Consistency & Tooling
- Node script `npm run tree:watch` (optional) to rebuild on demand.
- Ensure JSON gets updated after file operations (maybe queue refresh).
- Document process in README/Story.

Sub-tasks
- [x] Update README with instructions for rebuilding tree JSON & API usage (including AWS credentials, manifest path, exclusion filters).
- [x] Validate JSON against schema before serving; emit helpful errors; protect manifest from accidental download via tree API.

Test Plan
- README instructions reproducible; new devs can rebuild tree.
- Invalid JSON (schema mismatch) returns 500 + log entry.

---

## Definition of Done
- File tree loads exclusively from cached S3 JSON with refresh workflow; manifest hidden from tree listings.
- Routing reflects selected file and supports deep links.
- Search/refresh UX is responsive and reliable.
- Documentation & scripts cover rebuilding and maintaining the JSON cache.
