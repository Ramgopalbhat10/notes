# Chat Vault Write Tools

Date: 2026-09-13
Status: Proposed
Story: `docs/stories/story-29.md`

## Problem

The right-sidebar chat can search the web with Parallel (Story 26) and can talk about the open note, but it cannot write anything into the vault. A prompt like “go to this Humble Bundle URL, capture the book list and links, and create a markdown table file” currently dies at the last step: the model can describe the table, and the user can Insert it into the current editor, but the assistant cannot create a new file or folder.

That gap is especially sharp for research capture. The useful output is a new note at a chosen path, not a chat bubble.

## Goal

Let an authenticated user, from chat, opt in to vault write tools so the assistant can:

1. Use Parallel to search and to fetch a specific URL.
2. Create markdown files with generated content.
3. Create folders, including ancestor folders implied by a nested file path.
4. Show what it wrote and refresh the file tree so the new note is immediately usable.

## Non-goals (v1)

- Edit, overwrite-by-default, rename, move, or delete existing notes from chat.
- Binary or non-markdown files.
- Per-write confirmation dialogs.
- Conversation persistence, RAG, or writing into notes the user does not own.
- A standalone “browser scrape” product. Fetching uses Parallel’s existing extract tool, not a custom crawler.
- Changing Web Search’s current provider submenu UX.

## Resolved assumptions

These are locked for v1 so implementation is not blocked on a live Q&A. Change them in this spec before coding if they are wrong.

| Topic | Decision |
|---|---|
| Consent | Vault writes are opt-in via the Tools popover, same pattern as Web Search. The toggle is the consent gate. |
| Execution | Tools run server-side inside `/api/ai/chat` `streamText`, same as Parallel `searchTool`. |
| File type | Markdown only. Reuse `normalizeFileKey` / `normalizeFolderPrefix`. |
| Overwrite | Create-only by default. Existing keys return a structured error. `overwrite: true` is allowed only when the user explicitly asked to replace. |
| Nested paths | `create_file` is mkdir-p: ancestor folders are created as S3 placeholders and manifest nodes. |
| Empty folders | A separate `create_folder` tool exists for empty folders. Nested files do not require the model to call it first. |
| URL capture | Enabling Parallel registers both `searchTool` and `extractTool`. The Humble Bundle example is extract-first, search-second. |
| Default path | If the user does not name a path, use the current file’s parent folder, else vault root, with a slug filename. |
| After write | Refresh the tree, toast, and show a clickable path in chat. Never auto-open the created file; the user clicks Open, and the existing dirty-editor guard still runs. |
| Out of scope writes | No chat delete / rename / move. |

## Approaches considered

### A. Server-side vault tools in the existing chat tool loop (recommended)

Add first-party AI SDK tools (`create_file`, `create_folder`) to `resolveServerTools()`. When Parallel is enabled, also register `extractTool` from `@parallel-web/ai-sdk-tools`. One user message can extract a URL, format a table, and write `research/humble-bundle-oreilly-2026.md` before the stream ends.

Reuse `writeMarkdownFile`, file cache, version capture, and `addOrUpdateFile` / `addFolder` so chat writes follow the same persistence path as the tree UI. Extract a shared server helper from `PUT /api/fs/file` and `POST /api/fs/mkdir` so the tool and the HTTP routes cannot drift.

**Pros:** Matches Story 26. One round-trip for the motivating example. Auth is already on the chat route. Persistence and manifest updates stay on the server.

**Cons:** The client must notice completed tool parts and refresh the tree. Writes are as powerful as `PUT /api/fs/file` (already true for any authenticated session). `maxDuration` (30s) and `stepCountIs(5)` are too tight for extract + write and need to increase when tools are on.

### B. Client-side tool execution through the tree store

The model proposes writes; the browser executes `createFile` / `createFolder` from `stores/tree.ts` and sends results back.

**Pros:** Optimistic tree updates for free. Easier to insert a confirm modal later.

**Cons:** Multi-step extract-then-write needs extra client/server hops. Duplicates persistence already implemented on the server. Easy to desync if the user navigates mid-tool.

### C. Chat drafts, user saves

The assistant only generates markdown in the transcript. A “Save as file…” action on the message opens the existing create-file dialog.

**Pros:** Safest. No new mutating tools.

**Cons:** Fails the requested behavior. The Humble Bundle prompt would still require the user to copy, name, and save by hand.

**Recommendation:** Approach A. B is the fallback if server-side writes prove too opaque in the UI. C is a nice extra later, not the v1 path.

## Design

### Architecture

Chat already has a tool registry (`lib/ai/tools.ts`), a client toggle map (`EnabledTools`), and a server resolver that turns toggles into Vercel AI SDK `Tool` objects. Extend that pipeline; do not add a second tool system.

```text
Tools popover
  Web Search → Parallel on  → searchTool + extractTool
  Vault Write → native on   → create_file + create_folder
        ↓
POST /api/ai/chat { messages, file, model, tools }
        ↓
resolveServerTools()
        ↓
streamText({ tools, toolChoice: "auto", stopWhen: stepCountIs(N) })
        ↓
create_file / create_folder execute on server
  validate path → write S3 → cache → manifest
        ↓
UIMessage stream (text + tool parts)
        ↓
client: render tool activity, refreshTree(), toast
```

Units and boundaries:

| Unit | Does | Used via | Depends on |
|---|---|---|---|
| `lib/ai/tools.ts` | Registry + `resolveServerTools()` | Chat route, tools popover | Parallel SDK, vault tool factories |
| `lib/ai/vault-tools.ts` | `create_file` / `create_folder` tool implementations | `resolveServerTools()` | Shared save/mkdir helper, fs validation |
| `lib/fs/save-markdown.ts` (extract from file route) | One write path: S3 + cache + manifest + version | File HTTP route and vault tools | `writeMarkdownFile`, manifest updater |
| Chat route | Auth, context, `streamText`, duration/step budget | Client transport | tools resolver |
| Tools selector | Opt-in toggles | Composer footer | `CHAT_TOOLS` |
| Chat message tool activity | Show search/extract/write outcomes | `ChatMessageRow` | UIMessage tool parts |
| Chat session finish handler | Refresh tree + toast after successful writes | `useChatSession` | tree store |

Someone should be able to use `create_file` from its tool description and schema without reading S3 code. Changing how S3 writes work should not change the tool schema.

### Tools

**Web Search / Parallel (existing, extended)**

When `enabledTools["web-search"]` includes `"parallel"`:

- Keep `web_search` → `searchTool`.
- Add `web_extract` → `extractTool`.

The popover still has one Parallel switch. Extract is not a second product toggle. A prompt that names a URL should call extract; a prompt that asks “what are the latest X” should call search. The system prompt must say that when Parallel is on.

**Vault Write (new)**

New registry entry:

- `id`: `vault-write`
- `name`: `Vault Write`
- `description`: `Create markdown files and folders in the vault`
- Toggle style: single inline switch (no provider submenu)
- Internal enablement: `enabledTools["vault-write"] = ["native"]` so the existing `Record<string, string[]>` map stays unchanged

When enabled, register:

`create_file`

- `path` (string, required): vault-relative, must pass `normalizeFileKey` (no leading `/`, no `..`, must end in `.md`)
- `content` (string, required): markdown body
- `overwrite` (boolean, optional, default `false`)

`create_folder`

- `path` (string, required): vault-relative, must pass `normalizeFolderPrefix`

`create_file` mkdir-p behavior:

1. Normalize the file key.
2. For each ancestor segment, ensure an S3 folder placeholder exists (same as `POST /api/fs/mkdir`) and `addFolder` the manifest node if missing.
3. If the file exists and `overwrite` is false, return `{ ok: false, error: "exists", path }` without writing.
4. If creating or overwriting, call the shared save helper used by `PUT /api/fs/file`.
5. Return `{ ok: true, path, created: boolean, overwritten: boolean, etag? }`.

Do not invent a third write API. Chat tools must not bypass cache invalidation, manifest updates, or version capture.

### Path and content policy

- If the user gives a path, use it after normalization. If they omit `.md`, the tool (not the model) appends it before validation so `"notes/books"` becomes `"notes/books.md"`.
- If the user omits a path, the system prompt tells the model to put the file under the current file’s parent (from chat file context) or vault root, named from the topic (`humble-bundle-oreilly-software-architecture-2026.md`).
- Content limit: 256 KiB UTF-8. Over-limit returns a tool error; the model should split into multiple files or shorten.
- Empty `content` is allowed (new blank note).
- Multiple `create_file` calls in one turn are allowed within the step budget.
- Secrets redaction already runs on file *context sent to the model*. Do not redact the model’s intended note body on write; the user asked to save that text.

### Chat route behavior

When any tool is enabled:

- Raise `maxDuration` from 30 to 60 (already used by `/api/ai/action`).
- Raise `stopWhen` from `stepCountIs(5)` to `stepCountIs(10)` so extract → optional follow-up extract → create_file still fits.
- Extend the system prompt:
  - Parallel: prefer `web_extract` for known URLs; `web_search` for open-ended lookup.
  - Vault Write: create new markdown notes; do not overwrite unless the user said to; after writing, tell the user the path; if a write fails because the file exists, ask before retrying with `overwrite: true`.
- Keep `toolChoice: "auto"`. Do not force a write on every message.

When no tools are enabled, behavior stays exactly as today.

`enabledTools` is client-supplied. That is already true for Parallel. Vault write is not a new authz boundary: the chat route already requires `requireApiUser`, and the same user can `PUT /api/fs/file`. Treat the toggle as UX, not security.

### Client UX

**Tools popover**

- Add a Vault Write row with icon, name, and an inline switch.
- Do not add a chevron/submenu for this tool.
- Leave Web Search’s Parallel submenu as it is.
- The wrench button stays highlighted when any tool (search or vault write) is enabled.

**Tool activity in the transcript**

Story 26 left tool-call visualization out of scope. Vault writes need a visible outcome, so v1 adds a compact activity list on assistant messages, above the final text, similar to the reasoning collapsible:

- `web_search` — “Searched the web”
- `web_extract` — “Read `hostname`”
- `create_file` — “Created `path`” or “Failed to create `path`”
- `create_folder` — “Created folder `path`”

Successful `create_file` rows are a button that selects/opens that file, unless the editor is dirty, in which case it still offers the action and the existing dirty-navigation guard runs.

While a tool is running, show a spinner label (“Creating file…”). Copy/Insert continue to use text parts only.

**After the stream**

If any `create_file` / `create_folder` tool part completed with `ok: true`:

1. `refreshTree({ silent: true })` so the left tree matches the manifest.
2. Toast: “Created `path`”.
3. Do not change the open file automatically.

### Error handling

| Failure | Tool result | User-visible |
|---|---|---|
| Invalid path / not `.md` / traversal | `{ ok: false, error: "invalid_path", message }` | Assistant explains; no tree change |
| File exists, overwrite false | `{ ok: false, error: "exists", path }` | Assistant asks whether to overwrite or pick a new name |
| Oversize content | `{ ok: false, error: "too_large" }` | Assistant shortens or splits |
| S3 / manifest failure | `{ ok: false, error: "write_failed" }` | Chat error banner if the stream dies; otherwise assistant reports failure |
| Parallel extract/search failure | SDK tool error | Assistant says it could not fetch; no file is created unless it has enough content anyway |
| Vault Write toggled off | Tools not registered | Model cannot write; it should say it cannot create files unless the tool is enabled |

Never leave a partial markdown object in S3 for a failed validation. Ancestor mkdir that succeeded before a file write fails may leave empty folders; that is acceptable and matches normal mkdir-then-write.

### Testing (manual)

No test files. Manual checks:

1. Chat with no tools: identical to today.
2. Parallel on, Vault Write off, URL prompt: extract/search runs; no file is created; Insert still works.
3. Vault Write on, “create `scratch/hello.md` with hello”: file appears in tree, opens with Open action, content is correct.
4. Repeat the same path: tool returns exists; model asks; user says overwrite; file updates.
5. Nested path `research/humble-bundle/books.md`: folders and file appear.
6. Humble Bundle-style prompt with Parallel + Vault Write on: extract the page, write a markdown table of titles and links, tree shows the new file.
7. Invalid path (`../secret.md`, `note.txt`): rejected.
8. Dirty editor + Open from tool row: dirty guard still runs.
9. `pnpm lint` and `pnpm build`.

## Implementation notes (not this PR)

This document is the design. Implementation belongs to Story 29 after spec approval and an implementation plan.

Likely touch list:

- `lib/ai/tools.ts` — types, registry, resolver
- new `lib/ai/vault-tools.ts`
- extract shared save/mkdir helper from `app/api/fs/file/route.ts` and `app/api/fs/mkdir/route.ts`
- `app/api/ai/chat/route.ts` — duration, steps, system prompt
- `components/ai-chat/tools-selector/*`
- `components/ai-chat/chat-message.tsx` + utils for tool parts
- `components/ai-chat/hooks/use-chat-session.ts` — refresh on write
- `docs/decisions/ADR-chat-vault-write-tools.md` during implementation

## Open follow-ups (explicitly later)

- Per-write confirm dialog (Approach B hybrid).
- Save-as-file on any assistant message (Approach C).
- Chat-driven edit of the currently open file (overlaps AI Actions; keep that in the actions workspace).
- Separate Extract toggle if Parallel extract cost needs to be independently disabled.
