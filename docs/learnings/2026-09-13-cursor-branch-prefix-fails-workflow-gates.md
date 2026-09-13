# 2026-09-13-cursor-branch-prefix-fails-workflow-gates

- Area: `docs`
- Context: Cursor Cloud Agent PRs use `cursor/<slug>-<id>`. `workflow-gates` passes `--branch=${{ github.head_ref }}` into `check-workflow-docs.mjs`.
- Symptom: `verify-workflow-gates` failed with `Current branch prefix is invalid for implementation work` after implementation files landed. Docs-only commits still passed because they skip the prefix check.
- Root cause: Allowed prefixes were `feat/`, `feature/`, `fix/`, `refactor/`, `chore/`, `docs/` only.
- Fix: Allow `cursor/` in the checker and the mirrored workflow docs.
- Guardrails: Keep `main` forbidden. Human work should still prefer `feature/` / `fix/` / `refactor/` / `chore/` / `docs/`. Do not treat a skipped prefix check on docs-only diffs as proof that a Cloud Agent branch will pass CI.
- References: `docs/issues/issue-46.md`, `scripts/workflow/check-workflow-docs.mjs`, `docs/stories/story-20.md`
