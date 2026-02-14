# 2026-02-14-outline-highlight-scroll-ux

- Area: `header`
- Context: Iterated on Story 17 outline click behavior after user feedback on scroll feel and highlight clarity.
- Symptom: Outline navigation sometimes felt animated when instant jump was expected, and block-style highlights looked visually heavy with perceived spacing artifacts.
- Root cause:
  - Scroll behavior can be indirectly influenced by container-level scroll settings and helper APIs if not explicitly normalized at navigation time.
  - Highlight styles that simulate padding/background around headings can read as layout shifts even if technically stable.
- Fix:
  - Force instant scroll for outline navigation by writing `scrollTop` directly on the detected scroll container and temporarily setting container `scroll-behavior` to `auto`.
  - Replace block background highlight with a lightweight pseudo-element underline pulse (`::after`) tied to the existing 2s highlight class lifecycle.
  - Use smooth opacity pulse only (no geometric scaling) to keep underline width stable.
- Guardrails:
  - For deterministic navigation UX, set/restore scroll behavior at the container where scrolling is applied.
  - Prefer pseudo-element overlays for temporary emphasis effects to avoid box-model side effects on content.
  - Keep transient attention effects subtle: animate opacity before animating size/position.
- References:
  - `components/vault-workspace/outline-sidebar.tsx`
  - `app/globals.css`
