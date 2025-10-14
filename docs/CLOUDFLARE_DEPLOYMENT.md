# Cloudflare Workers Deployment Guide for Next.js Project

This document outlines the steps to deploy this Next.js application to Cloudflare Workers using the OpenNext adapter.

## Overview

The project will be deployed using:
- **@opennextjs/cloudflare**: Adapter to make Next.js compatible with Cloudflare Workers
- **Wrangler**: Cloudflare's CLI tool for deployment
- **Cloudflare Workers**: Serverless platform for hosting the application

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Node.js**: Already installed (required for Next.js)
3. **pnpm**: This project uses pnpm as package manager

## Deployment Steps

### 1. Install Required Dependencies

Install the OpenNext Cloudflare adapter and Wrangler CLI:

```bash
pnpm add @opennextjs/cloudflare@latest
pnpm add -D wrangler@latest
```

### 2. Create Wrangler Configuration

Create a `wrangler.jsonc` file in the project root with:

```jsonc
{
  "main": ".open-next/worker.js",
  "name": "notes-app",
  "compatibility_date": "2025-03-25",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

**Important Notes:**
- `nodejs_compat` flag is **required** for Next.js to work
- Compatibility date must be `2024-09-23` or later
- Update `name` to your desired worker name

### 3. Create OpenNext Configuration

Create an `open-next.config.ts` file in the project root:

```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
```

This file allows you to configure caching and other adapter settings. See [OpenNext Cloudflare documentation](https://opennext.js.org/cloudflare/caching) for advanced options.

### 4. Update package.json Scripts

Add the following scripts to `package.json`:

```json
{
  "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
  "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
  "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
}
```

**Script Descriptions:**
- **preview**: Build and test locally in Workers runtime
- **deploy**: Build and deploy to Cloudflare Workers
- **cf-typegen**: Generate TypeScript types for Cloudflare environment

### 5. Local Development

Continue using the standard Next.js dev server for development:

```bash
pnpm run dev
```

### 6. Test with Cloudflare Adapter

Before deploying, test your app in the Workers runtime locally:

```bash
pnpm run preview
```

This ensures your app works correctly in the Cloudflare Workers environment.

### 7. Authenticate with Cloudflare

First-time setup requires authentication:

```bash
pnpm wrangler login
```

This opens a browser window to authorize Wrangler with your Cloudflare account.

### 8. Deploy to Cloudflare

Deploy your application:

```bash
pnpm run deploy
```

Your app will be deployed to:
- `https://<worker-name>.<your-account>.workers.dev`

### 9. Configure Custom Domain

This project is configured to deploy to **notes.mrgb.in**.

The custom domain is already configured in `wrangler.jsonc`. When you run `pnpm run deploy`, it will automatically deploy to:
- **Primary:** `https://notes.mrgb.in` ✅
- **Fallback:** `https://notes-app.<account>.workers.dev`

**Prerequisites:**
- DNS record for `notes.mrgb.in` must exist (CNAME pointing to your worker or @ as placeholder)
- Domain must be managed in Cloudflare

For detailed custom domain setup instructions, see **[CUSTOM_DOMAIN_SETUP.md](../CUSTOM_DOMAIN_SETUP.md)**

## Environment Variables

**Important:** Do NOT commit your `.env` file. Use Cloudflare secrets instead.

### For Production Deployment (Required)

Use Wrangler CLI to securely set environment variables:

```bash
# Login to Cloudflare
pnpm wrangler login

# Set each secret (you'll be prompted to enter the value)
pnpm wrangler secret put GROQ_API_KEY
pnpm wrangler secret put AWS_ACCESS_KEY_ID
pnpm wrangler secret put AWS_SECRET_ACCESS_KEY

# List all secrets (shows names only, values are encrypted)
pnpm wrangler secret list

# Delete a secret if needed
pnpm wrangler secret delete SECRET_NAME
```

**Alternative:** Use Cloudflare Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **notes-app**
3. Go to **Settings** → **Variables and Secrets**
4. Click **Add variable** (for non-sensitive) or **Add secret** (for sensitive data)

### For Local Development/Preview

Create a `.dev.vars` file in your project root (already in `.gitignore`):

```bash
# .dev.vars - Used only for local preview
GROQ_API_KEY=your_api_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

This file is **NOT deployed** and only used when running `pnpm run preview`.

### Accessing Variables in Code

All environment variables are available via `process.env`:

```typescript
const apiKey = process.env.GROQ_API_KEY;
const awsKey = process.env.AWS_ACCESS_KEY_ID;
```

## Important Notes

### Compatibility

- **Node.js APIs**: Limited support (only what's in `nodejs_compat`)
- **File System**: Not available (use KV, R2, or D1 instead)
- **Server Actions**: Supported
- **Middleware**: Supported
- **ISR/SSG**: Supported with caching
- **Image Optimization**: Use Cloudflare Images

### Build Output

The adapter generates:
- `.open-next/worker.js`: Worker entry point
- `.open-next/assets/`: Static assets directory

Add to `.gitignore`:
```
.open-next/
```

### CI/CD

For automated deployments:

1. **GitHub Actions** example:
```yaml
- name: Deploy to Cloudflare
  run: pnpm run deploy
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

2. **Get API Token**: Cloudflare Dashboard → My Profile → API Tokens → Create Token

## Troubleshooting

### Build Fails
- Ensure compatibility date is `2024-09-23` or later
- Check `nodejs_compat` flag is enabled
- Review build logs for unsupported APIs

### Runtime Errors
- Test with `pnpm run preview` before deploying
- Check Cloudflare Dashboard → Workers → [Your Worker] → Logs
- Use `wrangler tail` for real-time logs

### Performance Issues
- Configure caching in `open-next.config.ts`
- Use Cloudflare CDN for static assets
- Consider KV for frequently accessed data

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [OpenNext Cloudflare Adapter](https://opennext.js.org/cloudflare)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler)
- [Next.js on Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)

## Cost

- **Workers**: 100,000 requests/day free, then $0.50 per million requests
- **Bandwidth**: Free for most usage
- See [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
