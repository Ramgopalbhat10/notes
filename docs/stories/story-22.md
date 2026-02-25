# Story 22 — Public View Look and Feel Polish (Fonts, Date, Reading Time, Outline Default)

Goal: Improve the visual presentation of the public `/p` route with custom typography, a cleaner metadata bar, and better outline default behavior.

## Scope
- In: public route (`app/p/`) typography, date display, reading time, outline default state on desktop.
- Out: editor/workspace UX, AI behavior, authentication, non-public routes.

## Deliverables
- `app/p/layout.tsx` — new layout loading **Onest** (body) and **Roboto Serif** (title) Google Fonts.
- `lib/reading-time.ts` — extracted reading time utility shared from existing app-shell logic.
- `components/public/public-file-view.tsx` — updated header with date icon, date-only display, reading time, and outline hidden by default on desktop.
- `app/p/[[...path]]/page.tsx` — date format changed to date-only (no time component).

## Acceptance Criteria
- Post body text uses **Onest** font (Google Fonts).
- Main post title uses **Roboto Serif** font (Google Fonts).
- Desktop outline is hidden by default; the `ListTree` toggle icon is visible for users to open it.
- Date below title shows only the date part (e.g., "Feb 24, 2026") with a `CalendarDays` icon to the left.
- Reading time is displayed next to the date, separated by `·`, with a `Clock` icon.
- Reading time uses the same 200 WPM logic as the workspace editor status bar.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-25 | feat | Added `app/p/layout.tsx` loading Onest and Roboto Serif from `next/font/google`; extracted reading time logic to `lib/reading-time.ts`; updated public-file-view to apply fonts, show date-only with CalendarDays icon, reading time with Clock icon, and hide desktop outline by default. |
| 2026-02-25 | docs | Created story-22.md and updated docs/stories/README.md and docs/PROGRESS.md retroactively to follow WORKFLOW.md. Lint passes. Build font-fetch errors in sandbox are a network limitation (same JetBrains Mono font also fails in sandbox); CI with internet access will succeed. |

## Issues

| Issue | Title | Status | File |
|---|---|---|---|
| 14 | Markdown Heading Font Falls Back to system-ui in Public /p Route | resolved | `app/globals.css` |

---

## Story 22.1 — Custom Fonts via Layout

- Components
  - `app/p/layout.tsx` (new)
- Behavior
  - Load Onest and Roboto Serif from `next/font/google` scoped to the public `/p` route.
  - Expose fonts as CSS variables `--font-onest` and `--font-roboto-serif`.

Sub-tasks
- [x] Create `app/p/layout.tsx` with `Onest` and `Roboto_Serif` font definitions.
- [x] Apply CSS variable classes to the wrapping `<div>`.

Test Plan
- Open any public note and confirm body text renders in Onest (check DevTools computed styles).
- Confirm the title renders in Roboto Serif.

---

## Story 22.2 — Reading Time Utility Extraction

- Components
  - `lib/reading-time.ts` (new)
  - `components/app-shell.tsx` (unchanged — keeps its internal copy for now)
- Behavior
  - Extract the 200 WPM reading time computation into a reusable utility for use on the public route.

Sub-tasks
- [x] Create `lib/reading-time.ts` exporting `computeReadingTimeLabel(content: string): string`.
- [x] Logic matches the existing `computeReadingTimeLabel` in `components/app-shell.tsx`.

Test Plan
- Confirm reading time label appears on public notes.
- Confirm `< 1 min`, minute, and hour labels all format correctly for edge-case content lengths.

---

## Story 22.3 — Public View Header Metadata and Outline Default

- Components
  - `components/public/public-file-view.tsx`
  - `app/p/[[...path]]/page.tsx`
- Behavior
  - Title styled with Roboto Serif via inline CSS variable.
  - Body text styled with Onest via inline CSS variable on `<main>`.
  - Date display: date-only format with `CalendarDays` icon.
  - Reading time: displayed next to date separated by `·` with `Clock` icon.
  - Desktop outline: hidden by default (`useState(false)`).

Sub-tasks
- [x] Change `useState(true)` → `useState(false)` for desktop `outlineOpen`.
- [x] Apply `style={{ fontFamily: "var(--font-onest, system-ui)" }}` to `<main>`.
- [x] Apply `style={{ fontFamily: "var(--font-roboto-serif, ui-serif)" }}` to `<h1>`.
- [x] Replace `<p>Last updated {lastUpdated}</p>` with icon + date + separator + icon + reading time row.
- [x] Update `lastUpdated` format in `page.tsx` to date-only (remove `timeStyle`).

Test Plan
- Open a public note on desktop and confirm outline panel is not shown by default.
- Click the `ListTree` button and confirm outline opens.
- Confirm date shows only "Feb 24, 2026" with a calendar icon.
- Confirm reading time appears with a clock icon.
- Confirm fonts render correctly.

---

## Story 22.4 — Verification and Regression Checks

- Components
  - `docs/PROGRESS.md`
- Behavior
  - Run quality gates and manual checks.

Sub-tasks
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [ ] Execute manual smoke checks for fonts, date/reading time display, and outline default behavior.

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
- `docs/stories/story-21.md`
- `components/app-shell.tsx` (original reading time logic)
- https://fonts.google.com/specimen/Onest
- https://fonts.google.com/specimen/Roboto+Serif
