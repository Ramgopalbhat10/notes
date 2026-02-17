# Workflow Standards

## 1) Mode
- Planning: propose branch/story/approach only. No repo mutations.
- Execution: follow this file in order.
- No-op: if no code/docs impact, do nothing.

## 2) Route The Request (Every Prompt)
- Treat each new request independently, even in the same chat.
- Classify the request:
  - **Story** — new feature, feature enhancement, new capability, or anything that directly changes user-facing behavior.
  - **Issue** — bug fix, refactor, code cleanup, performance fix, or other non-feature work.
- If request is unrelated to current `docs/PROGRESS.md` work, treat as new work:
  - **New Story:**
    1. Create from `docs/stories/template.md` → `docs/stories/story-<N>.md`.
    2. Add the row to `docs/stories/README.md`.
    3. Create branch `feature/<slug>` from `main`.
    4. Reset `docs/PROGRESS.md` (see §3 for format).
  - **New Issue:**
    1. Create from `docs/issues/template.md` → `docs/issues/issue-<N>.md`.
    2. Add the row to `docs/issues/README.md`.
    3. If the issue relates to an existing story, add cross-references in both files.
    4. Create branch `fix/<slug>` (or `refactor/<slug>`, `chore/<slug>`) from `main`.
    5. Reset `docs/PROGRESS.md` (see §3 for format).
- Never implement unrelated work on the old branch.

## 3) Mandatory Pre-Code Gate (Hard Stop)
Complete all checks before editing code:
- [ ] Read `docs/PROGRESS.md` and open its story or issue file.
- [ ] Skim `docs/learnings/README.md`; search relevant keywords in `docs/learnings/` via `rg`.
- [ ] If architecture/caching/data-flow/auth/AI routing changes are involved, skim `docs/decisions/README.md`.
- [ ] Run `git status --short --branch` and confirm target branch (`feature/`, `fix/`, `refactor/`, or `chore/`).
- [ ] Branch setup:
  - New work: `git switch main` -> `git pull --ff-only` -> `git switch -c <prefix>/<slug>`
  - Existing work: `git switch main` -> `git pull --ff-only` -> `git switch <prefix>/<slug>` -> `git merge main`
  - Wrong branch but work already started: `git switch -c <prefix>/<slug>` first, then merge `main` if needed.
- [ ] **For stories:** file exists (use `docs/stories/template.md`) and is listed in `docs/stories/README.md` — if missing, add the row now.
- [ ] **For issues:** file exists (use `docs/issues/template.md`) and is listed in `docs/issues/README.md` — if missing, add the row now. If the issue relates to a story, verify cross-references exist in both files.
- [ ] `docs/PROGRESS.md` follows this structure:
  ```
  Current story: `docs/stories/story-<N>.md`   ← or: Current issue: `docs/issues/issue-<N>.md`
  Current section: Story N — <Title>            ← or: Issue N — <Title>
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
- [ ] Subtasks updated (`[ ]` -> `[x]` as applicable) in the story or issue file.
- [ ] `## Dev Log` in the story/issue file has one new row for this unit.
- [ ] Update `docs/PROGRESS.md` with strict task movement:
  - Clear existing `Previous tasks` first (do not accumulate across cycles).
  - Move only the tasks just completed from `Next tasks` to `Previous tasks` and mark them `[x]`.
  - Refill `Next tasks` from the next incomplete sub-task(s) only.
  - If no sub-tasks remain, set: `- None - all tasks completed.`
- [ ] **Cross-references** (if issue relates to a story):
  - Issue file `## Related Story` points to the story file.
  - Story file `## Issues` table has a row for this issue with correct status.
  - When resolving an issue, update status to `resolved` in both the issue file and the story's Issues table.
- [ ] Quality gate run:
  - If code changed: `pnpm lint`
  - User-visible/risky change: `pnpm build`
- [ ] If checks fail: fix first, or commit explicitly as WIP and note failure in Dev Log.
- [ ] If major architecture changed: add/update `docs/decisions/*` and `docs/decisions/README.md`.
- [ ] If non-obvious lesson emerged: add learning file and update `docs/learnings/README.md`.
- [ ] Verify the relevant index includes the current work:
  - Stories: `docs/stories/README.md`
  - Issues: `docs/issues/README.md`
- If any checkbox is incomplete, the unit is not done.

## 6) Commit Rule
- Commit with Conventional Commits on the current branch (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
