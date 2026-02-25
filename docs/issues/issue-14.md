# Issue 14 — Markdown Heading Font Falls Back to system-ui in Public /p Route

## Type
- bug

## Status
- resolved

## Related Story
- `docs/stories/story-22.md` — Public View Look and Feel Polish (Fonts, Date, Reading Time, Outline Default)

## Description
- Headings inside the `MarkdownPreview` component on the `/p` public route render in `system-ui` instead of the intended **Onest** font.

## Root Cause
- `globals.css` defines a global rule `h1, h2, h3, h4, h5, h6 { font-family: var(--font-family-sans, var(--font-family-sans-fallback)); }`.
- `--font-family-sans` is never set, so all headings fall back to `--font-family-sans-fallback` = `system-ui, sans-serif`.
- This global rule has higher specificity than the `font-family` inherited from the `<main>` element (which sets `var(--font-onest, system-ui)` via inline style), so markdown headings inside `.markdown-preview` ignore the Onest font.

## Fix / Approach
- Add `.markdown-preview h1, ..., h6 { font-family: inherit; }` in `app/globals.css` inside the existing `@layer components` block for `.markdown-preview`.
- This makes markdown headings inherit the font from the nearest ancestor, which in the `/p` route is the `<main>` element carrying `var(--font-onest, system-ui)`.
- In the regular app's markdown preview the parent body still resolves to `system-ui`, so there is no visible change outside the public route.

## Files Changed
- `app/globals.css`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-25 | fix | Added `.markdown-preview h1–h6 { font-family: inherit; }` in globals.css so markdown headings inherit Onest from the public-route parent instead of falling back to system-ui. |

## Test Plan
- Open a public note at `/p/<slug>` and inspect h2/h3/h4/h5/h6 elements in DevTools — computed `font-family` should show Onest.
- Open the main editor/preview — computed `font-family` for headings should still be `system-ui` (unchanged).
- Run `pnpm lint` and confirm no errors.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.
- Story-22 Issues section updated with resolved status.

## References
- `docs/stories/story-22.md`
- `app/globals.css`
- `components/public/public-file-view.tsx`
- `app/p/layout.tsx`
