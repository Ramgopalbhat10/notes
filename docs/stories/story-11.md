# Story 11 — Public Sharing Links

Goal: Let the private vault selectively expose individual markdown files through shareable read-only links backed by explicit public metadata, without weakening the authenticated workspace experience.

## Scope
- In: file metadata persisted in Redis, API surface for toggling public access, anonymous content fetcher, minimal public reader route, UI affordances in the workspace header.
- Out: directory-level sharing, password-protected links, rate limiting/analytics for public reads, non-markdown file types, SEO-friendly listing pages.

## Deliverables
- Redis-backed metadata module that records `{ public: boolean }` per file key with helpers for read/write/delete/rename.
- Authenticated API route for reading and mutating a file’s sharing state; responses integrate with existing optimistic mutation flows.
- Public API that enforces the metadata flag before streaming cached markdown content, returning 404 for non-public entries.
- `/p/...` Next.js route that renders markdown content without the application shell or auxiliary UI when a file is marked public.
- Workspace header toggle with tooltip indicating sharing status, optimistic UI updates, and copyable public URL.
- Metadata lifecycle hooks wired into create/delete/move operations so orphaned flags are cleaned up and renamed keys retain settings.

## Acceptance Criteria
- Toggling the share switch updates Redis, re-fetches state, and surfaces success/failure toasts; conflicting updates roll back gracefully.
- Visiting a public link without authentication returns the markdown body (via UI and API) with `Cache-Control: public, max-age=60`.
- Private files always return 404 from the public API, even when authenticated users know the slug.
- Moving or renaming a file preserves its public flag; deleting a file removes the flag.
- The workspace header toggle is disabled while file metadata is loading or the editor has no active file.
- Snapshot builds and existing `/files` flows continue to function with no regressions.

---

## Story 11.1 — Metadata & Authenticated Controls
- Create `lib/file-meta.ts` with helpers for `getFileMeta`, `setFileMeta`, `deleteFileMeta`, and `renameFileMeta` that guard against malformed payloads.
- Add `/api/fs/meta` (GET/PUT) to read and update a file’s public flag; requests require authentication and use `normalizeFileKey`.
- Integrate metadata reads in the editor store so the header toggle reflects current state and re-fetches when the selection changes.
- Update mutation routes (`/api/fs/file`, `/api/fs/folder`, `/api/fs/move`, `/api/fs/mkdir`) to clear or move metadata entries alongside file operations.
- Emit toast notifications on optimistic failures and surface a share URL copier once a file is public.

Sub-tasks
- [ ] Implement Redis metadata helpers with runtime validation.
- [ ] Expose authenticated metadata API (`GET`/`PUT`) returning `{ public: boolean }`.
- [ ] Hydrate editor store with sharing state and expose actions for toggling.
- [ ] Wire metadata deletion into delete flows and rename handling into move flows.
- [ ] Add UI primitives (toggle + tooltip + copy button) in the workspace header.

Test Plan
- Toggle sharing on/off for a file and confirm Redis reflects the flag; reload the workspace and ensure UI state persists.
- Move a public file to a new folder and verify the flag survives; delete the file and confirm the metadata entry disappears.
- Attempt to toggle sharing without authentication (API) and verify 401 response.
- Simulate a Redis failure (e.g., stop local server) and confirm the UI shows an error toast without leaving stale optimistic state.

---

## Story 11.2 — Public Reader Experience
- Add `/api/public/file` (`GET`) that validates the target key, checks metadata, and returns cached file content with anonymous-friendly headers.
- Build `/p/[...path]/page.tsx` that fetches public content on the server, renders markdown using existing preview components, and hides all workspace chrome.
- Include lightweight 404 handling and guidance when a link is private or the file no longer exists.
- Ensure SSG/ISR stays disabled (use dynamic rendering) and public responses respect `etag`/`last-modified` semantics.

Sub-tasks
- [ ] Implement anonymous public file handler guarded by metadata lookup.
- [ ] Create minimalist layout for `/p/...` that renders markdown and basic metadata (title, last updated).
- [ ] Add copy/share helpers in the private UI that point to the new route.
- [ ] Cover edge cases: private file access → 404, deleted file → 404 with friendly message.

Test Plan
- Visit a newly shared link in an incognito window and confirm the markdown renders without navigation UI.
- Flip the toggle back to private; the public link should now return 404 and the reader page should display the friendly error state.
- Inspect response headers on the public API: `Cache-Control: public, max-age=60`, `ETag`, `Last-Modified`, and `X-File-Cache`.
- Run existing authenticated flows (edit/save/move/delete) to ensure no regressions in the main workspace.

---

## Definition of Done
- Authenticated users can toggle sharing per file, see accurate state, and copy the resulting `/p/...` link.
- Public links respect metadata, require no authentication, and serve markdown without the workspace chrome.
- Redis metadata remains consistent across create/move/delete flows.
- Unit/manual test plan executed with no regressions detected in existing file management features.
