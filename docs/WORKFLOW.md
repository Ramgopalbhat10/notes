# Workflow Standards

## 1) Mode
- Planning: propose branch/story/approach only. No repo mutations.
- Execution: follow this file in order.
- No-op: if no code/docs impact, do nothing.

## 2) Route The Request (Every Prompt)
- Treat each new request independently, even in the same chat.
- If request is unrelated to current `docs/PROGRESS.md` story/branch, treat as new work:
  1. Create a new story from `docs/stories/template.md` → `docs/stories/story-<N>.md`.
  2. Add the new story row to `docs/stories/README.md`.
  3. Create branch `feature/<slug>` from `main`.
  4. Reset `docs/PROGRESS.md` to point to the new story (see §3 for expected format).
- Never implement unrelated work on the old feature branch.

## 3) Mandatory Pre-Code Gate (Hard Stop)
Complete all checks before editing code:
- [ ] Read `docs/PROGRESS.md` and open its story file.
- [ ] Skim `docs/learnings/README.md`; search relevant keywords in `docs/learnings/` via `rg`.
- [ ] If architecture/caching/data-flow/auth/AI routing changes are involved, skim `docs/decisions/README.md`.
- [ ] Run `git status --short --branch` and confirm target `feature/<slug>`.
- [ ] Branch setup:
  - New feature: `git switch main` -> `git pull --ff-only` -> `git switch -c feature/<slug>`
  - Existing feature: `git switch main` -> `git pull --ff-only` -> `git switch feature/<slug>` -> `git merge main`
  - Wrong branch but work already started: `git switch -c feature/<slug>` first, then merge `main` if needed.
- [ ] Story file exists (use `docs/stories/template.md` for new stories).
- [ ] Story is listed in `docs/stories/README.md` index — if missing, add the row now.
- [ ] `docs/PROGRESS.md` follows this structure:
  ```
  Current story: `docs/stories/story-<N>.md`
  Current section: Story N — <Title>
  Previous tasks (latest completed batch only):
  - [x] <task>
  Next tasks:
  - [ ] <task>
  Notes:
  - <optional context for next session>
  ```
- [ ] `Next tasks` contains only the current workable sub-task(s), not completed tasks.
- [ ] If adding/changing major UI, use Shadcn UI MCP server (fallback: existing `components/ui/*` conventions if MCP unavailable).
- If any checkbox is incomplete, do not start implementation code.

## 4) Execute One Unit Of Work
- A unit of work is one legitimate, scoped change (code/behavior/docs).
- Keep scope tight to the current section in `docs/PROGRESS.md`.

## 5) Mandatory Post-Code Gate (Hard Stop)
Before marking the unit complete:
- [ ] Story subtasks updated (`[ ]` -> `[x]` as applicable) in the story file.
- [ ] Story `## Dev Log` has one new row for this unit.
- [ ] Update `docs/PROGRESS.md` with strict task movement:
  - Clear existing `Previous tasks` first (do not accumulate across cycles).
  - Move only the tasks just completed from `Next tasks` to `Previous tasks` and mark them `[x]`.
  - Refill `Next tasks` from the next incomplete story sub-task(s) only.
  - If no sub-tasks remain, set: `- None - all tasks completed.`
- [ ] Quality gate run:
  - If code changed: `pnpm lint`
  - User-visible/risky change: `pnpm build`
- [ ] If checks fail: fix first, or commit explicitly as WIP and note failure in Dev Log.
- [ ] If major architecture changed: add/update `docs/decisions/*` and `docs/decisions/README.md`.
- [ ] If non-obvious lesson emerged: add learning file and update `docs/learnings/README.md`.
- [ ] Verify `docs/stories/README.md` index includes the current story row.
- If any checkbox is incomplete, the unit is not done.

## 6) Commit Rule
- Commit with Conventional Commits on the same `feature/<slug>` branch (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
