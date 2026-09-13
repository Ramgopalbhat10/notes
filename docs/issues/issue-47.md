# Issue 47 — Codex review: updateTag, nested folder moves, edit_file If-Match

## Type
- bug

## Status
- resolved

## Related Story
- Story 29 — Chat Vault Tools (`docs/stories/story-29.md`)

## Description
- Codex P1s on PR #123 after the vault-tools extraction:
  - `updateTag` in `saveMarkdownFile` runs from Route Handlers (`PUT /api/fs/file`, chat tools) and can throw after S3/Redis writes.
  - `move_path` can move a folder into its own subtree (`a/` → `a/sub/`).
  - `edit_file` saves without the read ETag, so a concurrent save can clobber newer content.

## Root Cause
- Shared save helper was lifted from a Server Action that legally called `updateTag`.
- Folder move copied S3 keys without rejecting dest prefixes that start with the source prefix.
- Snippet edit is read-then-write and omitted `ifMatchEtag` even though `saveMarkdownFile` already supports it.

## Fix / Approach
- Keep `updateTag` on the Server Action boundary (`updateSavedFileTag` from `saveDocumentAction` and `rollbackToVersionAction`). Route-handler saves rely on `revalidateTag(..., "max")` via `revalidateFileTags`.
- Reject folder moves where `toPrefix === fromPrefix` or `toPrefix.startsWith(fromPrefix)` inside `moveVaultNode`.
- Pass `record.etag` as `ifMatchEtag` from `edit_file`.

## Files Changed
- `lib/fs/save-markdown.ts`
- `app/actions/documents.ts`
- `app/actions/file-versions.ts`
- `lib/fs/move-node.ts`
- `lib/ai/vault-tools.ts`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-09-13 | fix | Moved `updateTag` back to Server Actions, rejected nested folder moves, and passed If-Match on `edit_file`. |

## Test Plan
- `pnpm lint`.
- `pnpm exec tsc --noEmit`.
- Manual: editor save still works; tree New File via PUT does not 500; chat `edit_file` / folder move into self returns a tool error.

## Definition of Done
- Fix verified (lint + typecheck).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- Story 29 Issues table updated.

## References
- https://github.com/Ramgopalbhat10/notes/pull/123
- https://nextjs.org/docs/app/api-reference/functions/updateTag
