# Personal Notes — Markdown Vault

A Next.js playground that explores a cached file-tree backed by S3 (Tigris) with rich editing UX. The app hydrates a prebuilt manifest (`file-tree.json`) from your bucket, renders it instantly on the client, and lazily loads markdown files as you select them.

## Prerequisites
- Node.js 20+
- pnpm 10+
- Access to an S3-compatible bucket (Tigris) with credentials exposed in `.env`

Required environment variables:
```
TIGRIS_S3_ENDPOINT=
TIGRIS_S3_REGION=
TIGRIS_S3_ACCESS_KEY_ID=
TIGRIS_S3_SECRET_ACCESS_KEY=
TIGRIS_S3_BUCKET=
# Optional bucket prefix (e.g. "vault/")
TIGRIS_S3_PREFIX=

# BetterAuth GitHub OAuth
GH_CLIENT_ID=
GH_CLIENT_SECRET=
GH_ALLOWED_LOGIN=
BETTER_AUTH_SECRET=

# Turso (LibSQL) persistence
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
# Legacy aliases also supported: TURSO_DB_URL, TURSO_DB_TOKEN

# Upstash Redis (optional but recommended for shared manifest cache)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# AI Gateway (used by /api/ai/chat and /api/ai/action)
AI_GATEWAY_API_KEY=
# Optional model overrides (defaults to google/gemini-3-flash)
AI_MODEL=
AI_CHAT_MODEL=

# Optional: allowlist of CDN hosts for markdown images
# Comma-separated hostnames, e.g. "cdn.example.com,images.example.org"
NEXT_PUBLIC_MARKDOWN_IMAGE_HOSTS=

# Optional: enable PWA service worker registration in `pnpm dev`
# In production builds, PWA registration is enabled automatically.
NEXT_PUBLIC_ENABLE_PWA_IN_DEV=false
```

## Install & Run
```bash
pnpm install
pnpm hooks:install
pnpm dev
```
Visit http://localhost:3000 – you’ll be redirected to `/files`, which renders the cached tree and workspace.

## Workflow Enforcement Hooks
- This repo ships repository-managed hooks in `.githooks/`.
- Run `pnpm hooks:install` once per clone to activate strict local workflow checks.
- Active local gates:
  - `pre-commit`: enforces workflow documentation updates for implementation changes.
  - `commit-msg`: enforces Conventional Commits (`feat|fix|refactor|docs|chore`).
  - `pre-push`: runs workflow docs gate + `pnpm lint` + `pnpm build`.
- Non-bypassable enforcement also runs in CI on pull requests to `main`.

### GitHub Actions Secrets (Repo-Only)
The `workflow-gates` CI job runs `pnpm build`, so GitHub Actions must have the same required env vars that exist locally.

Where to add (this repository only):
1. Open the repo on GitHub: `Ramgopalbhat10/notes`.
2. Go to `Settings` → `Secrets and variables` → `Actions`.
3. Under `Repository secrets`, click `New repository secret`.
4. Add each secret below (name must match exactly):

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `TIGRIS_S3_ENDPOINT`
- `TIGRIS_S3_REGION`
- `TIGRIS_S3_ACCESS_KEY_ID`
- `TIGRIS_S3_SECRET_ACCESS_KEY`
- `TIGRIS_S3_BUCKET`
- `TIGRIS_S3_PREFIX` (optional; set to empty string if unused)
- `GH_CLIENT_ID`
- `GH_CLIENT_SECRET`
- `GH_ALLOWED_LOGIN`
- `BETTER_AUTH_SECRET`
- `AI_GATEWAY_API_KEY`

After saving secrets, re-run the failed `workflow-gates` job from the PR checks page.

### Database & Auth Setup

BetterAuth now persists users, sessions, accounts, and verification tokens in Turso via Drizzle ORM. After configuring the environment variables above:

```bash
# Regenerate the BetterAuth Drizzle schema (writes to drizzle/schema.ts)
pnpm auth:schema

# Generate SQL migrations from the current schema definition
pnpm db:generate

# Apply migrations to Turso (requires a valid TURSO token with write access)
pnpm db:migrate
```

If `pnpm db:migrate` fails with a 401, double-check the `TURSO_AUTH_TOKEN`/`TURSO_DB_TOKEN` value or regenerate a fresh auth token from the Turso dashboard.

## Working With the Cached File Tree
The app never walks S3 directly on boot. Instead it expects a manifest JSON at the bucket root:

- **`file-tree.json`** — contains node ids, paths, metadata, and IDs for root nodes.

### Build / Upload the Manifest
We ship helpers that reuse the same logic in production:

```bash
# Generate manifest locally and write to .cache/file-tree/manifest.json (dry-run, pretty)
pnpm tree:build

# Build manifest, upload to S3 and sync to Redis (pass --push-redis to update Upstash)
pnpm tree:refresh -- --push-redis
```

`tree:build` is safe to run without network access. When the `--push-redis` flag is present, the script expects `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` and writes the manifest payload to the shared cache after uploading to S3.

### Refreshing at Runtime
- The UI refresh button (in the tree toolbar) triggers `/api/tree/refresh` and hydrates the client when the manifest is ready.
- Server endpoints:
  - `GET /api/tree` – serves the cached manifest with `ETag`/`Cache-Control` headers and schema validation.
  - `POST /api/tree/refresh` – rebuilds the manifest asynchronously and uploads it.
  - `GET /api/tree/status?id=…` – poll job progress.

### Redis Cache Operations
- Inspect the cached manifest:
  ```bash
  curl "$UPSTASH_REDIS_REST_URL/file-tree:manifest" \\
    -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
  ```
- Purge the cached manifest (forces the next request to seed from S3):
  ```bash
  curl -X DELETE "$UPSTASH_REDIS_REST_URL/file-tree:manifest" \\
    -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
  ```
- Use `pnpm tree:refresh -- --push-redis` in CI after uploading a new manifest so all regions share the latest tree immediately.

## Markdown File Fetching & Caching
- `GET /api/fs/file?key=…` streams markdown content from S3 and now honours `If-None-Match` / `If-Modified-Since`, returning 304 when unchanged.
- The editor store keeps a small in-memory cache per document (etag + timestamp) so repeat views reuse the content without flashing.

## Markdown Rendering
- Markdown previews now render through `streamdown` (streaming-friendly markdown renderer).
- Mermaid fenced blocks (`\`\`\`mermaid`) are rendered with `@streamdown/mermaid`.
- Markdown images are restricted to:
  - relative URLs (same-origin assets), and
  - HTTPS hosts listed in `NEXT_PUBLIC_MARKDOWN_IMAGE_HOSTS`.
- If `NEXT_PUBLIC_MARKDOWN_IMAGE_HOSTS` is omitted, the default allowlist is:
  - `avatars.githubusercontent.com`
  - `nordicapis.com` (includes `www.nordicapis.com`)

## PWA Support
- The app is installable as a Progressive Web App using native Next.js file conventions.
- Included in v1:
  - `GET /manifest.webmanifest` via `app/manifest.ts`
  - installable icon assets in `public/`
  - minimal service worker at `public/sw.js` with lifecycle-only behavior
  - service worker registration from root layout
  - dev toggle via `NEXT_PUBLIC_ENABLE_PWA_IN_DEV=true` when validating installability locally
- Intentionally excluded in v1:
  - offline caching for authenticated API/data routes
  - runtime fetch interception strategies
  - background sync/push messaging flows
- To extend behavior later, add cache/fetch logic in `public/sw.js`.

## Development Notes
- Friendly URLs: `/files/...` render using slugified paths (lowercase, hyphenated, no `.md`). Deep links are resolved back to canonical keys and folders fall back gracefully when empty or missing.
- Manifest validation: every `/api/tree` response is validated against `lib/file-tree-manifest.ts`. Invalid manifests are rejected and never cached.

## Troubleshooting
- **“Missing environment variable”** — ensure the `.env` file lists all S3 credentials before running scripts or server routes.
- **Manifest schema errors** — check the build script output; malformed JSON will be rejected before it reaches clients.
- **Tree shows hidden manifest** — the script automatically omits `file-tree.json`, but confirm it isn’t uploaded inside the vault prefix.
- **Redis not updating** — re-run `pnpm tree:refresh -- --push-redis` and verify the Upstash entry with the commands above.

## Deployment Notes
- Add `.cache/file-tree/` to your deploy ignore list; the manifest should be sourced from S3/Redis rather than bundled artifacts.
- In CI/CD, run `pnpm tree:refresh -- --push-redis` after syncing vault changes so every edge instantly shares the updated manifest.

## Scripts Reference
| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js locally |
| `pnpm hooks:install` | Configure git to use repository hooks from `.githooks/` |
| `pnpm workflow:check-docs` | Validate workflow docs requirements against branch diff |
| `pnpm workflow:check-docs:staged` | Validate workflow docs requirements for staged files |
| `pnpm workflow:check-commit-msg -- <path>` | Validate Conventional Commit format from commit message file |
| `pnpm tree:build` | Build manifest locally (dry-run, writes to `.cache/file-tree/manifest.json`) |
| `pnpm tree:refresh [-- --push-redis]` | Build and upload manifest to S3, optionally syncing to Redis |
| `pnpm auth:schema` | Generate/refresh BetterAuth Drizzle schema |
| `pnpm db:generate` | Emit SQL migration files from the current schema |
| `pnpm db:migrate` | Apply pending migrations to the Turso database |
| `pnpm lint` | Run ESLint |

Feel free to explore the rest of the stories in `docs/stories/` to see what’s planned next.
