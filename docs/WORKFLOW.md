# Workflow Standards

## 1) Mode
- Planning: propose branch/story/approach only. No repo mutations.
- Execution: follow this file in order.
- No-op: if no code/docs impact, do nothing.

## 2) Route The Request (Every Prompt)
- MUST treat each new request independently, even in the same chat.
- MUST classify the request:
  - **Story** — new feature, feature enhancement, new capability, or anything that directly changes user-facing behavior.
  - **Issue** — bug fix, refactor, code cleanup, performance fix, or other non-feature work.
- If request is unrelated to current `docs/PROGRESS.md` work, MUST treat as new work:
  - **New Story:**
    1. MUST create from `docs/stories/template.md` → `docs/stories/story-<N>.md`.
    2. MUST add the row to `docs/stories/README.md`.
    3. MUST create branch `feature/<slug>` from `main`.
    4. MUST reset `docs/PROGRESS.md` (see §3 for format).
  - **New Issue:**
    1. MUST create from `docs/issues/template.md` → `docs/issues/issue-<N>.md`.
    2. MUST add the row to `docs/issues/README.md`.
    3. If the issue relates to an existing story, MUST add cross-references in both files.
    4. MUST create branch `fix/<slug>` (or `refactor/<slug>`, `chore/<slug>`) from `main`.
    5. MUST reset `docs/PROGRESS.md` (see §3 for format).
- NEVER implement unrelated work on the old branch.

## 3) Mandatory Pre-Code Gate (Hard Stop — MUST complete before ANY code edits)
You MUST NOT write, modify, or delete any source code until every checkbox below is checked:
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
- **STOP: If any checkbox above is incomplete, you MUST NOT proceed to implementation. This is non-negotiable.**

## 4) Execute One Unit Of Work
- A unit of work is one legitimate, scoped change (code/behavior/docs).
- Keep scope tight to the current section in `docs/PROGRESS.md`.

## 5) Mandatory Post-Code Gate (Hard Stop — MUST complete before commit/PR)
You MUST NOT commit, push, or create a PR until every checkbox below is checked:
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
- [ ] Delete any test files created during this unit (`*.test.*`, `*.spec.*`, `__tests__/`). This project relies on manual testing only.
- **STOP: If any checkbox above is incomplete, the unit is NOT done. You MUST NOT commit or proceed to PR.**

## 6) Commit Rule
- MUST commit with Conventional Commits on the current branch (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- MUST NOT commit to `main` directly.

## 7) Pre-PR Verification (Hard Stop — MUST complete before creating PR)
Before creating a pull request, you MUST run this final verification and confirm every item passes:
- [ ] **Branch check:** `git branch --show-current` returns a correctly prefixed branch (`feature/`, `fix/`, `refactor/`, `chore/`, `docs/`). NEVER create a PR from `main`.
- [ ] **Docs exist:** The story or issue file exists and is complete (not a skeleton).
- [ ] **Index updated:** The story/issue appears in its respective `README.md` index with correct status.
- [ ] **PROGRESS.md current:** `docs/PROGRESS.md` reflects the final state of this work.
- [ ] **Dev Log entry:** The story/issue file `## Dev Log` has at least one entry for this work.
- [ ] **No test files:** `find . -name '*.test.*' -o -name '*.spec.*' -o -name '__tests__' | head` returns nothing.
- [ ] **Lint passes:** `pnpm lint` exits with code 0.
- [ ] **Build passes:** `pnpm build` exits with code 0.
- [ ] **Diff review:** `git diff main --stat` — confirm only expected files are changed.
- **STOP: If any check above fails, fix it before creating the PR. A PR that skips these checks is a workflow violation.**

## 8) PR Creation Rule
- MUST create a pull request from the current branch to `main`.
- MUST refer to .github/PULL_REQUEST_TEMPLATE.md for the PR description.
- MUST NOT merge the PR.