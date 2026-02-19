# Story 19 — UI Polish: Contrast, Typography & Interactive Depth

Goal: Improve dark-mode visual hierarchy through better surface contrast, unify typography to a single font, add subtle 3D depth to interactive elements, and fix folder-item text overflow in the sidebar.

## Scope
- In: dark-mode CSS tokens, shadow system, font unification (Inter only), hover/popover 3D shadow utility, folder item action-icon overlay
- Out: light-mode tokens, markdown editor content styles, component logic, mobile layout restructure

## Deliverables
- `app/globals.css` — reworked dark-mode color tokens, shadow system, heading font rule, surface-raised utility
- `app/layout.tsx` — remove Space Grotesk import
- `components/file-tree/tree-nodes.tsx` — folder action-icon overlay (absolute positioning)

## Acceptance Criteria
- Sidebar background is clearly darker than the main content background
- Card, popover, and accent surfaces have visually distinct lightness steps
- Interactive elements (buttons, dropdowns, popovers) have a subtle inset-highlight + drop-shadow 3D effect on hover
- All UI text uses Inter; no Space Grotesk rendered anywhere
- Folder names in the sidebar take the full row width; action icons appear as overlay on hover without displacing text

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-19 | feat | Rework globals.css tokens/shadows/font + layout.tsx + tree-nodes.tsx overlay |
| 2026-02-19 | fix | Overlay gradient → from-sidebar; --accent raised for popover hover visibility; button 3D shadow-sm; compact font body rule |
| 2026-02-19 | fix | Folder overlay split into gradient-fade strip + solid icon container so text fully hidden under icons |
| 2026-02-19 | fix | Folder selected bg → sidebar-accent (visible, distinct from file bg-muted); overlay colors track row state |
| 2026-02-19 | fix | Solid bg-sidebar-accent (no alpha) for active/selected overlay — eliminates alpha-compositing color mismatch |
| 2026-02-19 | fix | Hover overlay uses color-mix group-hover to exactly match row hover bg — no darker strip visible |

## Issues

| Issue | Title | Status | File |

---

## Story 19.1 — Color Tokens, Shadows & Font
- Components
  - `app/globals.css`
  - `app/layout.tsx`
- Behavior
  - Dark-mode surfaces have wider lightness spread (sidebar L=0.13, bg L=0.175, card L=0.215, popover L=0.245)
  - Shadows include inset top-edge white highlight + stronger black drop
  - Headings use Inter (sans) at weight 600 with tight tracking

Sub-tasks
- [x] Update dark-mode CSS custom properties in `.dark` block
- [x] Update shadow values for dark mode
- [x] Change heading font-family rule to use `--font-sans`
- [x] Remove Space Grotesk from layout.tsx

Test Plan
- Visually verify sidebar is clearly darker than main area
- Verify no Space Grotesk rendered (DevTools → Computed → font-family on h1)
- Verify button/popover hover has visible shadow

---

## Story 19.2 — Folder Item Action-Icon Overlay
- Components
  - `components/file-tree/tree-nodes.tsx`
- Behavior
  - Folder name takes full row width (action icons no longer reserve space)
  - On hover, action icons appear as overlay at right edge with gradient fade behind them

Sub-tasks
- [x] Make action-icon wrapper absolutely positioned
- [x] Add gradient fade from sidebar-accent → transparent
- [x] Verify text fills full row width when not hovering
- [x] Split overlay into gradient-fade strip + solid icon container (text fully hidden under icons)
- [x] Match overlay bg to row state (selected/active=sidebar-accent solid, hover=color-mix, default=sidebar)
- [x] Fix alpha-compositing mismatch — use solid bg-sidebar-accent for selected/active
- [x] Fix hover state mismatch via color-mix group-hover for gradient stop and icon container bg

Test Plan
- Hover over a folder with a long name — text should reach the right edge
- On hover, FolderPlus + FilePlus2 icons appear overlaid on text
- Icons still clickable and functional

---

## Story 19.3 — Additional Fixes: Popover Hover, Button Depth, Font, Folder UX
- Components
  - `app/globals.css`, `components/ui/button.tsx`, `components/file-tree/tree-nodes.tsx`
- Behavior
  - --accent raised so dropdown/context-menu hover items are clearly visible
  - Button default/secondary/outline variants have inset-highlight + drop-shadow 3D pop
  - Body font-size 13px, line-height 1.5, letter-spacing -0.01em (compact)
  - Folder selected bg = sidebar-accent; overlay perfectly tracks row bg in all states

Sub-tasks
- [x] Raise --accent oklch lightness for popover hover visibility
- [x] Add shadow-sm + border to Button default/secondary; upgrade outline to shadow-sm
- [x] Compact font body rule (font-size, line-height, letter-spacing)
- [x] Folder overlay split: gradient strip (fade only) + solid icon container
- [x] Folder selected bg → sidebar-accent; all three bg pieces track row state
- [x] color-mix group-hover for hover state exact bg matching
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.

Test Plan
- Lint exits 0
- Build exits 0
- App loads, sidebar renders, file open/save works

---

## Definition of Done
- Acceptance criteria met.
- Dev Log updated for each unit of work.
- Progress updated in `docs/PROGRESS.md`.

## References
- Plan: `/home/jarvis/.windsurf/plans/ui-polish-contrast-typography-depth-0d5444.md`
- Reference screenshots: Linear, Obsidian, Claude sidebar
