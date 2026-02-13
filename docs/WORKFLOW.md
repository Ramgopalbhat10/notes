# Workflow Standards

## Before You Implement (Context Pull)
- Read `docs/PROGRESS.md` and open the current story file it points to.
- Skim `docs/learnings/README.md` and search relevant keywords in `docs/learnings/` (use `rg`).
- If the change touches architecture, caching, data flow, auth, or AI routing, skim `docs/decisions/README.md` first.

## UI Tooling
- Trigger: any work that adds/changes UI components, page layouts, or the app's look-and-feel (spacing, typography, color, interaction patterns).
- Requirement: use the Shadcn UI MCP server to source/generate the relevant shadcn/ui components and patterns (keep consistency with `components/ui/*`).
- Output: prefer composing from existing shadcn/ui primitives before writing custom UI from scratch.
- Fallback: if the Shadcn UI MCP server is not available in the current environment, proceed using the existing `components/ui/*` components and match their styling conventions.

## Branching (Agent-Managed)
- Use `feature/<slug>` branches only.
- For a new feature:
  - Ensure `main` is up to date (`git switch main`, `git pull --ff-only`).
  - Create/switch branch (`git switch -c feature/<slug>`).
  - Create a new story file from `docs/stories/template.md` and add it to `docs/stories/README.md`.
- For work that belongs on an existing feature branch:
  - Update `main` (`git switch main`, `git pull --ff-only`).
  - Switch back (`git switch <branch>`).
  - Bring branch current without rewriting history: `git merge main`.

## Unit Of Work Definition
A "unit of work" is a legitimate change that impacts code, behavior, or user-visible docs (not formatting-only churn).

## Planning vs Execution
- Planning phase: propose branch name, story number/title, and approach. Do not mutate the repo (no branch/story creation, no commits).
- Execution phase (after an explicit "implement/start work" request): follow this workflow, including branch setup, story creation, and docs updates.

## Quality Gate (Before Commit/Push)
- If code was changed, run `pnpm lint` before committing.
- For user-visible or risky changes (or before opening/updating a PR), run `pnpm build`.
- If checks fail, do not commit as "done". Fix the issue or commit explicitly as WIP and note the failure in the story `## Dev Log`.

## After Each Unit Of Work (Docs + Commits)
1. Commit with Conventional Commits, but stay on the same `feature/<slug>` branch:
   - `feat:` `fix:` `refactor:` `docs:` `chore:` etc.
2. Update the current story document:
   - Add a row to its `## Dev Log` table (date, unit type, 1-line summary). Add `## Dev Log` after the `## Acceptance Criteria` section if it doesn't exist.
   - Check off any completed story subtasks.
3. Update `docs/PROGRESS.md`:
   - Point to the current story file.
   - Update counts of done / in-progress / pending items.
4. If you learned something non-obvious (gotcha, repeated failure, tricky edge case), add a new file under `docs/learnings/` and add it to `docs/learnings/README.md`.
5. If a major architectural decision was made and implemented, add a doc under `docs/decisions/` and add it to `docs/decisions/README.md`.

## No-Op Rule
If the request is not related to code modification and has no doc impact, do nothing.
