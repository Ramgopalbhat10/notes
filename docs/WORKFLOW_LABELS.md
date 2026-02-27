# Workflow Labels

Prefix requests with `[label]` to control which workflow phases execute.

## Label → Phase Map

| Label | Runs | Gap-fills before? |
|---|---|---|
| `[ask]` | Answer only — no files loaded, no workflow | — |
| *(none, conversational)* | Answer only — same as `[ask]` | — |
| *(none, implementation)* | All 9 phases in order | — |
| `[code-only]` | §4 Implementation only | No |
| `[docs-only]` | §2 Route & Document only | No |
| `[quality]` | §6 Quality Gate only | No |
| `[commit]` | §7 Commit | Yes — §2, §3, §5, §6 if incomplete |
| `[push]` | §9 PR Creation | Yes — all incomplete phases |

## Phases (from `docs/WORKFLOW.md`)

1. *(Mode — always applies)*
2. **Route & Document** — classify, create story/issue file, update index, reset PROGRESS.md
3. **Pre-Code Gate** — review learnings/decisions, verify/create branch
4. **Implementation** — write/modify source code
5. **Post-Code Gate** — update subtasks, Dev Log, PROGRESS.md, cross-refs
6. **Quality Gate** — `pnpm lint`, `pnpm build`, delete test files
7. **Commit** — conventional commit on feature/fix branch, never `main`
8. **Pre-PR Verification** — verify all checklist items, diff review
9. **PR Creation** — create PR via template, do not merge

## Gap-Fill Rules

- `[commit]`: auto-runs §2, §3, §5, §6 (in order) if not already done, then commits.
- `[push]`: auto-runs ALL incomplete phases in order, then creates PR.
- Block PR creation if any required phase is incomplete — list what's missing.
- If a dependency cannot be resolved (e.g. no code exists to commit), warn and halt.
