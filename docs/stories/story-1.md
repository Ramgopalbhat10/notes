# Story 1 — Browse Vault (File Tree, Read‑only)

Goal: Implement a performant, read‑only file tree for a markdown vault backed by S3 (Tigris). This covers listing folders/files, lazy loading by folder, and a basic UI to expand/collapse and select a file. Mutations (create/rename/delete/move) are out of scope for this story.

## Scope
- In: List folders/files from S3 using prefix + delimiter; lazy load on expand; cache in client store; simple search filter; basic keyboard nav (optional sub‑story).
- Out (next stories): Create/rename/delete/move, file content fetch/edit, AI, drag & drop, advanced keyboard, persistence of open state.

## Deliverables
- Server: `/api/fs/list` route handler returning folders and files for a given `prefix`.
- Client: Normalized tree store and left sidebar File Tree rendering root and expanded folders.
- UX: Expand/collapse, click to select a file; optional: quick filter, basic arrow‑key navigation.

## Acceptance Criteria
- Listing uses S3 ListObjectsV2 with `Delimiter='/'` and supports pagination via `ContinuationToken`.
- Only `.md` files are returned; folders inferred from `CommonPrefixes`.
- Lazy load: children load when a folder is expanded; subsequent expands do not refetch (cached).
- Tree state is normalized (O(1) updates) and keeps `openFolders`, `selectedId`.
- Selecting a file updates selected state and surfaces the selected path to the main area (placeholder).
- Empty states and loading states are shown per folder.
- Errors surface a user‑friendly message; failures do not crash the app.

---

## Story 1.1 — API: List Folder Contents
Server route for browsing the vault by prefix.

- Endpoint: `GET /api/fs/list?prefix=<path/>`
- Env: `TIGRIS_S3_ENDPOINT`, `TIGRIS_S3_REGION`, `TIGRIS_S3_ACCESS_KEY_ID`, `TIGRIS_S3_SECRET_ACCESS_KEY`, `TIGRIS_S3_BUCKET`, optional `TIGRIS_S3_PREFIX` (vault base path, e.g., `vault/`).
- Behavior:
  - Calls S3 `ListObjectsV2` with `Prefix=<vaultPrefix+path>` and `Delimiter='/'`.
  - Maps `CommonPrefixes` → folders; `Contents` → files (filter `.md`).
  - Supports `continuationToken` for pagination; returns `nextContinuationToken` until fully read.
- Response shape:
```json
{
  "prefix": "path/",
  "folders": ["docs/", "notes/"],
  "files": [
    { "key": "path/file.md", "etag": "\"...\"", "lastModified": "2024-01-01T00:00:00.000Z", "size": 1234 }
  ],
  "nextContinuationToken": null
}
```

Sub-tasks
- [x] Add `lib/s3.ts` factory for AWS S3 client configured for Tigris.
- [x] Implement `/app/api/fs/list/route.ts` with input validation and error mapping.
- [x] Support pagination: accept `continuationToken`, return `nextContinuationToken`.
- [x] Filter non-markdown files; normalize keys to relative to vault prefix.
- [x] Return 400 on invalid `prefix` (disallow `..`, backslashes, leading `//`).
- [ ] Basic unit test of mapper (optional) or local handler test plan.

Test Plan
- Call with empty `prefix` → returns top‑level folders/files.
- Call with nested `prefix` (e.g., `notes/`) → returns its children.
- Paginated bucket → `nextContinuationToken` non‑null until last page.
- Non‑md objects are excluded; folders inferred only via `CommonPrefixes`.

---

## Story 1.2 — Client Tree Store (Normalized)
A lightweight state container for nodes and UI flags.

Types (reference):
```ts
// id = relative path (folder: ending with '/')
export type NodeId = string;
export type FileNode = { id: NodeId; type: 'file'; name: string; path: string; parentId: NodeId | null; etag?: string; lastModified?: string; size?: number };
export type FolderNode = { id: NodeId; type: 'folder'; name: string; path: string; parentId: NodeId | null; children?: NodeId[]; childrenLoaded?: boolean };
export type Node = FileNode | FolderNode;
export type TreeState = { nodes: Record<NodeId, Node>; rootIds: NodeId[]; openFolders: Record<NodeId, boolean>; selectedId: NodeId | null };
```
API (store methods)
- `initRoot(): Promise<void>` — loads root listing into store.
- `toggleFolder(id: NodeId): Promise<void>` — expand if not loaded; collapse otherwise.
- `select(id: NodeId): void` — set `selectedId` if file.
- `applyListing(parentId: NodeId | null, { folders, files }): void` — normalize into nodes and set children.
- Optional: `filter(query: string): void` — keep client‑side filter term.

Sub-tasks
- [x] Create `stores/tree.ts` (Zustand or React Context) with state + actions above.
- [x] Implement normalizer: derive `name` from basename; folder ids end with `/`.
- [x] Cache children: set `childrenLoaded=true` on first successful fetch.
- [x] Keep `openFolders[id]` boolean; default closed.
- [x] Minimal error state per folder id (e.g., map of id → last error).

Test Plan
- Initialize on load → `rootIds` populated; `childrenLoaded` of root computed.
- Expand a folder twice → second expand does not refetch.
- Select a file → `selectedId` updates; selecting a folder does nothing.

---

## Story 1.3 — UI: File Tree (Read‑only)
Render left sidebar tree using existing `Sidebar` and `ScrollArea` components.

UX
- Rows: icon + name; folders toggled by click; files set selected.
- Show loading skeleton while fetching children; show “Empty” when no items.
- Selected file row highlighted.

Sub-tasks
- [x] Add `components/file-tree.tsx` to render nodes from the store.
- [x] Root view: show `rootIds`; nested lists for expanded folders.
- [x] Icons: folder open/closed; file for `.md`.
- [x] Loading/Empty/Error states per expanded folder section.
- [x] Click handlers: folders toggle; files select.

Test Plan
- On first load, root renders; clicking folder lazily loads and displays children.
- Selecting a file visibly highlights the row.
- Error state shows a retry button (optional).

---

## Story 1.4 — Optional: Filter + Basic Keyboard Nav
Keep this minimal to avoid scope creep; implement only if time permits.

Sub-tasks
- [x] Add a small search input above the tree; filters by node name among loaded nodes only.
- [x] Arrow Up/Down to move a virtual cursor among visible rows; Left to collapse folder; Right to expand; Enter to select file.

Acceptance
- Filter is client‑side and non‑destructive; clearing restores view.
- Keyboard works within loaded nodes; no prefetching required.
- Filter input is debounced to keep typing smooth on larger trees.

---

## Notes & Constraints
- Security: Validate `prefix` to avoid traversal; do not leak bucket info or credentials.
- Performance: Prefer lazy folder loads; keep renders shallow with normalized state.
- Accessibility: Rows use ARIA tree semantics (`role="tree"` and `role="treeitem"`) with `aria-level`, `aria-posinset`, and `aria-setsize`. Maintain visible focus and ensure keyboard support if Story 1.4 is included.
- Telemetry: None required in this story.

## Definition of Done
- Server list endpoint deployed and returns correct shapes for sample prefixes.
- Store and File Tree UI integrated; user can browse folders and choose a file.
- Empty/loading/error states covered; basic tests or manual checks executed.
