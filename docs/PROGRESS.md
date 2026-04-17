# Progress

Current issue: `docs/issues/issue-27.md`

Current section: Chore — Update NPM packages (Tier 1+2 safe updates + tooling)

Previous tasks (latest completed batch only):
- [x] Audited all production and dev dependencies for newer versions.
- [x] Applied Tier 1 patch updates (next, react, react-dom, nanoid, zustand, radix-ui, etc.).
- [x] Applied Tier 2 minor updates (aws-sdk, better-auth, streamdown, tailwind-merge, drizzle-orm, etc.).
- [x] Applied Tier 3 tooling updates (dotenv 17, idb 8, lucide-react 1.x, @libsql/client 0.17).
- [x] Reverted TypeScript 6 and ESLint 10 due to ecosystem peer dependency conflicts.
- [x] Fixed dotenv 17 breaking change (quiet defaults to false) in drizzle.config.ts.
- [x] Resolved mermaid version mismatch between @streamdown/mermaid and streamdown via pnpm dedupe.
- [x] Verified lint and build pass.
- [x] Fixed missed dotenv 17 `quiet` breaking change in `scripts/build-file-tree.ts` — replaced `import "dotenv/config"` with explicit `config({ quiet: true })` calls.

Next tasks:
- None - all tasks completed.

Notes:
- Branch: `chore/1776420670-update-npm-packages`
- TypeScript 6 blocked by @typescript-eslint peer dep (<6.0.0).
- ESLint 10 blocked by eslint-plugin-import/react/jsx-a11y peer deps (max ^9).
- Major upgrades deferred to separate PRs: AI SDK 6, BlockNote 0.48, Mantine 9, react-resizable-panels 4.
