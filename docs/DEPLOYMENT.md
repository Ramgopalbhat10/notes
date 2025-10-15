# Deployment — Cloudflare Workers (OpenNext)

A concise guide to preview and deploy this Next.js app to Cloudflare Workers using the OpenNext adapter.

## Requirements
- Node.js 20+, pnpm 10+
- Cloudflare account + Wrangler CLI (`pnpm wrangler --version`)
- S3-compatible bucket (Tigris) credentials

Required environment variables:
```
TIGRIS_S3_ENDPOINT=
TIGRIS_S3_REGION=
TIGRIS_S3_ACCESS_KEY_ID=
TIGRIS_S3_SECRET_ACCESS_KEY=
TIGRIS_S3_BUCKET=
# Optional: scope to a subfolder/prefix inside the bucket
TIGRIS_S3_PREFIX=
# App keys (optional, used by AI features)
GROQ_API_KEY=
AI_MODEL=
```

## One-time setup
```bash
# Authenticate Wrangler
pnpm wrangler login

# (Optional) Local preview vars — not deployed
cat > .dev.vars <<'EOF'
TIGRIS_S3_ENDPOINT=...
TIGRIS_S3_REGION=...
TIGRIS_S3_ACCESS_KEY_ID=...
TIGRIS_S3_SECRET_ACCESS_KEY=...
TIGRIS_S3_BUCKET=...
TIGRIS_S3_PREFIX=
GROQ_API_KEY=
AI_MODEL=
EOF
```

For production, set secrets in Cloudflare (recommended):
```bash
pnpm wrangler secret put TIGRIS_S3_ENDPOINT
pnpm wrangler secret put TIGRIS_S3_REGION
pnpm wrangler secret put TIGRIS_S3_ACCESS_KEY_ID
pnpm wrangler secret put TIGRIS_S3_SECRET_ACCESS_KEY
pnpm wrangler secret put TIGRIS_S3_BUCKET
pnpm wrangler secret put TIGRIS_S3_PREFIX   # optional
pnpm wrangler secret put GROQ_API_KEY       # optional
pnpm wrangler secret put AI_MODEL           # optional
```

## Preview locally (Workers runtime)
```bash
pnpm run preview
# Serves a local Workers instance using OpenNext output
```

## Deploy
```bash
pnpm run deploy
# Publishes the Worker and static assets
```

After deploy, you’ll get:
- workers.dev URL (default)
- any configured custom domains

## Custom domain (notes.mrgb.in)
- The repo is set up to use OpenNext + Wrangler. To use a custom domain:
  - Ensure a DNS CNAME for `notes` exists and is proxied (orange cloud).
  - Add a route with `custom_domain: true` in `wrangler.jsonc`, e.g.:
```jsonc
{
  "routes": [
    { "pattern": "notes.mrgb.in/*", "custom_domain": true }
  ]
}
```
- Redeploy: `pnpm run deploy`.

## File tree manifest (S3)
- Build locally (dry run writes to `/.cache/file-tree/manifest.json`):
```bash
pnpm run tree:build
```
- Upload manifest to the bucket:
```bash
pnpm run tree:refresh
```

## Troubleshooting
- Verify env vars are present in the Worker logs (`pnpm wrangler tail`).
- If listing shows too few objects, confirm `TIGRIS_S3_PREFIX` matches your vault root.
- Test end-to-end in preview before deploying.

## Useful commands
```bash
pnpm run preview     # OpenNext build + local Workers preview
pnpm run deploy      # OpenNext build + deploy to Workers
pnpm wrangler tail   # Live logs
pnpm run tree:build  # Generate manifest locally (dry run)
pnpm run tree:refresh# Generate and upload manifest
```
