# Story 17 — Markdown Outline Right Sidebar (Chat/Outline Panel Switching)

Goal: Add an Obsidian-style markdown outline panel in the right sidebar, opened from header actions, with heading navigation, scroll-to-section, and temporary section highlighting.

## Scope
- In: markdown heading parsing (ATX + Setext), right panel mode state (`chat` | `outline`), outline tree UI with expand/collapse, heading navigation from outline, edit-to-preview switch on outline navigation, right panel swap without close-first behavior, and documentation updates.
- Out: keyboard shortcuts for outline, persisted outline expansion state across sessions, full markdown AST parity beyond heading extraction rules, and automated UI tests (no current harness).

## Deliverables
- `stores/layout.ts` panel-aware right sidebar state and methods.
- `components/app-shell.tsx` right panel title/content switching and panel-aware open/toggle helpers.
- `lib/markdown-outline.ts` reusable heading extraction and stable heading ID generation.
- `components/markdown-preview.tsx` heading ID wiring (`id` + `data-outline-id`) using parsed line mapping.
- `components/vault-workspace/outline-sidebar.tsx` new outline panel UI and navigation logic.
- `components/vault-workspace/index.tsx` and `components/vault-workspace/header.tsx` action wiring for explicit `Chat` and `Outline` opens.
- `app/files/[[...path]]/page.tsx` right panel renderer selection (`chat` or `outline`).
- `app/globals.css` outline target highlight animation.

## Acceptance Criteria
- Header actions include `Outline` for selected files.
- Opening `Outline` shows a right sidebar tree for headings `H1-H6`.
- Outline supports nested expand/collapse and global expand-all/collapse-all controls.
- Clicking an outline item scrolls the target heading to the top area and highlights it for ~2 seconds.
- Clicking outline item in edit mode switches to preview first, then navigates/highlights.
- Switching `Outline -> Chat` and `Chat -> Outline` keeps sidebar open and replaces content in place.
- Mobile right sheet supports the same panel switching behavior.
- Headings inside fenced code blocks are excluded.

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-13 | feat | Added panel-aware right sidebar state (`chat`/`outline`) and shell-level panel replacement behavior. |
| 2026-02-13 | feat | Added markdown outline parser utility with ATX/Setext support and deterministic heading IDs. |
| 2026-02-13 | feat | Added outline sidebar component with tree navigation, edit->preview handoff, scroll + 2s highlight. |
| 2026-02-13 | feat | Wired header actions and files page right panel rendering for explicit outline/chat opening. |
| 2026-02-13 | feat | Added preview heading anchors and highlight animation styles. |
| 2026-02-13 | fix | Fixed outline navigation reliability, top-aligned scrolling, visible highlight timing, and mobile auto-close on outline selection. |
| 2026-02-13 | fix | Restored smooth section scrolling, strengthened dark highlight styling, and added vertical connector lines for expanded outline trees. |
| 2026-02-14 | fix | Removed smooth scrolling from outline navigation and forced instant top alignment in the active markdown scroll container. |
| 2026-02-14 | fix | Reworked heading highlight UX from block background to primary underline pulse, then refined to smooth opacity-only pulse without width scaling. |
| 2026-02-14 | feat | Replaced duplicate outline subheader with a search toolbar and added hierarchy-aware outline filtering with search-locked expansion behavior. |
| 2026-02-14 | fix | Refined outline search toolbar visuals with transparent input styling, inline clear button, and a separator before expand/collapse controls. |
| 2026-02-14 | fix | Fixed mobile outline navigation highlight cleanup so underline is removed after timeout even when the outline sheet closes immediately. |

---

## Story 17.1 — Right Sidebar Panel Model and App Shell Wiring
- Components
  - `stores/layout.ts`
  - `components/app-shell.tsx`
  - `app/files/[[...path]]/page.tsx`
- Behavior
  - Model right sidebar as a panel mode (`chat` or `outline`) and swap in-place without close-first.
  - Keep keyboard toggle semantics for chat (`Cmd/Ctrl+J`) while allowing panel replacement.

Sub-tasks
- [x] Add `RightSidebarPanel` type and panel-aware right sidebar methods in layout store.
- [x] Update `AppShell` children helper to expose `openRightPanel(panel)`.
- [x] Add panel-based title rendering and conditional chat-only "New chat" action.
- [x] Add right panel content replace animation (desktop and mobile).
- [x] Update files page to select right content by current panel mode.

Test Plan
- Open outline and switch to chat from header action; verify sidebar remains open.
- Open chat and switch to outline from header action; verify sidebar remains open.
- Press `Cmd/Ctrl+J` while outline is open; verify panel switches to chat without closing first.

---

## Story 17.2 — Markdown Outline Parsing + Preview Heading Anchors
- Components
  - `lib/markdown-outline.ts`
  - `components/markdown-preview.tsx`
  - `app/globals.css`
- Behavior
  - Parse markdown headings from source and generate stable deduplicated IDs.
  - Apply IDs to rendered preview headings for reliable outline navigation.
  - Provide a 2s highlight animation class for target headings.

Sub-tasks
- [x] Implement heading extraction for ATX and Setext formats.
- [x] Ignore headings inside fenced code blocks.
- [x] Build stable IDs with `md-outline-` prefix and duplicate suffix handling.
- [x] Wire heading components (`h1`-`h6`) to include `id` and `data-outline-id`.
- [x] Add CSS animation class `.outline-target-highlight`.

Test Plan
- Validate duplicate heading titles generate distinct IDs.
- Validate Setext headings appear in outline and map to rendered heading anchors.
- Confirm code-fence pseudo headings are excluded.

---

## Story 17.3 — Outline Sidebar UX and Navigation Behavior
- Components
  - `components/vault-workspace/outline-sidebar.tsx`
  - `components/vault-workspace/index.tsx`
  - `components/vault-workspace/header.tsx`
- Behavior
  - Show hierarchical outline tree in right panel.
  - Navigate to selected headings and visually highlight them.
  - Support expand/collapse interactions.

Sub-tasks
- [x] Add `OutlineSidebar` with nested tree-style rows.
- [x] Add per-node expand/collapse and global expand-all/collapse-all controls.
- [x] Add click handler to switch edit->preview and retry heading lookup for navigation.
- [x] Update header action menu with explicit `Outline` and `Chat` actions.
- [x] Replace workspace `onToggleRight` plumbing with explicit open-chat/open-outline callbacks.

Test Plan
- Click multiple headings and verify smooth scrolling + 2s highlight.
- In edit mode, click outline item and verify preview mode switch + navigation.
- Confirm empty outline state for files without headings.

---

## Story 17.4 — Verification and Regression Checks
- Components
  - `components/app-shell.tsx`
  - `components/vault-workspace/header.tsx`
  - `components/vault-workspace/index.tsx`
  - `components/vault-workspace/outline-sidebar.tsx`
  - `components/markdown-preview.tsx`
  - `stores/layout.ts`
- Behavior
  - Validate new outline flow and right panel behavior without breaking chat or existing layout controls.

Sub-tasks
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [ ] Manually verify desktop and mobile panel switch scenarios.

Test Plan
- Manual QA checklist from acceptance criteria.
- Confirm right sidebar close/expand controls still function in both panel modes.

---

## Definition of Done
- Outline panel is available from header actions and functions end-to-end.
- Right sidebar panel switching is in-place and does not close before replacement.
- Heading navigation and 2s highlight work from outline clicks.
- Story docs and progress tracking are updated.
- Lint/build checks pass.

## References
- `components/app-shell.tsx`
- `components/vault-workspace/header.tsx`
- `components/vault-workspace/index.tsx`
- `components/vault-workspace/outline-sidebar.tsx`
- `components/markdown-preview.tsx`
- `lib/markdown-outline.ts`
- `stores/layout.ts`
