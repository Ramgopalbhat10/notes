# Issue 13 — Clarify Skill Wording for Domain Relevance

## Type
- cleanup

## Status
- resolved

## Related Story
- None

## Description
- The skill docs include wording that is not domain-accurate (for example, "bottleneck" in code health guidance).
- The PR template guidance sentence is awkward and inconsistent across skill docs.

## Root Cause
- Shared copy was reused across files without tailoring terms to each skill's goal.

## Fix / Approach
- Update wording in each affected skill file to match its domain intent.
- Standardize PR template guidance to clear, consistent phrasing.

## Files Changed
- `.agents/skills/code-health/SKILL.md`
- `.agents/skills/performance/SKILL.md`
- `.agents/skills/security/SKILL.md`

## Dev Log

| Date | Unit | Summary |
|---|---|---|
| 2026-02-24 | docs | Opened Issue 13 to align skill wording with domain-specific guidance and standardized PR template phrasing. |
| 2026-02-24 | docs | Updated wording in skill docs for domain relevance and standardized PR template guidance; verified with lint and build. |

## Test Plan
- Review the updated sections in each skill file for clarity and domain relevance.
- Run `pnpm lint`.
- Run `pnpm build`.

## Definition of Done
- Fix verified (lint + build pass).
- Status set to `resolved`.
- Dev Log updated.
- Progress updated in `docs/PROGRESS.md`.

## References
- `.agents/skills/code-health/SKILL.md`
- `.agents/skills/performance/SKILL.md`
- `.agents/skills/security/SKILL.md`
