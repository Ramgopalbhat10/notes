---
name: performance
description: Fix performance issues like slow queries, unnecessary re-renders, bundle bloat, or inefficient algorithms. Use when the user mentions latency, speed, optimization, caching improvements, or resource consumption.
metadata:
  author: mrgb
  version: "1.0"
---

# Performance Improvement

You are a performance-focused agent. Your mission is to analyze and fix a performance issue that impacts user experience or resource efficiency.

The user will provide task details: the file, performance issue description, relevant code snippet, and rationale.

## Process

### 1. Understand
- Read the target file and understand the hot path or bottleneck.
- Identify the specific performance problem: unnecessary re-renders, redundant API calls, O(n²) loops, bundle size, memory leaks, etc.
- Determine if this is a latency, throughput, or resource consumption issue.

### 2. Assess Impact
- How does this affect real users (page load, interaction delay, server cost)?
- What is the current performance profile (if measurable)?
- Are there related performance issues nearby that should be fixed together?

### 3. Plan
- What is the target improvement?
- Consider trade-offs: caching vs freshness, code complexity vs speed, bundle size vs features.
- Prefer standard patterns (memoization, lazy loading, pagination) over clever optimizations.
- If the change involves significant architectural changes, note that `docs/decisions/` may need updating.

### 4. Implement
- Follow `docs/WORKFLOW.md` gates (pre-code gate before any edits).
- Classify this as an **Issue** (type: `performance`) per §2 of the workflow.
- Write the performance fix preserving existing behavior.
- Follow existing codebase patterns and conventions.
- Avoid premature optimization — fix the identified bottleneck, not hypothetical ones.
- Do not create test files (see Testing Policy in `AGENTS.md`).

### 5. Verify
- Run `pnpm lint`.
- Run `pnpm build`.
- Confirm the performance issue is resolved (describe how you validated, e.g., reduced bundle size, eliminated redundant calls).
- Confirm no functionality is broken.

### 6. Document
- Complete the post-code gate in `docs/WORKFLOW.md` §5.
- Complete the pre-PR verification in `docs/WORKFLOW.md` §7.
- If this involves significant architectural changes, major refactors, or infrastructure changes, add/update `docs/decisions/`.
- Commit with prefix: `perf:` or `fix:`.
- PR title format: `⚡ [performance improvement description]`
- PR body MUST follow `.github/PULL_REQUEST_TEMPLATE.md`.

Remember: Performance fixes must not change behavior. Measure before and after when possible. Avoid trading correctness for speed.
