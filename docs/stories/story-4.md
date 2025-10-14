# Story 4 — AI Actions (Improve, Summarize, Expand)

Goal: Provide one-click AI actions on the current document with streamed results and simple apply/copy UX using the Groq provider through the Vercel AI SDK.

## Scope
- In: `/api/ai/action` using Vercel AI SDK with the Groq provider; client dropdown with three actions; streamed output panel with apply/copy.
- Out: Complex prompt chaining, settings UI, history of actions (future).

## Deliverables
- Server endpoint `/api/ai/action` with Groq-backed action routing and prompt templates.
- Client dropdown in main header invoking the endpoint with current content (or selection).
- Result view with: copy to clipboard, insert/replace in editor.
- Modular workspace structure (AI session hook, header/status/result components) enabling reuse.

## Acceptance Criteria
- Actions stream tokens to client; user sees progressive result.
- Applying result inserts/updates the editor content correctly.
- Errors are displayed and recoverable.

---

## Story 4.1 — API: `/api/ai/action`
- Env
  - `AI_MODEL` (e.g., `llama3-70b-8192`) and `GROQ_API_KEY` configured per Vercel AI SDK Groq docs.
- Request body
  - `{ action: 'improve' | 'summarize' | 'expand', content: string, selection?: string }`
- Behavior
  - Compose concise system prompt; include `selection` if provided else full `content`.
  - Instantiate the Groq model via `@ai-sdk/groq` and stream text back using the Vercel AI SDK response helper.

Sub-tasks
- [x] Install `ai` SDK and Groq provider dependency (`@ai-sdk/groq`).
- [x] Implement route with streaming, basic rate limiting, and reusable prompt helpers.
- [x] Clamp input size; truncate to safe token window with an indicator header (`x-ai-input-truncated`).

Test Plan
- Each action returns coherent text; long content is handled with truncation.
- Network errors return 5xx with JSON error body.

---

## Story 4.2 — Client: Actions Dropdown & Result Panel
- UI
  - Dropdown in main header: Improve Writing, Summarize, Expand.
  - When clicked, call API with current file content and optional selection (if in Edit mode).
  - Show streaming result in a small panel/modal with buttons: Apply (Replace selection or Insert), Copy.

Sub‑tasks
- [x] Add dropdown component and wire up click handlers (icon-only actions in responsive header).
- [x] Implement streaming consumption via reusable AI session hook with incremental updates.
- [x] Implement apply handlers for selection and non‑selection paths (replace/insert helpers).
- [x] Copy to clipboard action from AI result panel.
- [x] Collapse workspace logic into modular components (`useAiSession`, `AiResultPanel`, `WorkspaceHeader`, `WorkspaceStatusBar`).

Test Plan
- Streaming renders progressively; Apply mutates editor content as expected; Copy works.
- Responsive header shows breadcrumb + icons correctly on mobile/desktop; chat toggle opens sidebar.

---

## Definition of Done
- API and client dropdown working end‑to‑end with streaming.
- Results can be applied or copied; error cases handled gracefully.
