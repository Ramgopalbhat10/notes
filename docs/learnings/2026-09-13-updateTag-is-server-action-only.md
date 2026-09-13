# 2026-09-13-updateTag-is-server-action-only

- Area: `api`
- Context: Story 29 extracted `saveMarkdownFile` from `saveDocumentAction` and reused it from `PUT /api/fs/file` and chat vault tools.
- Symptom: `updateTag` in the shared helper can throw in Route Handlers after S3 and Redis are already written, leaving manifest/version updates skipped.
- Root cause: Next.js 16 `updateTag` is Server Action–only. `revalidateTag(tag, "max")` is the Route Handler equivalent.
- Fix: Call `updateSavedFileTag` from Server Actions only. Route-handler saves keep `revalidateFileTags`.
- Guardrails: Do not put `updateTag` in helpers shared with `/api/*` or AI tool executors. If a save path needs read-your-own-writes, call `updateSavedFileTag` at the Server Action boundary.
- References: `lib/fs/save-markdown.ts`, `app/actions/documents.ts`, `docs/issues/issue-47.md`, `docs/decisions/ADR-chat-vault-tools.md`
