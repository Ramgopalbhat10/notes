# AGENTS.md (Repo Guide)

This repo is a Next.js App Router markdown vault (S3-backed) with a cached tree manifest, editor/preview UX, and AI tools.

## Critical Rules (MUST follow — no exceptions)
- You MUST read and follow `docs/WORKFLOW.md` in order for every implementation request. No code edits are permitted until the pre-code gate (§3) is fully complete.
- You MUST create or update the story/issue file AND its index BEFORE writing any code. Skipping documentation is a workflow violation.
- You MUST work on the correct branch. NEVER commit to `main` directly. Branch naming conventions: `feature/`, `fix/`, `refactor/`, `chore/`, `docs/`.
- You MUST complete the post-code gate (§5) and pre-PR verification (§7) in `docs/WORKFLOW.md` BEFORE creating a PR or marking work as done.
- You MUST NOT create test files (`*.test.*`, `*.spec.*`, `__tests__/`). This project relies on manual testing only. Delete any test files before committing.

## Package Manager
- Use `pnpm` (not `npm`).

## Workflow
- Branching and docs update rules: `docs/WORKFLOW.md`
- Current focus and checklist: `docs/PROGRESS.md`
- Gotchas and lessons learned: `docs/learnings/README.md`
- MUST enforce strict gates in `docs/WORKFLOW.md` (pre-code and post-code hard stops).

## Session Bootstrap (New Chat)
- Load `AGENTS.md`, then load `docs/PROGRESS.md` and `docs/WORKFLOW.md` only.
- Use those docs to navigate to deeper context (stories, learnings, PRD) as needed.
- For each implementation request, follow `docs/WORKFLOW.md` in order; MUST NOT start code edits before the pre-code gate is complete.

## Testing Policy
- This project has no test files and intentionally relies on manual testing.
- MUST NOT commit test files (e.g. `*.test.*`, `*.spec.*`, `__tests__/`).
- If an agent creates test files during a PR review or code generation, they MUST be deleted before the final commit.

## Quick Commands
- Install: `pnpm install`
- Dev: `pnpm dev`
- Lint: `pnpm lint`
- Build: `pnpm build`

## Agent Skills
- Skills live in `.agents/skills/<name>/SKILL.md` following the [Agent Skills spec](https://agentskills.io/specification).
- Windsurf users: invoke via `/slash-command`. Other agents: read the SKILL.md directly.
- `/code-health` — duplication, dead code, naming, deprecated usage, complexity.
- `/security` — weak validation, secret exposure, injection risks, auth bypass.
- `/performance` — slow queries, re-renders, bundle bloat, inefficient algorithms.

## Context Pointers
- Setup, env, scripts: `README.md`
- Product/architecture: `docs/PRD.md`
- Work history/stories: `docs/stories/README.md`
- Bugs, refactors, and non-feature work: `docs/issues/README.md`
- Architectural decisions: `docs/decisions/README.md`
