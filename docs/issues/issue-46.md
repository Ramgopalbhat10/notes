# Issue 46 — workflow-gates rejects Cursor Cloud Agent `cursor/` branches

## Type
- bug

## Status
- resolved

## Related Story
- Story 20 — Workflow Enforcement via Git Hooks and CI Gates (`docs/stories/story-20.md`)
- Story 29 — Chat Vault Tools (`docs/stories/story-29.md`) — blocked PR #123

## Description
- `verify-workflow-gates` failed on PR #123 with `Current branch prefix is invalid for implementation work` for `cursor/chat-vault-write-tools-a751`.
- Docs-only commits skipped the prefix check, so the gate only failed after implementation files landed.

## Root Cause
- `scripts/workflow/check-workflow-docs.mjs` allows `feat/`, `feature/`, `fix/`, `refactor/`, `chore/`, and `docs/`.
- Cursor Cloud Agent branches are named `cursor/<slug>-<id>`. CI passes `--branch=${{ github.head_ref }}`, so those PRs fail as soon as they contain implementation files.

## Fix / Approach
- Allow the `cursor/` prefix in the workflow docs checker.
- Align AGENTS.md, the notes-workflow skill, and the PR template with that prefix.

## Files Changed
- `scripts/workflow/check-workflow-docs.mjs`
- `AGENTS.md`
- `.agents/skills/notes-workflow/SKILL.md`
- `.github/PULL_REQUEST_TEMPLATE.md`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-09-13 | fix | Allowed `cursor/` Cloud Agent branches in `check-workflow-docs.mjs` and aligned workflow docs. |

## Test Plan
- Run `pnpm run workflow:check-docs -- --base=origin/main --head=HEAD --branch=cursor/chat-vault-write-tools-a751` and confirm it passes with implementation files present.
- Confirm `verify-workflow-gates` on PR #123 is green.

## Definition of Done
- Fix verified (local workflow docs gate passes).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- Related story Issues tables updated.

## References
- https://github.com/Ramgopalbhat10/notes/pull/123
- https://github.com/Ramgopalbhat10/notes/actions/runs/34776895777
- `docs/stories/story-20.md`
