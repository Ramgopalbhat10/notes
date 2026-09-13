# Chat Vault Tools Implementation Plan

Story: `docs/stories/story-29.md`  
Spec: `docs/superpowers/specs/2026-09-13-chat-vault-write-tools-design.md`

## Unit 1 — Shared mutation helpers
Extract one persistence path used by HTTP routes, server actions, and chat tools:
- `saveMarkdownFile` from file PUT + `saveDocumentAction`
- `deleteMarkdownFile` from file DELETE
- `createVaultFolder` / `ensureAncestorFolders` from mkdir
- `deleteVaultFolder` from folder DELETE
- `moveVaultNode` from move POST
- `rollbackFileToVersion` via `saveMarkdownFile` + version reads
- Shared S3 list/delete helpers used by folder delete and move
- Secret redaction helper shared by chat context and `read_file`

## Unit 2 — Server tools + chat route
- Parallel `extractTool` when Parallel is on
- Vault tools when Vault is on (`native`)
- Chat route: 60s duration, 12 steps with tools, system prompt for extract vs search and vault rules

## Unit 3 — Client UX
- Inline Vault toggle in the tools popover
- Tool activity rows on assistant messages
- After mutating tools: reload manifest, toast, editor sync (reload if clean; keep dirty buffer; close on delete; retarget on move)
- Open surviving file paths via existing tree `select` dirty guard

## Unit 4 — Quality
- ADR, story/progress updates, `pnpm lint`, `pnpm build`
