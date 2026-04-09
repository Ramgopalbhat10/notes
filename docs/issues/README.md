# Issue Index

Track bug fixes, refactors, performance fixes, code cleanup, and other non-feature work.

Issue template: `docs/issues/template.md`

| Issue | Title | Status | Related Story | File |
|---|---|---|---|---|
| 1 | Unnecessary Console Logging in File Tree Builder | resolved | None | `lib/file-tree-builder.ts` |
| 2 | Refactor Path Utilities | open | None | `lib/paths.ts` |
| 3 | Insecure Default Authentication Configuration | resolved | None | `lib/auth/index.ts` |
| 4 | Weak Secret Redaction Mechanism in AI Chat Context | resolved | None | `app/api/ai/chat/route.ts` |
| 5 | Consolidate ETag Sanitization Utilities | resolved | None | `lib/etag.ts` |
| 6 | Optimize Redis Deletion in File Cache | resolved | None | `lib/file-cache.ts` |
| 7 | Extract handleModalSubmit into a Custom Hook | resolved | None | `components/file-tree/index.tsx` |
| 8 | O(N²) Complexity in Delete Folder Manifest Update | resolved | None | `lib/manifest-updater.ts` |
| 9 | Refactor Manifest Updater to a Class | resolved | None | `lib/manifest-updater.ts` |
| 10 | Optimize IndexedDB Deletion in Persistent Document Cache | resolved | None | `lib/persistent-document-cache.ts` |
| 11 | Information Leakage in S3 Error Responses | resolved | None | `app/api/fs/file/route.ts` |
| 12 | O(N²) Queue Dequeue in File Tree Builder | resolved | None | `lib/file-tree-builder.ts` |
| 13 | Clarify Skill Wording for Domain Relevance | resolved | None | `.agents/skills/*/SKILL.md` |
| 14 | Markdown Heading Font Falls Back to system-ui in Public /p Route | resolved | Story 22 | `app/globals.css` |
| 15 | Refactor Workflow to Label-Based Control System | resolved | None | `AGENTS.md`, `docs/WORKFLOW.md`, `docs/WORKFLOW_LABELS.md` |
| 16 | Massive Refactor Roadmap Execution (Stability-First) | resolved | None | `lib/http/client.ts`, `stores/*`, `components/*`, `lib/tree/*` |
| 17 | App-Wide Folder Restructuring | resolved | None | `components/app-shell/*`, `components/vault-workspace/*`, `lib/*` |
| 18 | AI Route & Component Code Health Cleanup | resolved | None | `lib/ai/text-utils.ts`, `app/api/ai/*`, `app/api/fs/move/route.ts`, `components/ai-chat/sidebar-chat.tsx` |
| 19 | SidebarChat Decomposition & Simplification | in-progress | None | `components/ai-chat/*` |
| 20 | Next.js 16.2 Upgrade Verification & Runtime Alignment | in-progress | None | `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `proxy.ts`, `.github/workflows/workflow-gates.yml` |
| 21 | Optimize folder move and manifest update hot paths | resolved | None | `app/api/fs/move/route.ts`, `lib/manifest-updater.ts` |
| 22 | Consolidate duplicated route helper utilities | resolved | None | `app/api/ai/*`, `app/api/fs/*`, `app/actions/documents.ts`, `lib/http/*`, `lib/etag.ts`, `lib/tree/*` |
| 23 | Implement Phase 1 personal-vault performance plan | resolved | None | `components/blocknote-editor.tsx`, `stores/editor.ts`, `app/actions/documents.ts`, `lib/manifest-updater.ts`, `components/file-tree/index.tsx`, `lib/content/slug-resolver.ts`, `app/files/[[...path]]/page.tsx`, `components/ai-chat/hooks/use-chat-session.ts` |
| 24 | Parallelize AI and S3 hot paths, and trim startup overhead | resolved | None | `app/api/ai/action/route.ts`, `app/api/fs/folder/route.ts`, `app/api/fs/move/route.ts`, `lib/file-tree-builder.ts`, `components/vault-workspace/*` |
