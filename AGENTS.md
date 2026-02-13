# Personal Notes (Markdown Vault)

This is a Next.js App Router app for browsing and editing a markdown vault backed by an S3-compatible bucket, with a cached file-tree manifest and AI-assisted writing.

## Package Manager
- Use `pnpm` (not `npm`).

## Common Commands
- Install: `pnpm install`
- Dev: `pnpm dev`
- Lint: `pnpm lint`
- Build: `pnpm build`

## Workflow Standards (Git)
- Default branch: `main`
- Branch naming:
  - New features: `feature/<short-slug>`
  - Bug fixes: `fix/<short-slug>`
  - Chores/refactors: `chore/<short-slug>`
  - Docs-only: `docs/<short-slug>`
- Before starting any work:
  - Confirm you are on the intended branch: `git status --branch --short`
  - Confirm you have no uncommitted changes: `git status --porcelain`

### New Feature Workflow (Create Branch Automatically)
1. Update `main` locally:
   - `git switch main`
   - `git pull --ff-only`
2. Create and switch to a new branch from `main`:
   - `git switch -c feature/<short-slug>`

### Existing Feature Branch Workflow (Bugfix/Improvements On That Branch)
1. Update `main` locally:
   - `git switch main`
   - `git pull --ff-only`
2. Switch back to the target feature branch:
   - `git switch <existing-branch>`
3. If the branch needs to be brought up to date with `main`, prefer a merge (non-rewriting):
   - `git merge main`

### Dirty Worktree Handling (So The User Doesn’t Have To)
- If a branch switch is required but `git status --porcelain` is non-empty:
  - Stash changes: `git stash push -u -m "codex: wip before branch switch"`
  - Switch branches as needed
  - Re-apply changes: `git stash pop`
  - If conflicts occur on pop, resolve conflicts and continue (do not drop the stash until resolved).

### Before Pushing
- Run: `pnpm lint`
- Run: `pnpm build`

## Progressive Disclosure
- Environment variables, scripts, and architecture overview: `README.md`
- Product/architecture requirements: `docs/PRD.md`
- Implementation stories and project history: `docs/stories/README.md`
- Caching strategy notes: `docs/ADR-caching-strategy.md`
