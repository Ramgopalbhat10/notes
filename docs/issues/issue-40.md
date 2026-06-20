# Issue 40 — Add Geist Sans Font as Primary UI Font

## Type
- chore

## Status
- resolved

## Related Story
- None

## Description
- The app relied solely on JetBrains Mono for all text, including body/UI copy where a proportional sans-serif is more appropriate.
- Needed a clean, modern sans-serif as the primary interface font while keeping JetBrains Mono for monospace contexts.

## Root Cause
- `app/layout.tsx` only loaded `JetBrains_Mono` from `next/font/google` and applied its CSS variable to the body.
- There was no sans-serif font variable (`--font-family-sans`) available for the rest of the UI to consume.

## Fix / Approach
- Added the `Geist` font from `next/font/google` with `subsets: ["latin"]` and exposed it as the `--font-family-sans` CSS variable.
- Applied `geist.variable` alongside `jetbrainsMono.variable` to the `<body>` element so both font variables are available app-wide.

## Files Changed
- `app/layout.tsx`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-06-20 | chore | Added Geist sans-serif font via next/font and exposed --font-family-sans variable |

## Test Plan
- Verify the app renders body/UI text in Geist sans-serif.
- Verify JetBrains Mono still loads and is available for monospace contexts.
- Run `pnpm lint` and `pnpm build` to verify correctness.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- None
