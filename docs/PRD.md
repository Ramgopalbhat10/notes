# Project Requirements Document (PRD)

## 1. Summary
- Goal: Build a lightweight, local-first-feeling Obsidian-like markdown workspace with AI assistance.
- Core pillars:
  - Left: Folder/File navigation (markdown-only) with hover utilities and context menu.
  - Center: Markdown edit/preview with top actions: Edit/Preview toggle, AI actions dropdown.
  - Right: AI chat with context of currently opened file using Vercel AI SDK + AI UI elements.
- Storage: S3-compatible (Tigris) via AWS JS SDK v3. Cluster-wide cache: Upstash Redis for file content cache and manifest. Client calls our Next.js API routes; secrets remain server-side.
- Tech: Next.js App Router, React 19, Tailwind v4, Radix UI/shadcn, react-markdown, Vercel AI SDK.

## 2. In-Scope Features
1) File Tree (Left Sidebar)
   - Navigate a markdown “vault” (one S3 bucket + optional prefix).
   - Folders and files (only `.md`).
   - Hover utility icons on each row: New file, New folder, Rename, Delete.
   - Context menu on right-click for the same actions + Move/Copy and Download.
   - Lazy-loading by folder; no full-bucket scans on first load.
   - Keyboard: Up/Down, Expand/Collapse with Arrow keys, Enter to open.
   - Search filter input to filter visible tree nodes by name.
   - Toast notifications for success and failure states (shadcn/ui toasts).

2) Editor/Preview (Main Content)
   - Default: Preview mode rendering markdown via `react-markdown` + `remark-gfm`.
   - Toggle Edit/Preview with a single icon button in the header.
   - Editor: CodeMirror 6 (markdown language) with basic markdown shortcuts and line wrapping.
   - Save with Ctrl/Cmd+S, autosave debounce (e.g., 800ms) while editing.
   - Dirty indicator, saving state, error banner on failure.
   - Basic frontmatter detection; do not mutate frontmatter unless editing.

3) AI (Main actions + Right Sidebar)
   - AI actions dropdown in main header: Improve Writing, Summarize, Expand.
   - Each action runs a server-side AI function with the current file content as context and returns a suggestion.
   - Right sidebar: Chat UI (ChatGPT-like) using Vercel AI SDK + AI UI elements, with the opened file as context.
   - Streaming responses; option to copy response or insert into editor.

## 3. Non-Goals (Initial Release)
- No multi-user collaboration/cursors.
- No local filesystem access.
- No non-markdown file types.
- No advanced graph view, backlinks, or tags extraction beyond simple links.
- Drag-and-drop reordering/moving optional; may land post-MVP.

## 4. User Stories & Acceptance Criteria
1) Browse vault
   - As a user, I see folders/files in the left sidebar; expanding a folder loads its children from S3.
   - AC: Only `.md` files are shown; folders are inferred from prefixes; opening is instant after the first fetch.

2) Manage files
   - As a user, I can create/rename/delete files/folders from hover actions or context menu.
   - AC: Actions reflect immediately (optimistic), persist to S3, revert on failure with a clear error.

3) Edit content
   - As a user, I can edit markdown and save with Ctrl/Cmd+S or autosave.
   - AC: Saving returns new ETag/version; UI shows “Saved” or error state; navigating away from dirty state prompts.

4) Preview content
   - As a user, I can preview markdown accurately with links, tables, lists, code blocks.
   - AC: `remark-gfm` enabled; syntax code blocks render; raw HTML sanitized.

5) AI actions
   - As a user, I can run Improve/Summarize/Expand on my document.
   - AC: Server returns streamed result; I can accept to replace selection/document or copy to clipboard.

6) AI chat
   - As a user, I can chat with an assistant that knows my open document content.
   - AC: Messages stream; context window respects size limits; I can insert an answer into editor.

## 5. Architecture
### 5.1 High-Level
- AppShell (existing) composes: Left sidebar (file tree), Center (editor/preview + header actions), Right sidebar (AI chat).
- Client UI uses shadcn primitives; state for file tree and editor is kept in a client store (Zustand recommended) for responsiveness.
- Server-side Next.js Route Handlers under `/app/api` provide S3 operations and AI endpoints.
- All S3 credentials/config live on server; client never sees secrets.
 - File content reads use a Redis-backed read-through cache (Upstash) plus Next.js Incremental Cache (`unstable_cache`) for per-instance dedupe. Writes delete Redis keys and `revalidateTag` to keep caches coherent.

### 5.2 Packages
- Storage: `@aws-sdk/client-s3` (v3) configured for Tigris S3-compatible endpoint.
- Markdown: `react-markdown`, `remark-gfm`, `rehype-sanitize`, optional code highlighting (Shiki or rehype-prism later).
- Editor: CodeMirror 6 via `@uiw/react-codemirror` + `@codemirror/lang-markdown`.
- AI: Vercel AI SDK (`ai` package) + AI UI Elements (Chat/Composer components, or `useChat` hooks if preferred).
- State: Zustand (lightweight, optional but recommended) or React Context.
- Data fetching: React Query.
 - UI: `@radix-ui/react-toast` via shadcn/ui toast primitives for notifications.

## 6. Data Model & Structures
### 6.1 S3 Mapping
- Bucket: `TIGRIS_S3_BUCKET`.
- Optional prefix (aka “vault”): `TIGRIS_S3_PREFIX` (e.g., `vault/`).
- Files: stored as objects with keys like `vault/path/to/file.md`.
- Folders: represented by key prefixes; placeholder objects like `vault/path/` may be created for empties.

### 6.2 Tree Node Model
```ts
type NodeId = string; // full key or synthetic id for folders
type FileNode = {
  id: NodeId;
  type: 'file';
  name: string;          // basename (file.md)
  path: string;          // key without bucket (vault/a/b/file.md)
  parentId: NodeId | null;
  etag?: string;
  lastModified?: string;
  size?: number;
};
type FolderNode = {
  id: NodeId;
  type: 'folder';
  name: string;          // basename
  path: string;          // prefix ending with '/'
  parentId: NodeId | null;
  children?: NodeId[];   // populated on expand
  childrenLoaded?: boolean;
};
type Node = FileNode | FolderNode;

type TreeState = {
  nodes: Record<NodeId, Node>;
  rootIds: NodeId[];
  openFolders: Record<NodeId, boolean>;
  selectedId: NodeId | null; // currently opened file
};
```

Notes
- Normalized store avoids deep re-renders; supports O(1) updates for rename/move.
- Folders only load children when expanded (ListObjectsV2 with Delimiter='/').
- Large buckets: paginate S3 listings; merge into store incrementally.

### 6.3 Concurrency & Versioning
- Track `etag` per file. For safe updates:
  - Flow: `HEAD` to fetch current ETag -> compare -> `PUT` new content.
  - If mismatch, return 409 with current ETag; UI prompts to merge/overwrite.
- Consider enabling bucket versioning to keep history (future enhancement).

## 7. API Design (Next.js Route Handlers)
All endpoints live under `/app/api/*`. Server-only; validate inputs and authorize.

Env Vars
- `TIGRIS_S3_ENDPOINT`
- `TIGRIS_S3_REGION`
- `TIGRIS_S3_ACCESS_KEY_ID`
- `TIGRIS_S3_SECRET_ACCESS_KEY`
- `TIGRIS_S3_BUCKET`
- `TIGRIS_S3_PREFIX` (optional)
- `UPSTASH_REDIS_REST_URL` (for Redis-backed caches)
- `UPSTASH_REDIS_REST_TOKEN` (for Redis-backed caches)
- `AI_MODEL` (e.g., `gpt-4o-mini`, configurable)
- Provider API keys (e.g., `OPENAI_API_KEY`) as needed by Vercel AI SDK provider.

7.1 Filesystem
- GET `/api/fs/list?prefix=path/` → { folders: string[], files: { key, etag, lastModified, size }[] }
  - Uses `ListObjectsV2` with `Prefix=<vault+prefix>` and `Delimiter='/'`.
- GET `/api/fs/file?key=path/to/file.md` → { key, content, etag, lastModified }
- PUT `/api/fs/file` body: { key, content, ifMatchEtag? } → { etag }
- POST `/api/fs/mkdir` body: { prefix } → 201
- POST `/api/fs/move` body: { fromKey, toKey, ifMatchEtag? } → { etag }
  - CopyObject then DeleteObject; validate overwrite rules.
- DELETE `/api/fs/file` body: { key, ifMatchEtag? } → 204
- DELETE `/api/fs/folder` body: { prefix, recursive } → 204 (delete by listing + batch delete)

7.2 AI
- POST `/api/ai/action` body: { action: 'improve' | 'summarize' | 'expand', content: string, selection?: string }
  - Returns streamed text suggestion. Server composes prompt with concise system instructions and content.
- POST `/api/ai/chat` body: { messages: ChatMessage[], file: { key, contentDigest, excerpt }, model?: string }
  - Streams responses using Vercel AI SDK; server loads file content (by key) and injects as context.

## 8. UI/UX Specification
### 8.1 Left Sidebar
- Header (existing): Title “Menu”; add a search bar (`SidebarInput`) to filter nodes.
- Tree rows:
  - Icon: folder/file based on type.
  - Name with ellipsis; tooltip on overflow.
  - Hover actions (right-aligned): New, Rename, Delete. Hide on mobile; accessible via context menu.
  - Right-click opens context menu (Radix ContextMenu) with: Open, New File, New Folder, Rename, Move, Delete, Download.
  - Empty states: “No files yet” with a button to create first note.
  - Notifications: Show success/error toasts for actions and data load failures.
  - Accessibility: Use ARIA tree semantics on rows (`role="tree"` / `treeitem"`) with `aria-level`, `aria-posinset`, `aria-setsize`; maintain keyboard focus and visibility.

### 8.2 Main Header (within AppShell main)
- Left: Breadcrumb of current file path (clickable segments to navigate folders).
- Right actions:
  - Edit/Preview toggle: shows single icon reflecting current mode.
  - AI actions dropdown: Improve Writing, Summarize, Expand.
    - On click: calls `/api/ai/action`. Show loading state; user can insert result replacing selection or append below.

### 8.3 Editor/Preview Body
- Preview: `react-markdown` + `remark-gfm` + `rehype-sanitize`. Code block highlighting optional phase 2.
- Editor: CodeMirror 6 (markdown), soft wrap, basic keymaps, vim/emacs modes optional later.
- Status bar (subtle): “Saved • 12:34:56”, “Saving…”, “Failed to save: …”.
- Navigation prompt on dirty state if user switches files.

### 8.4 Right Sidebar (AI Chat)
- Chat UI using Vercel AI SDK UI elements (Chat/Composer) or `useChat` hook with provided components.
- System context: current file’s title/path and full content (truncated if oversized) + summary.
- Features: Streaming messages, Regenerate last, Copy, Insert into editor (appends to cursor or replaces selection).
- Safety: Model and provider configurable; server sanitizes and bounds prompt/context size.

## 9. Performance & Scalability
- Tree
  - Lazy load per expanded folder; use S3 delimiter to avoid scanning entire bucket.
  - Cache folder listings in memory; invalidate on mutations.
- Editor
  - Debounced autosave; cancel inflight save on quick edits; coalesce changes.
- AI
  - Stream responses; chunk insert; clamp file context by tokens (e.g., 20–40k tokens target) with smart excerpting.
 - File Content
   - Redis-backed cluster-wide cache for file payloads eliminates cross-region misses; Next.js incremental cache handles per-instance dedupe. Tag invalidation and Redis `DEL` on writes keep data fresh.

## 10. Error Handling & Edge Cases
- S3 permission failures → user-facing error with retry.
- ETag mismatch on save/rename → show conflict modal (View remote, Keep mine, Merge later).
- Rename/move to existing key → confirm overwrite or abort.
- Delete folder requires confirmation when non-empty.
- Network offline → queue autosave locally; prompt when back online (phase 2).
 - Surface user-friendly errors as destructive toasts in addition to inline UI states.

## 11. Security & Privacy
- S3 credentials only on server. All mutating operations are server-side.
- Validate keys to prevent path traversal; whitelist `.md` writes and `/` delimited paths only.
- Rate-limit AI endpoints; cap max input size; redact secrets in logs.
- Sanitize rendered HTML in preview.

## 12. Analytics (Optional)
- Track: action usage, save errors, AI action acceptance rate (with user consent).

## 13. Milestones & Deliverables
M1: Storage & Tree (Backend + UI)
- API: list/get/put/delete/rename (move)/mkdir.
- Client: Tree store + UI, hover actions, context menu, search filter.

M2: Editor/Preview
- React-markdown preview with GFM and sanitize.
- CodeMirror editor, edit/preview toggle, save (manual + autosave), status bar, dirty guard.

M3: AI Actions + Chat
- `/api/ai/action` and `/api/ai/chat` using Vercel AI SDK + Elements.
- Right sidebar chat UI; insert response into editor.
- AI dropdown actions with streamed result and apply.

M4: Polish
- Keyboard shortcuts, breadcrumbs, empty/loading states, error UX.
- Tests for API handlers; smoke tests for tree operations.
 - Toast notifications integrated across actions and data load errors.

## 14. Open Questions
- Drag-and-drop to move files/folders (dnd-kit)? If yes, which milestone?
- Versioning: enable bucket versioning and an in-app history view?
- Sharing/collaboration: future roadmap?
- Large file limits and chunked uploads (multipart) needed?

## 15. Appendix: S3 Operation Details
- Create file: `PutObject` with `Content-Type: text/markdown; charset=utf-8`. Return ETag.
- Create folder: Optional placeholder `PutObject` with key ending `/` (e.g., `path/`).
- Delete file/folder: `DeleteObject` or `DeleteObjects` for batches.
- Rename/move: `CopyObject` to new key, then `DeleteObject` old key. If target exists, require `overwrite=true`.
- Read file: `GetObject` as text; include ETag and LastModified from head/response.
- List children: `ListObjectsV2` with `Prefix=<path/>`, `Delimiter='/'`, handle pagination with `ContinuationToken`.

## 16. Appendix: Prompts (Initial)
System prompt (chat)
- You are an assistant helping the user understand and improve a markdown note. Prioritize correctness and clarity. Use the provided context.

Action prompts
- Improve Writing: “Rewrite the following markdown for clarity and style. Preserve structure and code blocks. Content:\n…”.
- Summarize: “Provide a concise summary (bulleted) of this markdown. Content:\n…”.
- Expand: “Expand this section into a more detailed explanation. If nothing is selected, expand the whole document. Content/Selection:\n…”.

