# AGENTS.md (Repo Guide)

This repo is a Next.js App Router markdown vault (S3-backed) with a cached tree manifest, editor/preview UX, and AI tools.

## Package Manager
- Use `pnpm` (not `npm`).

## Workflow
- Branching and docs update rules: `docs/WORKFLOW.md`
- Current focus and checklist: `docs/PROGRESS.md`
- Gotchas and lessons learned: `docs/learnings/README.md`
- Enforce strict gates in `docs/WORKFLOW.md` (pre-code and post-code hard stops).

## Session Bootstrap (New Chat)
- Load `AGENTS.md`, then load `docs/PROGRESS.md` and `docs/WORKFLOW.md` only.
- Use those docs to navigate to deeper context (stories, learnings, PRD) as needed.
- For each implementation request, follow `docs/WORKFLOW.md` in order; do not start code edits before the pre-code gate is complete.

## Quick Commands
- Install: `pnpm install`
- Dev: `pnpm dev`
- Lint: `pnpm lint`
- Build: `pnpm build`

## Context Pointers
- Setup, env, scripts: `README.md`
- Product/architecture: `docs/PRD.md`
- Work history/stories: `docs/stories/README.md`
- Bugs, refactors, and non-feature work: `docs/issues/README.md`
- Architectural decisions: `docs/decisions/README.md`
