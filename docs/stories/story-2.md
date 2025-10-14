# Story 2 — Manage Files & Folders (Mutations)

Goal: Add create/rename/delete/move for folders and markdown files with optimistic UI and S3 (Tigris) persistence using AWS SDK v3.

## Scope
- In: Minimal CRUD for `.md` files and folders; conflict handling via ETag; hover utilities + context menu wiring.
- Out: Drag & drop reordering (future), batch operations UI, version history.

## Deliverables
- API endpoints: mkdir, move, delete, get/put file (with ETag checks).
- Client store actions for mutations with optimistic updates and rollback on failure.
- UI: Hover icons and context menu connecting to store actions.
- UI notifications: success/error toasts using shadcn/ui Toast primitives.

## Acceptance Criteria
- All mutations persist to S3 and update the tree store consistently.
- ETag conflicts surface a clear error and revert optimistic state.
- Keys are validated (no traversal, only `/`, `.md` suffix for files).

---

## Story 2.1 — API: Read/Write File
- Endpoints
  - GET `/api/fs/file?key=path/to/file.md` → `{ key, content, etag, lastModified }`
  - PUT `/api/fs/file` body: `{ key, content, ifMatchEtag? }` → `{ etag }`
- Behavior
  - GET: `GetObject` as text; include ETag and LastModified.
  - PUT: `IfMatch` when provided; `Content-Type: text/markdown; charset=utf-8`.
- Validation: key must end with `.md` and be under the vault prefix.

Sub-tasks
- [x] Implement GET handler with stream-to-string utility.
- [x] Implement PUT handler with optional `IfMatch` and return new ETag.
- [x] Map AWS errors to sensible HTTP codes/messages.

Test Plan
- Create file then fetch and verify ETag changes on updates.
- PUT with stale `ifMatchEtag` returns 409.

---

## Story 2.2 — API: mkdir, delete, move
- Endpoints
  - POST `/api/fs/mkdir` body: `{ prefix }` → 201
  - DELETE `/api/fs/file` body: `{ key, ifMatchEtag? }` → 204
  - DELETE `/api/fs/folder` body: `{ prefix, recursive }` → 204 (list + batch delete)
  - POST `/api/fs/move` body: `{ fromKey, toKey, ifMatchEtag? }` → `{ etag }`
- Behavior
  - mkdir: create placeholder object with trailing `/` if needed.
  - move: `CopyObject` then `DeleteObject`; fail if target exists unless `overwrite=true` (optional param).

Sub-tasks
- [x] Implement mkdir with validation (trailing `/`, safe path).
- [x] Implement file/folder delete; folder delete supports recursive.
- [x] Implement move; refuse overwrite unless requested.
- [x] Pagination for recursive delete (list all pages).

Test Plan
- mkdir → list shows new folder.
- move file → new key accessible, old removed.
- delete folder recursive removes all children.

---

## Story 2.3 — Client: Store Mutations (Optimistic)
- Actions
  - `createFolder(parentId, name)` → optimistic add; rollback on failure.
  - `createFile(parentId, name.md, initialContent?)` → optimistic add with empty/initial content.
  - `renameNode(id, newName)` → updates keys/paths for subtree if folder.
  - `deleteNode(id)` → optimistic remove; undo on failure.
  - `moveNode(id, newParentId)` → minimal support via dialog (no DnD).

Sub-tasks
- [x] Implement actions calling API routes; wrap with try/catch and rollback.
- [x] Derive new keys from parent `path` + `name`; ensure `.md` suffix for files.
- [x] Update `openFolders`, `children`, and selection if the selected node changes.

Test Plan
- Create, rename, delete sequences update UI immediately; errors revert.
- Renaming a folder updates descendants’ paths in store.

---

## Story 2.4 — UI: Hover Utilities & Context Menu
- Hover actions per row: New, Rename, Delete. Context menu includes Open, New File, New Folder, Rename, Move, Delete, Download.

Sub-tasks
- [x] Add hover action buttons to `components/file-tree.tsx` rows.
- [x] Add Radix ContextMenu; wire to store actions.
- [x] Simple move dialog (text input for new folder path or select existing) — minimal implementation.
- [x] Confirm modal for delete (folder warns if non-empty).

Test Plan
- Hover shows utilities; context menu via right‑click works; actions call store and API.

---

## Story 2.5 — UI: Notifications (Toasts)
- Use shadcn/ui Toast primitives with Radix under the hood to provide user feedback for actions and errors.

Sub-tasks
- [x] Add `components/ui/toast.tsx` primitives (`ToastProvider`, `ToastViewport`, `Toast`, `ToastTitle`, `ToastDescription`, `ToastClose`, `ToastAction`).
- [x] Add `components/ui/toaster.tsx` to render the toast viewport and map store items to toasts.
- [x] Add toast store and hook at `hooks/use-toast.ts` and update imports to use `@/hooks/use-toast`.
- [x] Wire success toasts for create/rename/move/delete in `components/file-tree/index.tsx`.
- [x] Wire destructive error toasts for modal submit failures.
- [x] Show destructive toasts on data load errors (root and folder) in `components/file-tree/index.tsx` and `components/file-tree/tree-nodes.tsx`.
- [x] Add `@radix-ui/react-toast` dependency.

Test Plan
- Create/rename/move/delete show a success toast with a short description.
- Invalid inputs or server failures show a destructive toast.
- Root or folder load errors surface a destructive toast in addition to inline error UI.

---

## Definition of Done
- CRUD endpoints implemented and validated.
- Tree mutations wired with optimistic updates and error handling.
- Hover utilities and context menu perform expected actions.
- Toast notifications are shown for success and failure states; load errors surface as destructive toasts.
