# Story 29 — Chat Vault Tools

Goal: Let chat, when the user opts in, do the same vault work they can do in the app: browse, read, create, edit, move, rename, delete, and roll back markdown files and folders — including fetching a URL with Parallel and writing the result to a new note.

## Scope
- In: Opt-in Vault chat tools (`list_dir`, `read_file`, `write_file`, `edit_file`, `create_folder`, `delete_path`, `move_path`, `list_versions`, `rollback_file`); Parallel `extractTool` alongside existing `searchTool`; shared server helpers reused by chat tools and existing FS/version routes; tool activity rows; tree refresh and editor sync after mutations.
- Out: Settings, sharing, PWA, auth, AI Actions workspace; non-markdown files; per-action confirm modals; custom crawlers; changing Web Search provider-submenu UX; vault-root delete.

## Deliverables
- Design spec: `docs/superpowers/specs/2026-09-13-chat-vault-write-tools-design.md`
- Implementation (after spec approval): tool registry + vault tools, shared FS helpers, chat route budget/prompt, tools popover inline toggle, tool activity UI, tree/editor sync
- ADR during implementation: `docs/decisions/ADR-chat-vault-tools.md`

## Acceptance Criteria
- With Vault off, chat cannot mutate or list/read other vault paths via tools; existing chat and Web Search behavior is unchanged.
- With Parallel on, the model can call extract for a specific URL as well as search.
- With Vault on, chat can create a `.md` file (including nested mkdir-p paths) whose content appears in the tree.
- With Vault on, chat can edit an existing note without wiping unread content when the file was truncated (`edit_file`).
- With Vault on, chat can create folders, rename/move files and folders, and delete files or recursive folders the user named.
- With Vault on, chat can list versions and roll back using the same persistence as the History panel.
- Invalid paths (`..`, non-`.md`) and vault-root delete are rejected. Delete requires `confirm_path` to match.
- Successful mutations show activity rows and a toast; the tree refreshes; the open editor follows the spec’s sync rules (reload if clean, do not clobber a dirty buffer on edit).
- The Humble Bundle-style flow works: extract a URL, write a markdown table of titles and links to a new file.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-09-13 | docs | Opened Story 29, wrote the vault-write chat tools design spec, and parked implementation until spec approval. |
| 2026-09-13 | docs | Expanded the spec from create-only to full vault parity (read, write, edit, move, delete, versions) per user feedback. |
| 2026-09-13 | feat | Extracted shared vault mutation helpers, added Parallel extract + vault chat tools, inline Vault toggle, tool activity rows, and editor/tree sync. |
| 2026-09-13 | quality | Split client tool registry from server resolver so vault FS code stays off the client bundle; `pnpm lint` and `pnpm build` passed. |
| 2026-09-13 | fix | Stopped `create_folder` from 409ing on new folders; literal `edit_file` replace; manifest-based delete/move; parent-folder editor retarget. |
| 2026-09-13 | fix | Allowed `cursor/` Cloud Agent branches in workflow-gates (Issue 46) so PR #123 can pass CI. |
| 2026-09-13 | fix | Codex review: keep `updateTag` in Server Actions, reject folder-into-self moves, pass If-Match on `edit_file` (Issue 47). |

## Issues

| Issue | Title | Status | File |
|---|---|---|---|
| 46 | workflow-gates rejects Cursor Cloud Agent `cursor/` branches | resolved | `docs/issues/issue-46.md` |
| 47 | Codex review: updateTag, nested folder moves, edit_file If-Match | resolved | `docs/issues/issue-47.md` |

---

## Story 29.1 — Design spec
- Components
  - `docs/superpowers/specs/2026-09-13-chat-vault-write-tools-design.md`
- Behavior
  - Capture the recommended server-side tool-loop design, Parallel extract extension, full mutation set, editor sync, and UX.

Sub-tasks
- [x] Write the design spec with approaches, recommendation, and resolved assumptions.
- [x] Index the spec from this story and `docs/PROGRESS.md`.
- [x] Expand the spec to full vault action parity (not create-only).

Test Plan
- Spec self-review: no placeholders, no contradictions, v1 scope is a single implementation plan.

---

## Story 29.2 — Server tools and shared mutation path
- Components
  - `lib/ai/tools.ts`
  - `lib/ai/vault-tools.ts`
  - `app/api/ai/chat/route.ts`
  - `app/api/fs/file/route.ts`
  - `app/api/fs/mkdir/route.ts`
  - `app/api/fs/folder/route.ts`
  - `app/api/fs/move/route.ts`
  - `app/actions/file-versions.ts`
- Behavior
  - Register `extractTool` when Parallel is enabled.
  - Register the full Vault tool set when Vault is enabled.
  - Tools call the same persistence path as the FS HTTP routes and version actions.
  - Raise duration and step budget when tools are on; extend the system prompt.

Sub-tasks
- [x] Extract shared helpers from file save/delete, mkdir, folder delete, move, and version list/rollback.
- [x] Add vault tool factories with validation, structured results, size caps, and `confirm_path` on delete.
- [x] Wire Parallel extract + vault tools in `resolveServerTools()`.
- [x] Update chat route system prompt, `maxDuration`, and `stepCountIs`.

Test Plan
- Manual: create, nested path, snippet edit, full write, move, delete file/folder, rollback, invalid path, Parallel URL extract without Vault.

---

## Story 29.3 — Tools popover, activity UI, tree and editor sync
- Components
  - `components/ai-chat/tools-selector/*`
  - `components/ai-chat/chat-message.tsx`
  - `components/ai-chat/utils.ts`
  - `components/ai-chat/hooks/use-chat-session.ts`
- Behavior
  - Vault appears as an inline switch in the tools popover.
  - Assistant messages show compact tool activity for search/extract/vault tools.
  - Successful mutations refresh the tree, toast, and sync the open editor per the spec.

Sub-tasks
- [x] Add Vault to `CHAT_TOOLS` with an inline toggle (no provider submenu).
- [x] Render tool activity rows from UIMessage parts.
- [x] On successful vault mutations, `refreshTree({ silent: true })`, toast, and apply editor sync rules.
- [x] Open-path action that respects dirty editor navigation.

Test Plan
- Toggle Vault on/off; create/edit/delete/move from chat; dirty vs clean editor; Open from an activity row.

---

## Story 29.4 — Verification and Regression Checks
- Components
  - All changed files
- Behavior
  - Validate the Humble Bundle-style flow and the mutation suite; ensure chat-without-tools still matches current behavior.

Sub-tasks
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [x] Fix `create_folder` ancestor mkdir 409, `$` snippet replace, and delete/move path resolution.
- [ ] Manual smoke: no tools, Parallel only, Vault only, Parallel + Vault URL-to-file, edit/move/delete/rollback.

Test Plan
- Chat without tools streams as today.
- Parallel-only URL prompt does not mutate the vault.
- Combined tools create a markdown table file from a named URL.
- Edit, move, delete, and rollback match the tree/History UI outcomes.
- Dirty editor is not silently replaced on chat edit.

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
- Story 28 — Markdown File Version History & Rollback
- https://www.npmjs.com/package/@parallel-web/ai-sdk-tools
- https://docs.parallel.ai/integrations/vercel
