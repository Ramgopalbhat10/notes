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
| 2026-02-25 | feat | Added Onest font scoped to /p route via app/p/layout.tsx; fixed mobile <p> font-size using scoped CSS (.public-view p); widened outline sidebar to w-96; compacted and uppercased outline header; converted outline FABs to always-visible toggles at fixed bottom-4 right-4 (mobile and desktop). |
| 2026-02-25 | fix | Added desktop public outline FAB edge-floating positioning anchored to article width with viewport clamping; added public-route-only markdown wrapping/list/link rules to reduce premature mobile line breaks and keep references bullets/text aligned; lint/build pass. |
| 2026-02-25 | fix | Converted desktop public outline to fixed slide-in overlay so article content no longer shifts on toggle; kept desktop FAB visually stable by removing toggle-time reposition updates; lint/build pass. |
| 2026-02-25 | chore | Completed manual UX verification for Story 21.9/21.10 across mobile/desktop viewports; confirmed wrapping, references bullets, no desktop content shift, and stable outline toggle icon behavior. |

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
- [x] Execute manual smoke checks for title dedupe, bullet rendering, and public outline behavior.

Test Plan
- Confirm lint/build pass.
- Confirm all acceptance criteria scenarios pass manually.

---

## Story 21.8 — Public View UI Polish (Font, Typography, Outline Layout, Toggle)
- Components
  - `app/p/layout.tsx`
  - `components/public/public-file-view.tsx`
  - `app/globals.css`
- Behavior
  - Onest font applied to `/p` route only via a nested layout, leaving the rest of the app on system-ui.
  - Mobile `<p>` text in the public markdown body renders at 16px (scoped to `.public-view`), without affecting headings, `pre`, or `code`.
  - Outline sidebar widened from 320px → 384px to prevent long heading text from truncating.
  - Outline sidebar header compacted (`h-14` → `h-10`) and label uppercased ("OUTLINE").
  - Floating outline FABs replaced with always-visible toggle FABs at `fixed bottom-4 right-4` (same styling as original); removed conditional rendering so the button is always present and toggles open/close on both mobile and desktop.

Sub-tasks
- [x] Create `app/p/layout.tsx` loading Onest from `next/font/google`, scoped to `/p` route via `--font-family-sans` variable.
- [x] Add `.markdown-preview.public-view p { font-size: 1rem; }` in `globals.css` scoped to public view only.
- [x] Pass `className="public-view"` to `MarkdownPreview` in `public-file-view.tsx` to activate scoped rule.
- [x] Widen desktop outline aside from `w-80` → `w-96`.
- [x] Compact aside header to `h-10`, uppercase "OUTLINE" label, correct scroll area height.
- [x] Replace mobile `SheetTrigger` FAB with a plain always-visible toggle `Button` at `fixed bottom-4 right-4 lg:hidden`.
- [x] Replace conditional desktop re-open FAB with always-visible toggle `Button` at `fixed bottom-4 right-4 hidden lg:block`.

Test Plan
- Open `/p/<slug>` and verify Onest renders; open `/files/` and verify system-ui is still used there.
- On mobile (<1024px): tap toggle in article header → sheet opens; tap again or hit X → sheet closes. Verify `<p>` text is 16px; headings/code size unchanged.
- On desktop (≥1024px): toggle button always visible in header; clicking opens/closes aside; X inside aside header also closes it. Verify sidebar is wider and heading text fits better.

---

## Story 21.9 — Public `/p` Route: Outline Toggle Placement + Mobile Text Wrapping Fixes
- Components
  - `components/public/public-file-view.tsx`
  - `app/globals.css`
- Behavior
  - Keep mobile outline FAB unchanged (`lg:hidden`), including overlap behavior on mobile.
  - Move desktop outline FAB from viewport corner to an edge-floating position anchored to the content column width.
  - Improve mobile/smaller-width text wrapping and list rendering in public markdown only.
  - Prevent references list from breaking immediately after bullet marker when content can fit on the first line.

Sub-tasks
- [x] Add desktop FAB edge-floating positioning logic anchored to article right edge, with viewport clamping.
- [x] Recompute desktop FAB horizontal position on resize and on outline open/close transitions.
- [x] Add route-scoped `.markdown-preview.public-view` wrapping rules to reduce premature line breaks and overflow.
- [x] Add route-scoped public list/link rules to keep bullet marker and first line content aligned when possible.
- [x] Keep all CSS changes scoped to public view only; no workspace/editor style regressions.
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [x] Execute manual checks at `320`, `375`, `425`, `768`, and `1024+` widths.

Test Plan
- Desktop icon placement:
  - At `>=1024px`, verify the desktop outline FAB is near the article edge (not fixed at viewport bottom-right).
  - Verify icon remains off content with outline open and closed.
  - Verify desktop icon still toggles outline reliably.
- Mobile/smaller widths (`320`, `375`, `425`, `768`):
  - Verify paragraph/link wrapping does not break too early.
  - Verify no horizontal overflow.
  - Verify content uses available container width consistently.
- References list:
  - Verify bullet marker and first text/link stay on the same line when possible.
  - Verify long links still wrap without layout break.
- Regression:
  - Verify mobile FAB remains unchanged and can overlay content.
  - Verify mobile outline sheet behavior is unchanged (open/close/navigate).

---

## Story 21.10 — Desktop Outline Overlay Without Content Shift
- Components
  - `components/public/public-file-view.tsx`
- Behavior
  - On desktop (`lg+`), opening/closing the outline must not move the main article content.
  - Desktop outline should slide in as an overlay panel from the right edge.
  - Desktop outline FAB should remain visually stable while toggling outline open/close.
  - Mobile/tablet sheet behavior remains unchanged.

Sub-tasks
- [x] Convert desktop outline panel from layout-width toggle to fixed overlay slide-in/out behavior.
- [x] Ensure overlay closed state is non-interactive (`pointer-events: none`) and open state is interactive.
- [x] Keep desktop FAB anchored behavior without jitter while toggling outline.
- [x] Preserve existing desktop outline header/content behavior and instant section navigation.
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [x] Execute manual desktop UX checks for no content shift and stable icon position during toggle.

Test Plan
- Desktop overlay behavior:
  - At `>=1024px`, open/close outline repeatedly and verify article content position does not move.
  - Verify desktop FAB does not jitter when toggling outline.
  - Verify outline panel slides over content area from right and can be closed from toggle button and panel close icon.
- Regression:
  - Verify mobile/tablet outline sheet flow is unchanged.
  - Verify outline section navigation and highlight behavior still work.

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
