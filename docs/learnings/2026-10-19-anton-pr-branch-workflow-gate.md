# 2026-10-19-anton-pr-branch-workflow-gate

- Area: `docs`
- Context: Anton's PR tool publishes its task branch (`anton/<slug>-<id>`), even if work was committed on a locally renamed `feature/` branch.
- Symptom: PR #126 passed the local workflow check but CI rejected the actual `github.head_ref` before lint/build.
- Root cause: The checker allowed Cursor task branches but not Anton task branches; the local branch was not the actual PR branch.
- Fix: Add `anton/` to the branch-prefix allowlist and synchronize `AGENTS.md` and the primary workflow skill.
- Guardrails: Run the CI command with the actual PR head ref, not just `git branch --show-current`. Keep `main` and unknown prefixes rejected for implementation diffs; ordinary human branches should still use `feature/`, `fix/`, `refactor/`, `chore/`, or `docs/`. Adding a tool-managed prefix does not skip documentation, quality, commit, or no-test-file gates.
- References: `docs/issues/issue-49.md`, `docs/stories/story-31.md`, `scripts/workflow/check-workflow-docs.mjs`, `docs/learnings/2026-09-13-cursor-branch-prefix-fails-workflow-gates.md`
