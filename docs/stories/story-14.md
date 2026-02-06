# Story 14 — AI Gateway Migration + Dynamic Model Selection

Goal: Migrate AI chat and AI action model calls from Groq-specific provider wiring to Vercel AI Gateway, and drive the sidebar model picker from live AI Gateway language models with Gemini 3 Flash as default.

## Scope
- In: migrate `/api/ai/chat` and `/api/ai/action` to AI Gateway-compatible model selection using AI SDK string model IDs; add dynamic model discovery endpoint for language models; update sidebar model dropdown to consume Gateway model list; set default model to `google/gemini-3-flash`.
- Out: provider routing/fallback policy configuration in Vercel dashboard, advanced model capability filtering UI, token/cost analytics dashboards.

## Deliverables
- `app/api/ai/chat/route.ts` updated to remove Groq provider dependency and use AI Gateway model IDs.
- `app/api/ai/action/route.ts` updated to remove Groq provider dependency and use AI Gateway model IDs.
- New API route for dynamic model discovery from AI Gateway (`/api/ai/models`) returning language models for UI use.
- `components/ai-chat/sidebar-chat.tsx` model selector driven by discovered Gateway models instead of hardcoded lists.
- `stores/chat.ts` default model changed to `google/gemini-3-flash`.
- Dependency and docs cleanup for provider/env changes (`@ai-sdk/groq` removal, env docs alignment).

## Acceptance Criteria
- Chat and action endpoints stream successfully using AI Gateway model IDs without `@ai-sdk/groq`.
- Default model resolves to `google/gemini-3-flash` when request/env model is not provided.
- Sidebar model selector displays available AI Gateway language models grouped cleanly for selection.
- Invalid or unavailable model IDs gracefully fall back to default model behavior.
- Dynamic model discovery endpoint handles upstream Gateway failures with a safe fallback model list.
- Lint/build and manual smoke tests pass after migration.

---

## Story 14.1 — Backend: Migrate AI Routes to AI Gateway
- Components
  - `app/api/ai/chat/route.ts`
  - `app/api/ai/action/route.ts`
  - `lib/ai/models.ts` (new shared defaults/validation helper)
- Behavior
  - Remove Groq provider calls and use AI SDK model string IDs routed through AI Gateway.
  - Preserve existing request/response contracts and streaming behavior.
  - Standardize fallback/default model logic to `google/gemini-3-flash`.

Sub-tasks
- [x] Replace `groq(modelName)` usage with AI Gateway-compatible string model usage in both routes.
- [x] Remove Groq-only env checks and align runtime checks with AI Gateway auth flow.
- [x] Add shared model-id validation and default resolution helper to avoid duplicated logic.
- [x] Keep current context building, truncation, headers, and error handling behavior stable.

Test Plan
- Send chat request with explicit model ID and verify streamed response.
- Send chat/action requests without model and verify default model fallback.
- Send invalid model ID and verify fallback handling without 500 regressions.

---

## Story 14.2 — API: Dynamic Gateway Model Discovery
- Components
  - `app/api/ai/models/route.ts` (new)
  - `lib/ai/models.ts`
- Behavior
  - Fetch models from `https://ai-gateway.vercel.sh/v1/models`.
  - Filter to `type === "language"` for chat picker usage.
  - Return normalized model metadata and deterministic ordering.
  - Return fallback model list if upstream fetch fails.

Sub-tasks
- [x] Implement models route with upstream fetch and language-model filtering.
- [x] Normalize payload shape for client consumption (id, name, provider, limits).
- [x] Add stable sorting/grouping metadata and cache strategy appropriate for frequent UI reads.
- [x] Add resilient fallback response path when Gateway discovery is unavailable.

Test Plan
- Verify route returns only language models and includes `google/gemini-3-flash`.
- Verify route response format remains stable across refreshes.
- Simulate upstream failure and verify fallback payload/HTTP behavior.

---

## Story 14.3 — Client: Sidebar Model Selector from Gateway
- Components
  - `components/ai-chat/sidebar-chat.tsx`
  - `stores/chat.ts`
- Behavior
  - Replace hardcoded model groups with data fetched from `/api/ai/models`.
  - Keep selected model persistent via chat store.
  - Ensure invalid/stale selected model resets to default.
  - Keep existing chat transport request shape unchanged (`model` passed in body).

Sub-tasks
- [x] Remove hardcoded `MODEL_GROUPS` and fetch model list from new API route.
- [x] Group and render model options by provider in existing `Select` UI.
- [x] Set and persist default store model as `google/gemini-3-flash`.
- [x] Handle loading/error states for model list without blocking chat usage.

Test Plan
- Confirm dropdown options populate from API response, not static constants.
- Confirm default selected option is Gemini 3 Flash on fresh session.
- Change model and verify selected ID is sent in outgoing chat request payload.

---

## Story 14.4 — Cleanup, Env, and Docs
- Components
  - `package.json`
  - `pnpm-lock.yaml`
  - `README.md`
  - `docs/stories/README.md`
- Behavior
  - Remove obsolete Groq dependency and references.
  - Document AI Gateway env setup and model defaults.
  - Keep story index updated for discoverability.

Sub-tasks
- [x] Remove `@ai-sdk/groq` from dependencies and refresh lockfile.
- [x] Update docs to reference `AI_GATEWAY_API_KEY` and Gateway model ID format.
- [x] Add Story 14 entry to story index.
- [x] Run lint/build smoke checks and capture any migration caveats.

Test Plan
- Verify dependency graph no longer includes `@ai-sdk/groq`.
- Verify docs examples/environment guidance reflect AI Gateway setup.
- Verify story index links to `docs/stories/story-14.md`.

---

## Definition of Done
- Both AI server routes are provider-agnostic and running through AI Gateway model IDs.
- Sidebar model picker is dynamically sourced from AI Gateway language models.
- Gemini 3 Flash is the default model across backend fallback and frontend store defaults.
- Groq-specific package/env assumptions are removed from active implementation paths.
- Story documentation and index are updated and aligned with implementation plan.

## References
- https://vercel.com/docs/ai-gateway
- https://vercel.com/docs/ai-gateway/models-and-providers
- https://vercel.com/docs/ai-gateway/authentication-and-byok/authentication
- https://ai-gateway.vercel.sh/v1/models
