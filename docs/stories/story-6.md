# Story 6 — Polish, Shortcuts, and A11y

Goal: Improve UX with keyboard shortcuts, breadcrumbs, empty/error states, and basic accessibility.

## Scope
- In: Breadcrumbs, keyboard shortcuts, empty/loading/error states, focus management, tooltips.
- Out: Internationalization, full screen reader audits (future dedicated pass).

## Deliverables
- Breadcrumbs in main header; robust states across tree/editor.
- Keyboard: global and scoped shortcuts (toggle sidebars, save, tree nav basics).
- A11y: labels, roles, focus rings, tooltip descriptions.

## Acceptance Criteria
- Shortcuts are documented and work across views without conflicts.
- State feedback is clear (loading/empty/error) and consistent.
- Interactive elements have accessible names and focus indicators.

---

## Story 6.1 — Breadcrumbs & States
- Breadcrumbs: clickable segments derived from selected file path.
- States: loading skeletons, empty messages, inline error banners with retry.

Sub‑tasks
- [x] Implement breadcrumb component and integrate in header.
- [x] Standardize empty/loading/error components for tree and editor.
- [x] Add retry hooks to failed loads.

Test Plan
- Breadcrumbs navigate to parent folders; empty/error states render appropriately.

---

## Story 6.2 — Keyboard Shortcuts
- Global
  - Toggle left sidebar: Ctrl/Cmd+B (already handled)
  - Toggle right sidebar: Ctrl/Cmd+J
  - Save: Ctrl/Cmd+S
- Tree view
  - Up/Down, Left (collapse), Right (expand), Enter (open file)

Sub‑tasks
- [x] Implement right sidebar toggle shortcut.
- [x] Add tree scoped handlers; ensure no conflicts with editor keymaps.
- [x] Document shortcuts in a quick help dialog (optional).

Test Plan
- Shortcuts work and don't interfere with browser defaults unexpectedly.

---

## Story 6.3 — Accessibility & Tooltips
- Ensure all buttons have `aria-label`s or visible names.
- Provide tooltips for icon-only buttons (e.g., sidebar triggers, AI actions).
- Focus management: return focus after modals/dialogs.

Sub‑tasks
- [x] Audit icon buttons and add aria-labels.
- [x] Add tooltips via existing Tooltip component.
- [x] Verify focus-visible styles and outline contrast.

Test Plan
- Keyboard-only navigation is possible; tooltips appear on hover/focus; focus ring visible.

---

## Definition of Done
- Breadcrumbs, shortcuts, and states are implemented and accessible.
- Basic keyboard and screen-reader flows are validated.
