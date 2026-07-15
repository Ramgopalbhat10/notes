# Issue 46 — Generate DESIGN.md from existing visual system

## Type
- chore

## Status
- resolved

## Related Story
- None

## Description
- Run `/impeccable document` to extract the current visual design system and write a root `DESIGN.md` plus `.impeccable/design.json` sidecar, so future UI changes stay on-brand.

## Root Cause
- `PRODUCT.md` exists after init, but no `DESIGN.md` has been generated, leaving color, typography, elevation, and component conventions undocumented for AI-assisted design work.

## Fix / Approach
- Scan existing CSS custom properties, Tailwind config, global styles, and key components.
- Extract reusable tokens (colors, typography, rounded, spacing) and component patterns.
- Write `DESIGN.md` with the required six-section structure and YAML frontmatter.
- Write `.impeccable/design.json` sidecar with tonal ramps, shadows, motion, breakpoints, and component HTML/CSS snippets.
- Run `pnpm lint` and `pnpm build` to verify no regressions.

## Files Changed
- `DESIGN.md`
- `.impeccable/design.json`
- `docs/issues/issue-46.md`
- `docs/issues/README.md`
- `docs/PROGRESS.md`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-07-15 | chore | Generate DESIGN.md from existing visual system |

## Test Plan
- Confirm `DESIGN.md` exists and follows the six-section spec (Overview, Colors, Typography, Elevation, Components, Do's and Don'ts).
- Confirm `.impeccable/design.json` sidecar is valid JSON and complements the frontmatter.
- Run `pnpm lint` and `pnpm build`; both pass.

## Definition of Done
- `DESIGN.md` and `.impeccable/design.json` generated.
- `pnpm lint` and `pnpm build` pass.
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- `.agents/skills/impeccable/reference/document.md`
- `PRODUCT.md`
