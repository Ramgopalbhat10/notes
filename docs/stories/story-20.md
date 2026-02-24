# Story 20 — Workflow Enforcement via Git Hooks and CI Gates

Goal: Enforce `docs/WORKFLOW.md` requirements with automated guardrails so undocumented work cannot be merged.

## Scope
- In: repo-managed git hooks, validation scripts, and CI checks for workflow documentation gates.
- Out: changing product runtime behavior, UI features, or non-workflow architecture.

## Deliverables
- Shared validation scripts for workflow checks.
- Hook wiring for pre-commit / commit-msg / pre-push.
- CI workflow that enforces the same gates on pull requests.
- Docs updates describing setup and expected behavior.

## Acceptance Criteria
- A commit is blocked when required documentation artifacts are missing for staged work.
- Conventional commit format is enforced by `commit-msg`.
- Push/PR is blocked when lint/build or workflow checks fail.
- `main` cannot receive undocumented changes via required CI checks.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-24 | feat | Added strict workflow enforcement via repository git hooks, validation scripts, and PR CI gates. |
| 2026-02-24 | chore | Improved workflow docs checker to print explicit success reasons for no-change and docs-only paths. |
| 2026-02-24 | fix | Fixed commit-msg validator argument parsing to support pnpm hook invocation format. |
| 2026-02-24 | fix | Fixed workflow docs checker branch detection for GitHub Actions detached HEAD and passed PR head branch from CI. |
| 2026-02-24 | fix | Refined index enforcement to require story/issue index updates only when new story/issue files are added. |
| 2026-02-24 | fix | Included deleted files in workflow changed-file detection so delete-only implementation commits cannot bypass docs gates. |
| 2026-02-24 | fix | Injected required repository secrets into workflow-gates build step and documented exact GitHub settings path for repo-only secret setup. |
| 2026-02-24 | fix | Renamed GitHub OAuth env references from `GITHUB_*` to `GH_*` in auth runtime, CI workflow secret wiring, and setup docs. |
| 2026-02-24 | chore | Added workflow guidance to reuse relevant active branches/issues and made pre-push skip docs-only (markdown-only) pushes. |
| 2026-02-24 | fix | Handled pre-push delete-ref updates by skipping all-zero local OIDs to prevent invalid diff range construction. |

## Issues

| Issue | Title | Status | File |
|---|---|---|---|

---

## Story 20.1 — Workflow Validation Scripts
- Components
  - `scripts/workflow/check-workflow-docs.mjs`
  - `scripts/workflow/check-commit-message.mjs`
- Behavior
  - Validates changed files against required docs gates.
  - Validates conventional commit message prefixes.

Sub-tasks
- [x] Add workflow docs validation script.
- [x] Add commit message validation script.
- [x] Add script entrypoints in `package.json`.

Test Plan
- Stage code-only change and verify docs check fails.
- Stage required docs changes and verify docs check passes.
- Try invalid commit message and verify rejection.

---

## Story 20.2 — Hook and CI Integration
- Components
  - `.githooks/pre-commit`
  - `.githooks/commit-msg`
  - `.githooks/pre-push`
  - `.github/workflows/workflow-gates.yml`
- Behavior
  - Local hooks provide fast feedback.
  - CI enforces non-bypassable merge gates.

Sub-tasks
- [x] Add repository-managed git hooks and bootstrap command.
- [x] Add CI workflow for docs, lint, and build checks.
- [x] Document local hook setup for contributors.

Test Plan
- Verify hooks execute after `git config core.hooksPath .githooks`.
- Open PR with missing docs and verify CI fails.

---

## Story 20.3 — Verification and Regression Checks
- Components
  - `docs/PROGRESS.md`
- Behavior
  - Ensure all quality gates pass and workflow docs are updated.

Sub-tasks
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.

Test Plan
- Confirm checks pass locally.

---

## Story 20.4 — Branch Reuse Guidance and Docs-only Push Optimization
- Components
  - `docs/WORKFLOW.md`
  - `.githooks/pre-push`
  - `README.md`
- Behavior
  - Clarify when to continue work on an existing relevant branch/story/issue instead of creating a new one.
  - Skip pre-push workflow/lint/build checks for markdown-only pushes.

Sub-tasks
- [x] Add workflow instruction to check for relevant active branches/issues/stories before creating new work.
- [x] Update pre-push hook to run workflow/lint/build only when non-markdown files changed.
- [x] Update README hook documentation to explain docs-only skip behavior.

Test Plan
- Push markdown-only changes and verify checks are skipped.
- Push code changes and verify checks still run.

---

## Story 20.5 — Pre-push Delete-ref Robustness
- Components
  - `.githooks/pre-push`
- Behavior
  - Handle remote ref deletion pushes where Git provides an all-zero local OID.
  - Avoid constructing invalid revision ranges for delete-ref updates.

Sub-tasks
- [x] Skip delete-ref updates (`local_sha` = all zeros) when computing changed-file ranges.
- [x] Keep existing new-branch and update-range logic unchanged for non-delete updates.
- [x] Validate hook syntax and run quality gates.

Test Plan
- Simulate/delete ref update path and confirm no invalid range construction occurs.
- Verify normal pushes still execute checks as before.

---

## Definition of Done
- Acceptance criteria met.
- Dev Log updated for each unit of work.
- Progress updated in `docs/PROGRESS.md`.

## References
- `docs/WORKFLOW.md`
- `AGENTS.md`
