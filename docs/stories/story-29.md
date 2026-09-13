# Story 29 — Chat Vault Write Tools

Goal: Let chat, when the user opts in, fetch web content with Parallel (search + extract) and create markdown files and folders in the vault, including nested paths with generated content.

## Scope
- In: Opt-in Vault Write chat tools (`create_file`, `create_folder`); Parallel `extractTool` alongside existing `searchTool`; shared server write/mkdir helper reused by chat tools and existing FS routes; tool activity rows in chat; tree refresh after successful writes.
- Out: Chat-driven edit/rename/move/delete; overwrite-by-default; non-markdown files; per-write confirmation dialogs; custom crawlers; changing Web Search provider-submenu UX.

## Deliverables
- Design spec: `docs/superpowers/specs/2026-09-13-chat-vault-write-tools-design.md`
- Implementation (after spec approval): tool registry + vault tools, chat route budget/prompt, tools popover inline toggle, tool activity UI, tree refresh
- ADR during implementation: `docs/decisions/ADR-chat-vault-write-tools.md`

## Acceptance Criteria
- With Vault Write off, chat cannot create files; existing chat and Web Search behavior is unchanged.
- With Parallel on, the model can call extract for a specific URL as well as search.
- With Vault Write on, a prompt that names a path and content creates a `.md` file that appears in the tree with that content.
- Nested paths create missing ancestor folders (mkdir-p).
- Existing files are not overwritten unless the user explicitly asks.
- Invalid paths (`..`, non-`.md`) are rejected.
- Successful creates show a chat activity row and a toast; the tree refreshes without forcing the open file to change.
- The Humble Bundle-style flow works: extract a URL, write a markdown table of titles and links to a new file.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-09-13 | docs | Opened Story 29, wrote the vault-write chat tools design spec, and parked implementation until spec approval. |

## Issues

| Issue | Title | Status | File |
|---|---|---|---|

---

## Story 29.1 — Design spec
- Components
  - `docs/superpowers/specs/2026-09-13-chat-vault-write-tools-design.md`
- Behavior
  - Capture the recommended server-side tool-loop design, Parallel extract extension, path/overwrite policy, and UX.

Sub-tasks
- [x] Write the design spec with approaches, recommendation, and resolved assumptions.
- [x] Index the spec from this story and `docs/PROGRESS.md`.

Test Plan
- Spec self-review: no placeholders, no contradictions, v1 scope is a single implementation plan.

---

## Story 29.2 — Server tools and shared write path
- Components
  - `lib/ai/tools.ts`
  - `lib/ai/vault-tools.ts`
  - `app/api/ai/chat/route.ts`
  - `app/api/fs/file/route.ts`
  - `app/api/fs/mkdir/route.ts`
- Behavior
  - Register `extractTool` when Parallel is enabled.
  - Register `create_file` / `create_folder` when Vault Write is enabled.
  - Tools call the same save/mkdir persistence path as the FS HTTP routes.
  - Raise duration and step budget when tools are on; extend the system prompt.

Sub-tasks
- [ ] Extract a shared markdown save helper from `PUT /api/fs/file` and reuse it from `create_file`.
- [ ] Extract or reuse mkdir + `addFolder` from `POST /api/fs/mkdir` for `create_folder` and mkdir-p.
- [ ] Add vault tool factories with validation, exists-check, size cap, and structured results.
- [ ] Wire Parallel extract + vault tools in `resolveServerTools()`.
- [ ] Update chat route system prompt, `maxDuration`, and `stepCountIs`.

Test Plan
- Manual: create file, nested path, exists-without-overwrite, invalid path, Parallel URL extract without vault write.

---

## Story 29.3 — Tools popover, activity UI, tree refresh
- Components
  - `components/ai-chat/tools-selector/*`
  - `components/ai-chat/chat-message.tsx`
  - `components/ai-chat/utils.ts`
  - `components/ai-chat/hooks/use-chat-session.ts`
- Behavior
  - Vault Write appears as an inline switch in the tools popover.
  - Assistant messages show compact tool activity (search / extract / create).
  - Successful writes refresh the tree and toast; Open uses the existing dirty-file guard.

Sub-tasks
- [ ] Add Vault Write to `CHAT_TOOLS` with an inline toggle (no provider submenu).
- [ ] Render tool activity rows from UIMessage parts.
- [ ] On successful vault writes, `refreshTree({ silent: true })` and toast.
- [ ] Open-created-file action that respects dirty editor navigation.

Test Plan
- Toggle Vault Write on/off; confirm wrench highlight; create a file from chat and open it from the activity row.

---

## Story 29.4 — Verification and Regression Checks
- Components
  - All changed files
- Behavior
  - Validate the Humble Bundle-style flow and ensure chat-without-tools still matches current behavior.

Sub-tasks
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm build`.
- [ ] Manual smoke: no tools, Parallel only, Vault Write only, Parallel + Vault Write URL-to-file.

Test Plan
- Chat without tools streams as today.
- Parallel-only URL prompt does not create files.
- Combined tools create a markdown table file from a named URL.
- Dirty editor is not silently replaced.

---

## Definition of Done
- Acceptance criteria met.
- Dev Log updated for each unit of work.
- Progress updated in `docs/PROGRESS.md`.
- Implementation ADR written when code lands.

## References
- Spec: `docs/superpowers/specs/2026-09-13-chat-vault-write-tools-design.md`
- Story 26 — Web Search Tools in AI Chat
- Story 2 — Manage Files & Folders
- Story 5 — AI Chat
- https://www.npmjs.com/package/@parallel-web/ai-sdk-tools
- https://docs.parallel.ai/integrations/vercel
