# Story 23 — AI Actions Sidebar Workspace and Selection-First UX

Goal: Turn the current one-shot AI action card into a richer, less disruptive editing workflow with selection-first triggers, a dedicated right-sidebar review workspace, and better handling for large notes.

## Scope
- In: selection-triggered AI entry in edit mode, dedicated right sidebar assistant panel, richer apply/compare/refine UX, expanded `/api/ai/action` request shape, model reuse from existing AI surfaces, large-document handling beyond a single hard cap, and documentation updates.
- Out: persistent action history across sessions, reusable custom prompt presets, comments-style AI reviewer, and a complete merge of chat + actions into one product surface.

## Deliverables
- `stores/layout.ts`, `components/app-shell.tsx`, and `app/files/[[...path]]/page.tsx` updated for a dedicated AI assistant right-sidebar panel.
- `components/vault-workspace/*` updates for selection-first triggers, header entry points, and shared AI action session state.
- `components/ai-actions/*` workspace UI for result review, compare, refine, and apply actions.
- `/api/ai/action` expanded for model/context/refinement flows and large-document handling.
- `docs/brainstorms/2026-03-30-ai-actions-ux-brainstorm.md`, `docs/stories/README.md`, and `docs/PROGRESS.md` updated.

## Acceptance Criteria
- Selecting text in edit or preview mode surfaces AI actions without forcing users into the overflow menu.
- Triggering an AI action opens a dedicated right-sidebar assistant workspace instead of a top-of-document card.
- The assistant supports regenerate, follow-up refinement, compare with original, replace selection/document, insert below/at cursor, and copy.
- Header actions still support whole-note AI runs when nothing is selected, with no duplicated desktop entry point.
- AI actions reuse the existing model selection surface.
- Large-note actions do not silently fail behind the prior `MAX_INPUT_CHARS` clamp; users get complete or explicitly chunked processing without misleading “chunked” UI when the output is still complete.
- Mobile/tablet preserves an accessible assistant flow via the existing right sheet.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-03-30 | feat | Started Story 23 for AI actions sidebar workspace, selection-first UX, and large-document handling. |
| 2026-03-30 | feat | Added a dedicated assistant right-sidebar panel and moved AI actions into a persistent review/apply workspace. |
| 2026-03-30 | feat | Added selection-first AI entry in edit mode, stable block-based apply behavior, and desktop header AI affordances. |
| 2026-03-30 | feat | Expanded `/api/ai/action` for model-aware requests, refinement, chunked large-document handling, and Redis-backed rate limiting fallback. |
| 2026-03-30 | qa | Verified `pnpm lint` and `pnpm build` pass after the AI actions redesign. |
| 2026-03-30 | feat | Removed duplicated desktop AI entry points, normalized assistant styling to existing app patterns, added preview-mode selection actions, and reused cached assistant sessions per file/action/selection. |
| 2026-03-30 | qa | Re-ran `pnpm lint` and `pnpm build` after the assistant UX cleanup and preview-selection changes. |
| 2026-03-30 | qa | Browser-level workspace verification remains pending because local app access currently redirects to `/auth/sign-in` without an authenticated `/files` session. |

## Issues

| Issue | Title | Status | File |
|---|---|---|---|

---

## Story 23.1 — Assistant Panel Model and Workspace Session
- Components
  - `stores/layout.ts`
  - `components/app-shell.tsx`
  - `components/app-shell/hooks/use-right-sidebar-panel.tsx`
  - `app/files/[[...path]]/page.tsx`
  - `components/ai-actions/*`
- Behavior
  - Add a dedicated `assistant` right-sidebar panel and render a shared AI action workspace there.
  - Keep the panel open while users regenerate, refine, compare, or apply results.

Sub-tasks
- [x] Add `assistant` to the right-sidebar panel model and shell helpers.
- [x] Create a shared AI action workspace component for desktop and mobile sidebar contexts.
- [x] Move AI action rendering out of the document column and into the assistant panel.

Test Plan
- Open assistant from the header and verify the right sidebar switches in place without closing first.
- Verify the assistant works in desktop sidebar and mobile sheet layouts.

---

## Story 23.2 — Selection-First Entry and Review UX
- Components
  - `components/blocknote-editor.tsx`
  - `components/markdown-editor.tsx`
  - `components/vault-workspace/index.tsx`
  - `components/vault-workspace/sections/header.tsx`
  - `components/vault-workspace/hooks/use-ai-session.ts`
- Behavior
  - Surface AI actions when users select text in edit and preview modes.
  - Keep document-level actions in the header for whole-note runs without duplicated desktop entry points.
  - Support compare, copy, insert, replace, cancel, retry, refine, and reopen-without-rerun flows.

Sub-tasks
- [x] Add a contextual selection AI trigger in edit mode.
- [x] Add the same contextual selection AI trigger in preview mode.
- [x] Update header AI actions to open the assistant workspace for document-level runs.
- [x] Expand AI session state for original/result content, compare mode, refine prompts, and apply choices.
- [x] Reopen existing assistant sessions for the same file/action/scope instead of rerunning unnecessarily.

Test Plan
- Select text and run Improve Writing; verify the assistant opens with selection context.
- Select text in preview mode and run Summarize; verify the assistant opens without switching modes first.
- Run Summarize from the header with no selection; verify whole-note behavior.
- Toggle compare and apply the result without losing editing context.

---

## Story 23.3 — AI Action API Expansion and Large-Document Handling
- Components
  - `app/api/ai/action/route.ts`
  - `lib/ai/*`
  - `lib/cache/redis-client.ts`
- Behavior
  - Accept richer action payloads including model choice, context mode, and follow-up refinement context.
  - Remove the silent single-cap behavior by chunking large documents where needed and making partial processing explicit.
  - Replace the current in-memory rate limiter with a production-safe Redis-backed approach when Redis is configured.

Sub-tasks
- [x] Expand the AI action request schema for richer context and refinement flows.
- [x] Add large-document chunking/aggregation behavior for action runs.
- [x] Replace the in-memory rate limiter with Redis-backed limiting when available.

Test Plan
- Run actions on a large note and verify completion without silent truncation.
- Retry or refine an existing result and verify the API uses the requested model/context.
- Confirm rate-limit errors remain user-recoverable.

---

## Story 23.4 — Verification and Regression Checks
- Components
  - `components/ai-actions/*`
  - `components/vault-workspace/*`
  - `components/app-shell.tsx`
  - `app/api/ai/action/route.ts`
- Behavior
  - Validate the new AI actions flow without breaking existing chat, outline, editor, or responsive shell behavior.

Sub-tasks
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [ ] Manually verify selection-first, whole-note, compare, refine, and mobile assistant flows.
- [ ] Manually verify preview-mode selection actions, desktop-only dedicated AI header entry, and assistant reopen-without-rerun behavior.

Test Plan
- Smoke-test the acceptance criteria on desktop and mobile widths.
- Verify chat and outline sidebar switching still work after adding the assistant panel.

---

## Definition of Done
- Acceptance criteria met.
- Story docs and progress tracking updated.
- Lint/build checks pass.

## References
- `docs/stories/story-4.md`
- `docs/stories/story-5.md`
- `docs/stories/story-17.md`
- `docs/stories/story-18.md`
