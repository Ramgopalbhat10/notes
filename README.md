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
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_ALLOWED_LOGIN=
BETTER_AUTH_SECRET=

# Turso (LibSQL) persistence
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
# Legacy aliases also supported: TURSO_DB_URL, TURSO_DB_TOKEN
```

## Install & Run
```bash
pnpm install
pnpm dev
```
Visit http://localhost:3000 – you’ll be redirected to `/files`, which renders the cached tree and workspace.

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

# Build manifest and upload it to S3 as file-tree.json
pnpm tree:refresh
```

The scripts respect the credentials above. `tree:build` is safe to run without network access; `tree:refresh` performs the upload.

### Refreshing at Runtime
- The UI refresh button (in the tree toolbar) triggers `/api/tree/refresh` and hydrates the client when the manifest is ready.
- Server endpoints:
  - `GET /api/tree` – serves the cached manifest with `ETag`/`Cache-Control` headers and schema validation.
  - `POST /api/tree/refresh` – rebuilds the manifest asynchronously and uploads it.
  - `GET /api/tree/status?id=…` – poll job progress.

## Markdown File Fetching & Caching
- `GET /api/fs/file?key=…` streams markdown content from S3 and now honours `If-None-Match` / `If-Modified-Since`, returning 304 when unchanged.
- The editor store keeps a small in-memory cache per document (etag + timestamp) so repeat views reuse the content without flashing.

## Development Notes
- Friendly URLs: `/files/...` render using slugified paths (lowercase, hyphenated, no `.md`). Deep links are resolved back to canonical keys and folders fall back gracefully when empty or missing.
- Manifest validation: every `/api/tree` response is validated against `lib/file-tree-manifest.ts`. Invalid manifests are rejected and never cached.

## Troubleshooting
- **“Missing environment variable”** — ensure the `.env` file lists all S3 credentials before running scripts or server routes.
- **Manifest schema errors** — check the build script output; malformed JSON will be rejected before it reaches clients.
- **Tree shows hidden manifest** — the script automatically omits `file-tree.json`, but confirm it isn’t uploaded inside the vault prefix.

## Scripts Reference
| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js locally |
| `pnpm tree:build` | Build manifest locally (dry-run, writes to `.cache/file-tree/manifest.json`) |
| `pnpm tree:refresh` | Build and upload manifest to S3 |
| `pnpm auth:schema` | Generate/refresh BetterAuth Drizzle schema |
| `pnpm db:generate` | Emit SQL migration files from the current schema |
| `pnpm db:migrate` | Apply pending migrations to the Turso database |
| `pnpm lint` | Run ESLint |

Feel free to explore the rest of the stories in `docs/stories/` to see what’s planned next.
