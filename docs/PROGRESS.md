# Progress

Current story: `docs/stories/story-29.md`

Current section: Story 29.4 — Verification and Regression Checks

Previous tasks (latest completed batch only):
- [x] Fix `create_folder` ancestor mkdir 409, `$` snippet replace, and delete/move path resolution.

Next tasks:
- [ ] Manual smoke: no tools, Parallel only, Vault only, Parallel + Vault URL-to-file, edit/move/delete/rollback.

Notes:
- Branch: `cursor/chat-vault-write-tools-a751`
- PR: https://github.com/Ramgopalbhat10/notes/pull/123
- Spec: `docs/superpowers/specs/2026-09-13-chat-vault-write-tools-design.md`
- ADR: `docs/decisions/ADR-chat-vault-tools.md`
- `ensureAncestorFolders` must walk parents only; a folder prefix used as the walk root created the target before `existOk: false`.
- End-to-end vault writes still need a live app with S3 + Parallel credentials.
