# Story 3 — Editor & Preview (Markdown)

Goal: Provide read/write markdown editing with a Preview by default, Edit/Preview toggle, save/autosave, and status indicators.

## Scope
- In: react-markdown preview (GFM + sanitize); CodeMirror editor; toggle; save/autosave; dirty guard; integrate with selected file.
- Out: Advanced plugins (math, diagrams), syntax highlighting (phase 2), collaboration.

## Deliverables
- Main section that renders preview for selected `.md` file by default.
- Edit mode using CodeMirror 6 with markdown language support.
- Header actions: Edit/Preview toggle; AI dropdown present but wired in Story 4.
- Save on Ctrl/Cmd+S and debounced autosave with ETag handling.

## Acceptance Criteria
- Selecting a file loads its content and shows Preview by default.
- Toggle switches modes; only one of Edit or Preview is visible at a time.
- Saving updates ETag; autosave occurs after idle debounce and does not thrash network.
- Unsaved changes prompt on navigation or file switch.

---

## Story 3.1 — Preview: react-markdown
- Components
  - `components/markdown-preview.tsx` using `react-markdown`, `remark-gfm`, `rehype-sanitize`.
- Behavior
  - Receives `content` string; renders markdown; sanitizes raw HTML.

Sub‑tasks
- [x] Install deps: `react-markdown`, `remark-gfm`, `rehype-sanitize`.
- [x] Implement preview component with our Tailwind prose styles (lightweight).
- [x] Wire to selected file state from tree store.

Test Plan
- Render headings, lists, tables, code fences; ensure HTML is sanitized.

---

## Story 3.2 — Editor: CodeMirror
- Components
  - `components/markdown-editor.tsx` using `@uiw/react-codemirror` + `@codemirror/lang-markdown`.
- Behavior
  - Soft wrap; basic keymaps; controlled value from state.
  - Ctrl/Cmd+S triggers save; autosave after 800ms debounce.

Sub‑tasks
- [x] Install deps: `@uiw/react-codemirror`, `@codemirror/lang-markdown`.
- [x] Implement controlled editor with `value`, `onChange`.
- [ ] Add keymap for Ctrl/Cmd+S (prevent default, call save).
- [ ] Debounced autosave with cancellation on rapid edits.

Test Plan
- Typing updates state; save fires on shortcut; autosave fires after idle.

---

## Story 3.3 — Header Actions & Status
- Add small header bar in main section with:
  - Left: Breadcrumb for current file path (basic version).
  - Right: Toggle Edit/Preview; AI dropdown (stub only).
- Status bar (subtle): shows Saved/Saving/Failed with timestamp.

Sub‑tasks
- [x] Implement breadcrumb from `selectedId` path segments.
- [x] Add toggle button reflecting current mode.
- [x] Add status component with states and timestamp.

Test Plan
- Toggle updates mode; status reflects save lifecycle; breadcrumb segments clickable (optional).

---

## Story 3.4 — Integration with API & ETag
- Loading: fetch via `GET /api/fs/file?key=...` on select.
- Saving: call `PUT /api/fs/file` with `ifMatchEtag` when available.
- Conflict: on 409, show modal to resolve (View remote, Keep mine, Cancel) — implement minimal banner for now.

Sub‑tasks
- [x] Load content + ETag on file select and store in editor state.
- [x] Save with ETag; update ETag on success.
- [x] Show conflict message on 409 and stop autosave until resolved.

Test Plan
- Save increments ETag; conflict path displays error and does not overwrite remote.

---

## Definition of Done
- Preview and Editor implemented with a working toggle.
- Content loads from and saves to API with debounced autosave and ETag handling.
- Status and basic conflict UX in place.
