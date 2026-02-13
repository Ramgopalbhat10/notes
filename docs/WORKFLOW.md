# Workflow Standards

## Branching (Agent-Managed)
- Use `feature/<slug>` branches only.
- For a new feature:
  - Ensure `main` is up to date (`git switch main`, `git pull --ff-only`).
  - Create/switch branch (`git switch -c feature/<slug>`).
  - Create a new story file from `docs/stories/temlate.md` and add it to `docs/stories/README.md`.
- For work that belongs on an existing feature branch:
  - Update `main` (`git switch main`, `git pull --ff-only`).
  - Switch back (`git switch <branch>`).
  - Bring branch current without rewriting history: `git merge main`.

## Unit Of Work Definition
A "unit of work" is a legitimate change that impacts code, behavior, or user-visible docs (not formatting-only churn).

## After Each Unit Of Work (Docs + Commits)
1. Commit with Conventional Commits, but stay on the same `feature/<slug>` branch:
   - `feat:` `fix:` `refactor:` `docs:` `chore:` etc.
2. Update the current story document:
   - Add a row to its `## Dev Log` table (date, unit type, 1-line summary).
   - Check off any completed story subtasks.
3. Update `docs/PROGRESS.md`:
   - Point to the current story file.
   - Update counts of done / in-progress / pending items.
4. If you learned something non-obvious (gotcha, repeated failure, tricky edge case), add a new file under `docs/learnings/` and add it to `docs/learnings/README.md`.
5. If a major architectural decision was made and implemented, add a doc under `docs/decisions/` and add it to `docs/decisions/README.md`.

## No-Op Rule
If the request is not related to code modification and has no doc impact, do nothing.
