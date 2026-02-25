# Progress

Current story: `docs/stories/story-22.md`

Current section: Story 22.4 — Verification and Regression Checks

Previous tasks (latest completed batch only):
- [x] Create `app/p/layout.tsx` with Onest and Roboto Serif Google Fonts.
- [x] Extract reading time logic to `lib/reading-time.ts`.
- [x] Update `public-file-view.tsx`: hide outline by default, apply fonts, show date-only with icon, add reading time with icon.
- [x] Update `page.tsx` date format to date-only.
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.

Next tasks:
- [ ] Execute manual smoke checks for fonts, date/reading time display, and outline default behavior.

Notes:
- Story 22 documents the public /p route look-and-feel polish shipped on branch `copilot/update-public-route-style`. `pnpm lint` passes. Build font-fetch errors occur only in the sandboxed environment (no internet access) — the same pre-existing JetBrains Mono font also fails in sandbox; CI with internet access will succeed. Manual smoke checks remain outstanding.

