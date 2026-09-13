# ADR: Chat vault tools in the AI SDK tool loop

## Context

The right-sidebar chat could search the web (Parallel) and talk about the open note, but it could not change the vault. Users already create, edit, move, delete, and roll back markdown files through authenticated FS routes and server actions. Chat needed the same capabilities without a second persistence stack.

## Decision

Run vault operations as first-party Vercel AI SDK tools inside `POST /api/ai/chat`, behind an opt-in **Vault** toggle (`enabledTools.vault = ["native"]`).

When Parallel is enabled, register both `searchTool` and `extractTool`. When Vault is enabled, register `list_dir`, `read_file`, `write_file`, `edit_file`, `create_folder`, `delete_path`, `move_path`, `list_versions`, and `rollback_file`.

Those tools call shared helpers extracted from the existing FS HTTP routes and version actions (`saveMarkdownFile`, `createVaultFolder`, `deleteMarkdownFile`, `deleteVaultFolder`, `moveVaultNode`, `rollbackFileToVersion`). HTTP routes and chat tools share one write path for cache, manifest, and version capture.

The Tools popover toggle is consent UX, not a new authorization boundary. The chat route still requires `requireApiUser`; the same user can already mutate the vault via `/api/fs/*`.

## Alternatives considered

1. **Client-side tool execution through the tree/editor stores** — optimistic UI is free, but extract-then-write needs extra hops and duplicates persistence.
2. **Chat drafts with per-action confirm dialogs** — safest, but chat would not actually do what the user can do from the tree.

## Consequences

- Chat can create, edit, move, delete, and roll back notes in one turn, including Parallel URL extract then `write_file`.
- `maxDuration` is 60s and tool loops allow 12 steps when any tool is enabled.
- The client reloads the manifest after mutating tool results and syncs the open editor (reload if clean; keep a dirty buffer; close on delete; retarget on move).
- Destructive deletes require `confirm_path` to equal `path` and refuse the vault root.

## Rollout/notes

- Spec: `docs/superpowers/specs/2026-09-13-chat-vault-write-tools-design.md`
- Story: `docs/stories/story-29.md`
