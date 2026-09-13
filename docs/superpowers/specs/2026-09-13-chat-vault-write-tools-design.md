# Chat Vault Tools

Date: 2026-09-13
Status: Accepted
Story: `docs/stories/story-29.md`

## Problem

The right-sidebar chat can search the web with Parallel (Story 26) and can talk about the open note, but it cannot change the vault. A prompt like “go to this Humble Bundle URL, capture the book list and links, and create a markdown table file” currently dies at the last step: the model can describe the table, and the user can Insert it into the current editor, but the assistant cannot create, edit, move, or delete notes.

The user-facing rule is broader than that example. **Whatever the signed-in user can already do to files, folders, and note content from the app, chat should be able to do when Vault tools are on.**

## Goal

Let an authenticated user opt in to Vault tools in chat so the assistant can, in one turn when needed:

1. Use Parallel to search and to fetch a specific URL.
2. Browse the vault (`list_dir`) and read notes that are not the open file (`read_file`).
3. Create markdown files with content, including nested paths (mkdir-p).
4. Create empty folders.
5. Edit existing notes (snippet replace or full rewrite).
6. Rename and move files and folders.
7. Delete files and folders (folder delete is recursive, same as the tree UI).
8. List and roll back file versions, same as the History panel.
9. Show what changed and keep the tree and open editor consistent with those mutations.

## Non-goals (v1)

- Binary or non-markdown files (the vault itself does not support them).
- Extra per-action confirmation modals on top of the Vault toggle. The toggle is the consent gate; destructive tools still require an explicit target in the user message plus a `confirm_path` echo.
- App surfaces that are not vault mutations: settings, sharing links, PWA, auth, theme, outline-only UX, AI Actions workspace.
- Conversation persistence, RAG, or acting on another user’s vault.
- A custom crawler. Fetching uses Parallel’s extract tool.
- Changing Web Search’s current provider submenu UX.
- Bulk “delete everything” / vault-root delete.

## Resolved assumptions

These are locked for v1 so implementation is not blocked on a live Q&A. Change them in this spec before coding if they are wrong.

| Topic | Decision |
|---|---|
| Parity | Chat tools cover every vault mutation the tree and editor already expose: create, read, write, snippet-edit, mkdir, rename, move, delete, list versions, rollback. |
| Consent | One opt-in **Vault** toggle in the Tools popover. Off = no vault tools. On = the full set. Not always-on. |
| Execution | Tools run server-side inside `/api/ai/chat` `streamText`, same as Parallel `searchTool`. They call shared domain helpers extracted from existing FS routes, not a second persistence stack. |
| File type | Markdown only. Reuse `normalizeFileKey` / `normalizeFolderPrefix`. |
| Nested creates | `write_file` is mkdir-p: ancestor folders become S3 placeholders and manifest nodes. |
| Full write vs edit | `write_file` creates or replaces the whole file. `edit_file` replaces a unique snippet. Prefer `edit_file` unless the user asked for a new file or a full rewrite and the model has untruncated content. |
| Delete | `delete_path` removes a file, or a folder recursively (same as the tree). Requires `confirm_path` equal to `path`. Refuse the vault root. |
| Rename / move | One `move_path` tool. Rename is a same-parent move. Destination-exists is a 409, same as `/api/fs/move`. |
| Versions | `list_versions` and `rollback_file` wrap the existing History server actions. |
| URL capture | Enabling Parallel registers both `searchTool` and `extractTool`. |
| Default new-file path | If the user does not name a path, use the current file’s parent folder, else vault root, with a slug filename. |
| After mutations | Refresh the tree and toast. Never auto-open a different file. If the open file was mutated, sync the editor using the rules below. |
| Out of scope | Settings, sharing, AI Actions panel, non-markdown. |

## Approaches considered

### A. Server-side vault tools wrapping existing FS helpers (recommended)

Add first-party AI SDK tools to `resolveServerTools()`. When Parallel is enabled, also register `extractTool`. When Vault is enabled, register the vault tool set. One user message can extract a URL, write a new note, then rename it; or read a file and patch it.

Extract shared server functions from `PUT/DELETE /api/fs/file`, `POST /api/fs/mkdir`, `DELETE /api/fs/folder`, `POST /api/fs/move`, and the version actions so chat and the UI cannot drift.

**Pros:** Matches Story 26. One round-trip for multi-step work. Auth is already on the chat route. Persistence, cache, manifest, and version history stay on the current path.

**Cons:** The client must apply tree/editor sync after tool parts complete. A Vault-on session is as powerful as the existing authenticated FS API (already true for that user). Duration and step budget must rise.

### B. Client-side tool execution through the tree and editor stores

The model proposes actions; the browser runs `createFile`, `deleteNode`, `save`, and so on.

**Pros:** Optimistic UI for free. Easier to hang a confirm modal on delete later.

**Cons:** Extract-then-write (or read-then-edit) needs extra hops. Duplicates server persistence. Dirty-editor and navigation races are worse.

### C. Chat drafts, user confirms each mutation

The assistant only proposes a plan; the user clicks through existing dialogs.

**Pros:** Safest.

**Cons:** Fails the requested behavior. Chat would not actually do what the user can do.

**Recommendation:** Approach A. Keep C-style confirms as a later option if destructive chat actions feel too fast in practice.

## Design

### Architecture

Chat already has a tool registry (`lib/ai/tools.ts`), a client toggle map (`EnabledTools`), and a server resolver that turns toggles into Vercel AI SDK `Tool` objects. Extend that pipeline; do not add a second tool system.

```text
Tools popover
  Web Search → Parallel on  → searchTool + extractTool
  Vault      → native on    → list_dir, read_file, write_file, edit_file,
                               create_folder, delete_path, move_path,
                               list_versions, rollback_file
        ↓
POST /api/ai/chat { messages, file, model, tools }
        ↓
resolveServerTools()
        ↓
streamText({ tools, toolChoice: "auto", stopWhen: stepCountIs(N) })
        ↓
vault tools execute on server
  validate → existing FS/version helpers → cache + manifest
        ↓
UIMessage stream (text + tool parts)
        ↓
client: tool activity, refreshTree(), editor sync, toast
```

Units and boundaries:

| Unit | Does | Used via | Depends on |
|---|---|---|---|
| `lib/ai/tools.ts` | Registry + `resolveServerTools()` | Chat route, tools popover | Parallel SDK, vault tool factories |
| `lib/ai/vault-tools.ts` | Vault tool implementations and schemas | `resolveServerTools()` | Shared FS/version helpers, path validation |
| Shared FS helpers (extracted from current routes) | One code path per mutation the UI already has | HTTP routes and vault tools | S3, cache, manifest, versions |
| Chat route | Auth, context, `streamText`, duration/step budget | Client transport | tools resolver |
| Tools selector | Opt-in toggles | Composer footer | `CHAT_TOOLS` |
| Chat message tool activity | Show search/extract/vault outcomes | `ChatMessageRow` | UIMessage tool parts |
| Chat session finish handler | Refresh tree, sync editor, toast | `useChatSession` | tree store, editor store |

Each tool is understandable from its schema: what it does, how you call it, what it depends on. Changing S3 details should not change those schemas.

### Tools

**Web Search / Parallel (existing, extended)**

When `enabledTools["web-search"]` includes `"parallel"`:

- Keep `web_search` → `searchTool`.
- Add `web_extract` → `extractTool`.

The popover still has one Parallel switch. A prompt that names a URL should call extract; an open-ended lookup should call search. The system prompt must say that.

**Vault (new)**

- `id`: `vault`
- `name`: `Vault`
- `description`: `Read, create, edit, move, and delete notes and folders`
- Toggle: single inline switch (no provider submenu)
- Enablement: `enabledTools["vault"] = ["native"]`

When enabled, register the tools below. All paths are vault-relative. File paths must end in `.md` after the tool appends `.md` when the model omitted it. No leading `/`, no `..`.

#### `list_dir`

- `path` (string, optional): folder prefix; omit or `""` for vault root.
- Returns up to 200 child names with type `file` | `folder`. If there are more, `truncated: true`.
- Reads the current manifest, not a live S3 listing, so it matches the tree.

#### `read_file`

- `path` (string, required)
- Returns `{ path, content, etag, truncated }`.
- Clamp to 64 KiB UTF-8. If truncated, the model must not `write_file` a full replacement of that path until it has a complete picture (say so in the result).
- Apply the same secret redaction already used for chat file context.

#### `write_file`

- `path` (string, required)
- `content` (string, required): full markdown body, max 256 KiB
- Creates or replaces the entire file via the same helper as `PUT /api/fs/file` (cache, manifest, version capture).
- mkdir-p ancestors before write.
- Empty content is allowed (blank note).
- Use this for new files and for full rewrites when `read_file` was not truncated (or the user asked to replace the whole note).

#### `edit_file`

- `path` (string, required)
- `old_text` (string, required): exact snippet that must appear once
- `new_text` (string, required)
- Reads the file, replaces the unique `old_text` occurrence, saves through the same helper as `write_file`.
- Errors: missing file, `old_text` not found, `old_text` matched more than once, result over 256 KiB.
- This is the default way to change an existing note so a truncated context cannot wipe unread content.

#### `create_folder`

- `path` (string, required)
- Same behavior as `POST /api/fs/mkdir` (409 if it already exists). mkdir-p missing ancestors.

#### `delete_path`

- `path` (string, required): file `.md` or folder prefix
- `confirm_path` (string, required): must equal `path` or the tool refuses
- File: same as `DELETE /api/fs/file` (version cleanup included).
- Folder: recursive, same as `DELETE /api/fs/folder`.
- Refuse `""`, `"/"`, or the vault root.
- System prompt: only call this when the user named that target to delete.

#### `move_path`

- `from` (string, required)
- `to` (string, required)
- File or folder; type inferred from the source.
- Same as `POST /api/fs/move`: copy+delete, version/meta rename, 409 if destination exists.
- Covers rename (same parent, new name) and move (new parent).

#### `list_versions`

- `path` (string, required)
- Wraps `getFileVersionsAction`. Returns the current + up to 5 snapshots (ids, timestamps, sizes). No snapshot bodies.

#### `rollback_file`

- `path` (string, required)
- `version_id` (string, required)
- Wraps `rollbackToVersionAction` (current content is preserved as a version first).

Do not invent a third persistence API. Chat tools must not skip cache invalidation, manifest updates, or version capture.

### Path and content policy

- User-supplied paths win after normalization. Missing `.md` on a file tool is appended by the tool.
- New file with no path: current file’s parent, else vault root, slug from the topic.
- Multiple mutating calls per turn are allowed within the step budget (for example create folder + two files, or edit then move).
- Secrets redaction applies to content *read into the model*. Do not redact the body the model intended to write.
- `write_file` / `edit_file` of the currently open file still go through the server. Editor sync is a client concern (below), not a second write.

### Editor and tree sync

After a stream with any successful mutating vault tool:

1. `refreshTree({ silent: true })`.
2. Toast a short summary (`Created path`, `Updated path`, `Moved a → b`, `Deleted path`, `Rolled back path`).
3. Never auto-navigate to a different file.

If mutations touched the open `fileKey`:

| Mutation | Editor is clean | Editor is dirty |
|---|---|---|
| `write_file` / `edit_file` / `rollback_file` | Reload that file from the server so the user sees the new content | Do not clobber the buffer. Next save may 409; existing conflict UI handles it. Toast that the vault copy changed. |
| `delete_path` | Same as tree delete: close the file, pick the previous history item or none | Same close behavior; unsaved buffer is discarded only after the existing dirty-navigation guard if the user later tries to open something else. If chat deleted the open file, close it — the file is gone. |
| `move_path` | Update editor `fileKey` / load the new path | Keep the buffer, retarget `fileKey` to `to` so save writes to the new key. |

Dirty-delete of the open file is destructive by user request (they asked chat to delete it). Close the editor. Do not keep a ghost buffer for a key that no longer exists.

### Chat route behavior

When any tool is enabled:

- Raise `maxDuration` from 30 to 60.
- Raise `stopWhen` from `stepCountIs(5)` to `stepCountIs(12)` so list/read/extract/edit/write still fit.
- Extend the system prompt:
  - Parallel: `web_extract` for known URLs; `web_search` for open-ended lookup.
  - Vault: you may read and change the vault. Prefer `list_dir` / `read_file` before mutating an unclear path. Prefer `edit_file` for partial changes. Do not `write_file` a full replacement when `truncated` is true. Only delete when the user named the target; echo it in `confirm_path`. After mutations, tell the user the paths.
- Keep `toolChoice: "auto"`. Do not mutate on every message.

When Vault is off, the model has no vault tools and must not claim it wrote to disk. Insert-into-editor stays available as today.

`enabledTools` is client-supplied. That is already true for Parallel. Vault is not a new authz boundary: `requireApiUser` plus the existing FS API already allow these mutations. The toggle is UX, not security.

### Client UX

**Tools popover**

- Add a Vault row with icon, name, and an inline switch.
- No chevron/submenu for Vault.
- Leave Web Search’s Parallel submenu as it is.
- The wrench stays highlighted when any tool is enabled.

**Tool activity in the transcript**

Compact activity rows on assistant messages, above the final text (same family as the reasoning collapsible):

| Tool | Label |
|---|---|
| `web_search` | Searched the web |
| `web_extract` | Read `hostname` |
| `list_dir` | Listed `path` |
| `read_file` | Read `path` |
| `write_file` | Created/updated `path` |
| `edit_file` | Edited `path` |
| `create_folder` | Created folder `path` |
| `delete_path` | Deleted `path` |
| `move_path` | Moved `from` → `to` |
| `list_versions` | Listed versions of `path` |
| `rollback_file` | Rolled back `path` |

Rows for a surviving file path are buttons that open that file (dirty-navigation guard on click). Delete rows are not openers.

While a tool is running, show a spinner label. Copy/Insert use text parts only.

### Error handling

| Failure | Tool result | User-visible |
|---|---|---|
| Invalid path / not `.md` / traversal | `{ ok: false, error: "invalid_path", message }` | Assistant explains; no tree change |
| Missing file | `{ ok: false, error: "not_found", path }` | Assistant lists or asks for the path |
| `edit_file` snippet 0 or 2+ matches | `{ ok: false, error: "edit_mismatch" }` | Assistant re-reads and retries or asks |
| Oversize content | `{ ok: false, error: "too_large" }` | Assistant shortens or splits |
| Destination exists on move | `{ ok: false, error: "exists", path }` | Assistant asks for a new name |
| `confirm_path` mismatch / root delete | `{ ok: false, error: "not_confirmed" }` | Assistant does not delete |
| S3 / manifest / version failure | `{ ok: false, error: "write_failed" }` | Stream error banner if the run dies; otherwise assistant reports it |
| Parallel extract/search failure | SDK tool error | Assistant says it could not fetch |
| Vault toggled off | Tools not registered | Assistant cannot change the vault; say so |

Validation failures must not write objects. mkdir-p that succeeded before a later file write fails may leave empty folders; that matches mkdir-then-write in the UI.

### Testing (manual)

No test files.

1. Chat with no tools: identical to today.
2. Parallel on, Vault off, URL prompt: extract/search only; Insert still works; no files created.
3. Vault on, create `scratch/hello.md`: file in tree, content correct, activity row opens it.
4. Vault on, “add a bullet to `scratch/hello.md`”: `edit_file` (or equivalent) updates content; clean editor reloads.
5. Dirty editor + chat edit of that file: buffer kept; toast; save conflict UI if the user then saves.
6. Nested `research/humble-bundle/books.md`: folders and file appear.
7. Humble Bundle-style prompt with Parallel + Vault: extract, write a markdown table of titles and links.
8. Rename and move a file/folder; tree and open-file key stay correct.
9. Delete a file; delete a non-empty folder; both gone from tree. Open-file delete closes the editor.
10. `list_versions` + rollback on a file with history; content matches History panel rollback.
11. Invalid paths (`../secret.md`, `note.txt`) rejected. Root delete rejected. Delete without matching `confirm_path` rejected.
12. `pnpm lint` and `pnpm build`.

## Implementation notes

Implemented in Story 29. Shared helpers live under `lib/fs/`; vault tools in `lib/ai/vault-tools.ts`; ADR: `docs/decisions/ADR-chat-vault-tools.md`.

## Open follow-ups (explicitly later)

- Per-action confirm modals (Approach C hybrid) if destructive chat actions feel too fast.
- Save-as-file on any assistant message without Vault tools.
- Separate Extract toggle if Parallel extract cost must be independently disabled.
- Sharing links, settings, and other non-vault app actions.
