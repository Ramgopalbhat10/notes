# Issue 31 — Convert Repo Workflow Into a Repo-Local Skill

## Type
- chore

## Status
- resolved

## Related Story
- None

## Description
- Move the repo's agent workflow from project markdown files into a repo-local `notes-workflow` skill so agents can follow the workflow directly without depending on `docs/WORKFLOW.md` for execution logic.

## Root Cause
- The workflow currently lives primarily in `AGENTS.md`, `docs/WORKFLOW.md`, and `docs/WORKFLOW_LABELS.md`, which means every agent has to reload and re-interpret project markdown before acting.
- Existing repo-local skills still point back to the markdown workflow docs, so workflow behavior is duplicated and can drift from the repo's enforced hooks and CI gates.

## Fix / Approach
- Add a repo-local `.agents/skills/notes-workflow/` skill that encodes label routing, issue/story classification, progress/doc update rules, and all quality/commit/PR gates.
- Keep `AGENTS.md` and workflow markdown docs as thin backup references for humans and historical context, but make the skill the primary agent workflow source.
- Rewire existing repo-local skills to delegate workflow behavior to `notes-workflow` instead of referring directly to `docs/WORKFLOW.md`.
- Validate the new skill, run the repo's quality gates, and confirm the human docs and skill remain aligned with the existing hook/CI enforcement.

## Files Changed
- `.agents/skills/notes-workflow/*`
- `.agents/skills/code-health/SKILL.md`
- `.agents/skills/performance/SKILL.md`
- `.agents/skills/security/SKILL.md`
- `AGENTS.md`
- `docs/WORKFLOW.md`
- `docs/WORKFLOW_LABELS.md`
- `docs/PROGRESS.md`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-04-18 | docs | Opened Issue 31 for repo-local workflow skill migration and reset progress to a new chore branch |
| 2026-04-18 | chore | Added the repo-local `notes-workflow` skill with extracted routing, tracking, and execution-gate references plus `agents/openai.yaml` metadata |
| 2026-04-18 | docs | Repointed `AGENTS.md`, backup workflow docs, and existing repo-local skills to the `notes-workflow` skill |
| 2026-04-18 | chore | Validated the skill, synced dependencies with the lockfile, and reran lint/build against the updated local install state |
| 2026-04-18 | fix | Replaced machine-specific workflow-reference links in `notes-workflow/SKILL.md` with repo-relative links so the skill works in any checkout path |

## Test Plan
- `python "C:\Users\ramgo\.codex\skills\.system\skill-creator\scripts\quick_validate.py" "M:\Projects\mrgb\notes\.agents\skills\notes-workflow"` passes.
- Manual scenario walkthroughs cover `[ask]`, unlabeled feature work, unlabeled issue/refactor/performance/security work, `[docs-only]`, `[quality]`, `[commit]`, and `[push]`.
- `pnpm install --frozen-lockfile` synced local dependencies to the committed lockfile so build verification matched the repo's expected package set.
- `pnpm lint` passes.
- `pnpm build` passes.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- `AGENTS.md`
- `docs/WORKFLOW.md`
- `docs/WORKFLOW_LABELS.md`
- `scripts/workflow/check-workflow-docs.mjs`
