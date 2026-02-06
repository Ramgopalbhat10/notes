# Story 13 — Streamdown Markdown Rendering + CDN Images + Streamdown Mermaid Plugin

Goal: Replace `react-markdown` with `streamdown` for markdown rendering while preserving current UX, enabling secure CDN-hosted images, and rendering Mermaid diagrams via Streamdown's Mermaid plugin.

## Scope
-- In: migrate `MarkdownPreview` rendering pipeline to `Streamdown`; preserve existing markdown usage in workspace/public/AI surfaces; add CDN image rendering policy; render fenced `mermaid` blocks with `@streamdown/mermaid`; keep existing editing flows unchanged.
-- Out: image upload/storage workflows, non-markdown binary asset management, Mermaid authoring UI, diagram editing tools, major editor architecture changes.

## Deliverables
- `components/markdown-preview.tsx` uses `Streamdown` as the renderer instead of `ReactMarkdown`.
- Streamdown plugin wiring for Mermaid (`@streamdown/mermaid`) with theme-aware config.
- Markdown image URL policy (allowlist for CDN hosts + protocol validation) applied during markdown render.
- Updated markdown styling for Streamdown output in `app/globals.css`.
- Documentation updates in `README.md` (image host config, mermaid support, markdown rendering notes).
- Dependency updates in `package.json` (`streamdown@2.x`, `@streamdown/mermaid`, `@streamdown/code`; remove old markdown stack when no longer used).

## Acceptance Criteria
- All existing markdown surfaces render correctly after migration:
  - file preview in workspace
  - AI result panel
  - shared/public `/p/...` page
  - any AI response components using `MarkdownPreview`
- Markdown images with allowed CDN URLs render correctly (responsive, lazy loading, no layout breakage).
- Disallowed/unsafe image URLs are blocked and do not render active content.
- Fenced Mermaid blocks (`\`\`\`mermaid`) render via Streamdown Mermaid plugin with graceful fallback behavior.
- Non-Mermaid code blocks and tables keep existing visual quality and behavior.
- No regression in streaming markdown behavior for AI-generated partial output.

---

## Story 13.1 — Streamdown Migration with Backward-Compatible `MarkdownPreview`
- Components
  - `components/markdown-preview.tsx`
  - `components/vault-workspace/index.tsx`
  - `components/vault-workspace/ai-result-panel.tsx`
  - `components/ai-elements/response.tsx`
  - `app/p/[[...path]]/page.tsx`
- Behavior
  - Keep `MarkdownPreview` API stable (`content`, `className`) so call sites remain unchanged.
  - Replace the core renderer with `Streamdown`, preserving current heading/paragraph/table/code styling intent.
  - Support both static and streaming markdown usage without fragmenting component APIs.

Sub-tasks
- [x] Align Streamdown package version with planned API surface (upgrade to `2.x` plugin architecture).
- [x] Replace `ReactMarkdown` usage with `Streamdown` inside `MarkdownPreview`.
- [ ] Port current markdown component overrides (headings, links, blockquote, table wrappers, code styling) to Streamdown-compatible overrides.
- [x] Keep existing code-block copy behavior and language highlighting parity for non-mermaid code blocks.
- [x] Add/verify Streamdown style source integration in global styles (`@source ../node_modules/streamdown/dist/*.js` for Tailwind scanning).
- [x] Remove now-unused `react-markdown`/`remark-gfm`/`rehype-sanitize` logic from `MarkdownPreview`.

Test Plan
- Open a representative markdown file with headings/lists/tables/code and compare before/after visually.
- Validate markdown rendering in workspace, AI result panel, and public share page.
- Verify no hydration/runtime errors in console when toggling preview/edit and switching files.

---

## Story 13.2 — CDN Image Rendering Policy
- Components
  - `components/markdown-preview.tsx`
  - `lib/markdown-image-policy.ts` (new)
  - `next.config.ts` (if we align image host lists for future Next image usage)
  - `README.md`
- Behavior
  - Markdown image syntax (`![alt](https://cdn.example.com/x.png)`) renders for allowlisted hosts only.
  - Block unsafe protocols (`javascript:`, `data:` unless explicitly allowed) and non-allowlisted hosts.
  - Keep rendering resilient when images fail to load (fallback alt text + no UI breakage).

Sub-tasks
- [x] Introduce centralized URL policy helper for markdown asset URLs (protocol + hostname allowlist checks).
- [x] Apply policy via Streamdown URL transform and/or custom image renderer path.
- [x] Add project-level config for allowed markdown image hosts (env-backed list + sane defaults).
- [x] Add responsive image styles for markdown context (`max-width: 100%`, rounded edges, spacing, dark-mode compatibility).
- [x] Document image host configuration and examples in `README.md`.

Test Plan
- Render allowed CDN images (PNG/JPG/SVG/WebP) and verify they display across all markdown surfaces.
- Attempt blocked hosts/protocols and verify content is safely suppressed.
- Validate behavior when CDN returns 403/404/timeout (no unhandled errors, markdown body remains usable).

---

## Story 13.3 — Mermaid Diagrams via `@streamdown/mermaid`
- Components
  - `components/markdown-preview.tsx`
  - `package.json`
- Behavior
  - Render fenced Mermaid blocks through Streamdown plugin-based Mermaid support.
  - Apply theme-aware Mermaid config compatible with current light/dark UI tokens.
  - Keep built-in Mermaid controls (copy/download/fullscreen/pan-zoom) enabled.

Sub-tasks
- [x] Upgrade to `streamdown@2.x` and add `@streamdown/mermaid`.
- [x] Enable plugin wiring in `MarkdownPreview` via `plugins={{ code, mermaid }}`.
- [x] Pass theme-aware Mermaid config through Streamdown `mermaid.config`.
- [x] Enable Mermaid controls (`copy`, `download`, `fullscreen`, `panZoom`).
- [x] Remove custom Mermaid renderer implementation and obsolete dependency.
- [ ] Ensure Mermaid rendering works in both normal note preview and streaming AI output.

Test Plan
- Validate supported Mermaid diagram types used by team docs (flowchart, sequence, state, class, ER at minimum).
- Toggle light/dark mode and confirm diagram readability and contrast.
- Feed malformed Mermaid and confirm graceful fallback without breaking other markdown sections.

---

## Story 13.4 — Cleanup, QA, and Rollout Safety
- Components
  - `package.json`
  - `README.md`
  - markdown render call sites across `components/` and `app/`
- Behavior
  - Minimize regression risk with staged rollout and parity checks.
  - Remove obsolete dependencies only after verifying no remaining imports.

Sub-tasks
- [x] Run dependency cleanup for removed markdown libs after migration (only if no remaining usage).
- [ ] Execute full markdown regression checklist on representative notes (content-heavy, code-heavy, table-heavy, diagram-heavy).
- [ ] Confirm no performance regressions during rapid AI streaming updates.
- [x] Update story docs and architecture notes to reflect Streamdown + Mermaid plugin design decisions.

Test Plan
- `pnpm lint`
- `pnpm build`
- Manual smoke test: open/edit/save note, load public share view, stream AI result with markdown formatting.

---

## Definition of Done
- Streamdown fully replaces `react-markdown` in active markdown rendering paths.
- Markdown images from approved CDN hosts render safely and consistently.
- Mermaid fenced blocks render through Streamdown Mermaid plugin with clear fallback behavior.
- Existing markdown UX quality is preserved or improved across workspace, AI panel, and public reader.
- Docs updated with configuration and usage guidance.

## References
- Streamdown docs: https://streamdown.ai/docs
- Streamdown Mermaid docs: https://streamdown.ai/docs/mermaid
