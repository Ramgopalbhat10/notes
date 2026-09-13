# Progress

Current story: `docs/stories/story-29.md`

Current section: Story 29.4 — Verification and Regression Checks

Previous tasks (latest completed batch only):
- [x] Complete interrupted chat tool calls and bound Parallel extract (Issue 48).

Next tasks:
- [ ] Manual smoke: no tools, Parallel only, Vault only, Parallel + Vault URL-to-file, edit/move/delete/rollback.

Notes:
- Branch: `cursor/chat-incomplete-tool-results-a751`
- Story 29 PR (merged): https://github.com/Ramgopalbhat10/notes/pull/123
- Issue 48: `docs/issues/issue-48.md` (resolved) — hung `web_extract` left `input-available` parts; follow-up send failed with missing tool result.
- Parallel extract can fetch many JS-rendered public pages (`full_content`); login walls and some SPAs can still be empty. Extract execute is hard-capped at 35s.
- Spec: `docs/superpowers/specs/2026-09-13-chat-vault-write-tools-design.md`
- ADR: `docs/decisions/ADR-chat-vault-tools.md`
