# Progress

Current issue: `docs/issues/issue-31.md`

Current section: Issue 31 — Workflow skill migration complete

Previous tasks (latest completed batch only):
- [x] Scaffolded `.agents/skills/notes-workflow/` with `SKILL.md`, `agents/openai.yaml`, and workflow reference files.
- [x] Rewired `AGENTS.md`, workflow docs, and repo-local skills to point to `notes-workflow`.
- [x] Validated the skill, synced dependencies with the lockfile, and ran `pnpm lint` + `pnpm build`.

Next tasks:
- None - all tasks completed.

Notes:
- Branch: `chore/notes-workflow-skill`
- The new `notes-workflow` skill is now the primary agent workflow source for this repo.
- Backup workflow docs remain in `docs/WORKFLOW.md` and `docs/WORKFLOW_LABELS.md` for humans and reviewers.
