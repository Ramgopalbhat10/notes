# Story 21 — Public View Title, Rendering Stability, Outline Navigation, UX Polish, and Highlight Parity

Goal: Improve the public note experience by removing redundant title rendering, fixing stray bullet rendering in preview/public, and enabling outline navigation in public view across desktop/tablet/mobile.

## Scope
- In: public route rendering updates, markdown preview parsing stability changes for file/public previews, public outline UI with click-to-scroll and highlight behavior.
- Out: major layout redesign, editor authoring UX changes, AI/chat behavior changes.

## Deliverables
- Public page title derived from file name instead of Markdown body heading.
- Public body content remains unchanged (top H1 preserved when present).
- Markdown preview option updates to prevent phantom empty bullet rendering in file/public previews.
- Shared outline panel reused across workspace and public outline sidebar with section navigation + highlight.
- Markdown code-fence language fallback for unsupported aliases (e.g., `ascii`) to avoid runtime Shiki errors.
- Progress/docs updates for workflow tracking.

## Acceptance Criteria
- Public page header title uses file name (extension removed, readable formatting).
- If the markdown starts with an H1 heading, it remains visible in the body content.
- Empty bullet does not appear in preview/public when not present in source content.
- Public view has an outline action that opens on desktop/tablet/mobile and reuses the same tree/search/expand UI as workspace outline.
- Public outline navigation scrolls instantly to sections and highlights the target heading.
- Closing/toggling public outline does not reset page scroll position.
- Highlight animation clears after timeout and does not remain stuck when outline panel closes.
- Rendering markdown with unsupported `ascii` fences no longer throws Shiki runtime errors.
- Existing UX/UI remains visually consistent without drastic structural changes.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-24 | feat | Implemented public filename-based title, leading-H1 deduplication, stable preview/public markdown parsing, and public outline drawer navigation with section highlight. |
| 2026-02-24 | fix | Kept body H1 intact while retaining filename header title, reused shared outline panel in public drawer with smooth-scroll navigation, and added `ascii` fence fallback to avoid Shiki errors. |
| 2026-02-24 | fix | Fixed public outline jump-back behavior by keeping drawer open on section click and switching public navigation to instant scroll while preserving transient target highlight. |
| 2026-02-24 | fix | Replaced overlay public drawer with inline public sidebar behavior, and cleared highlight classes on outline unmount to prevent stuck highlights and scroll reset side effects. |
| 2026-02-24 | fix | Standardized public outline trigger visuals across desktop/mobile, made mobile sheet full-screen and compact, closed mobile sheet on heading click, and enforced instant outline navigation scroll. |
| 2026-02-24 | fix | Matched public mobile heading highlight feel with private files by delaying mobile sheet close after heading navigation so the existing highlight animation remains visible. |
| 2026-02-24 | fix | Removed delayed mobile sheet close to restore instant close on heading click, and preserved transient highlight visibility by allowing shared outline timeout cleanup to complete across unmount. |
| 2026-02-24 | fix | Addressed PR feedback hardening by keying public outline context by canonical file path, replacing regex fence fallback rewrite with fence-aware linear parsing, and removing `Math.random()` from outline highlight tokening. |
| 2026-02-24 | fix | Aligned public mobile outline header close control with the "Outline" title by replacing the default absolute close placement with a header-row close action. |

## Issues

| Issue | Title | Status | File |
|---|---|---|---|

---

## Story 21.1 — Public Title and Body Deduplication
- Components
  - `app/p/[[...path]]/page.tsx`
- Behavior
  - Header title uses file name.
  - Public body markdown remains unchanged, including any leading H1.

Sub-tasks
- [x] Update public title derivation to filename-first behavior.
- [x] Keep public body markdown unchanged (do not strip leading H1).
- [x] Keep metadata/canonical behavior intact.

Test Plan
- Open a public note with leading H1 and verify header title uses file name while body H1 remains visible.
- Open a public note without leading H1 and verify content remains unchanged.

---

## Story 21.2 — Preview/Public Markdown Rendering Stability
- Components
  - `components/markdown-preview.tsx`
  - `components/vault-workspace/index.tsx`
  - `app/p/[[...path]]/page.tsx`
- Behavior
  - Stabilize markdown parsing in file preview/public routes to prevent phantom empty bullets.

Sub-tasks
- [x] Add markdown-preview prop to control incomplete markdown parsing.
- [x] Disable incomplete parsing for workspace file preview and public render usage.
- [x] Preserve existing behavior for other markdown-preview consumers unless explicitly changed.

Test Plan
- Validate removed list items no longer produce stray bullet in workspace preview.
- Validate public page renders lists without phantom bullet.

---

## Story 21.3 — Public Outline Drawer
- Components
  - `app/p/[[...path]]/page.tsx`
  - `components/public/*`
  - `components/outline/markdown-outline-panel.tsx`
  - `components/vault-workspace/outline-sidebar.tsx`
- Behavior
  - Add outline action to public header.
  - Open outline as an inline right sidebar on desktop and inline section on smaller screens.
  - Reuse the same outline tree/search/expand UX in both workspace and public views.
  - Clicking section scrolls instantly in public view and applies existing highlight style.

Sub-tasks
- [x] Add public outline trigger icon in header area without major layout shifts.
- [x] Implement shared outline panel reused by workspace and public outline drawer.
- [x] Ensure mobile/tablet interaction works without overlay side effects.
- [x] Align desktop/mobile outline trigger icon styling (dark, compact), make mobile sheet full-width with compact spacing, close on heading click, and enforce instant public scroll behavior.
- [x] Match public heading highlight animation feel with private files behavior.
- [x] Restore instant mobile sheet close on heading click while preserving transient highlight behavior.

---

## Story 21.5 — Unsupported Code-Fence Language Fallback
- Components
  - `components/markdown-preview.tsx`
- Behavior
  - Normalize unsupported code-fence aliases (e.g., `ascii`) to supported fallback language for rendering.

Sub-tasks
- [x] Add markdown normalization step for unsupported fence aliases.
- [x] Prevent runtime Shiki errors caused by unsupported `ascii` language fences.

Test Plan
- Open markdown content with ```ascii fence and verify preview/public renders without console runtime errors.

Test Plan
- Verify outline opens and navigates correctly on desktop/tablet/mobile.
- Verify active section state updates while navigating headings.

---

## Story 21.6 — PR Feedback Hardening (Context Keys, Fence Parsing, Token Safety)
- Components
  - `app/p/[[...path]]/page.tsx`
  - `components/public/public-file-view.tsx`
  - `components/markdown-preview.tsx`
  - `components/outline/markdown-outline-panel.tsx`
- Behavior
  - Public outline context keys use canonical file path (not display title).
  - Fence-language normalization rewrites only actual code-fence opener lines with linear parsing.
  - Outline highlight tokening avoids pseudorandom generation.

Sub-tasks
- [x] Key public outline panel context by canonical file key/path.
- [x] Replace regex fence-language rewrite with a fence-aware linear parser.
- [x] Replace `Math.random()` highlight token generation with deterministic monotonic tokening.

Test Plan
- Open two public files with same display title and verify outline state does not leak between files.
- Verify ```ascii and ```ascii-art fences still render while literal ```ascii text inside fenced content is not rewritten.
- Verify repeated outline heading clicks still produce transient highlight and proper cleanup.

---

## Story 21.7 — Public Mobile Outline Header Close Alignment
- Components
  - `components/public/public-file-view.tsx`
- Behavior
  - Mobile public outline header aligns close icon horizontally with the "Outline" label.

Sub-tasks
- [x] Replace the default absolute sheet close placement in public mobile outline with a header-row close action.

Test Plan
- Open the public mobile outline sheet and verify "Outline" and close icon are vertically centered on the same row.
- Verify close icon still dismisses the sheet reliably.

---

## Story 21.4 — Verification and Regression Checks
- Components
  - `docs/PROGRESS.md`
- Behavior
  - Run quality gates and manual checks.

Sub-tasks
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [ ] Execute manual smoke checks for title dedupe, bullet rendering, and public outline behavior.

Test Plan
- Confirm lint/build pass.
- Confirm all acceptance criteria scenarios pass manually.

---

## Definition of Done
- Acceptance criteria met.
- Dev Log updated for each unit of work.
- Progress updated in `docs/PROGRESS.md`.

## References
- `docs/WORKFLOW.md`
- `docs/stories/story-11.md`
- `docs/stories/story-17.md`
- `docs/learnings/2026-02-13-outline-navigation-dom-sync.md`
- `docs/learnings/2026-02-14-outline-highlight-scroll-ux.md`
