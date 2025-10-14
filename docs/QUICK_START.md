# Quick Start Guide - Deploying to notes.mrgb.in

## Prerequisites Checklist

- [x] Dependencies installed (`@opennextjs/cloudflare` and `wrangler`)
- [ ] Cloudflare account authenticated
- [ ] Environment variables configured
- [ ] DNS record for `notes.mrgb.in` created

---

## Step 1: Authenticate with Cloudflare

```bash
pnpm wrangler login
```

This opens your browser to authorize Wrangler with your Cloudflare account.

---

## Step 2: Set Environment Variables (Secrets)

**⚠️ Important:** Do NOT deploy with your `.env` file!

Set each secret securely:

```bash
# You'll be prompted to enter each value
pnpm wrangler secret put GROQ_API_KEY
pnpm wrangler secret put AWS_ACCESS_KEY_ID
pnpm wrangler secret put AWS_SECRET_ACCESS_KEY
```

Add any other environment variables your app needs.

**Verify secrets:**
```bash
pnpm wrangler secret list
```

---

## Step 3: Create DNS Record (One-time)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select domain: **mrgb.in**
3. Navigate to **DNS** → **Records**
4. Add CNAME record:
   - **Type:** `CNAME`
   - **Name:** `notes`
   - **Target:** `@`
   - **Proxy status:** ✅ Proxied (orange cloud)
5. Click **Save**

---

## Step 4: Deploy!

```bash
pnpm run deploy
```

**Expected Output:**
```
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Uploaded notes-app (X.XX sec)
Published notes-app (X.XX sec)
  https://notes.mrgb.in (custom domain)
  https://notes-app.<your-account>.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## Step 5: Verify

Open in your browser:
- **Production:** https://notes.mrgb.in
- **Workers.dev:** https://notes-app.\<account\>.workers.dev

---

## FAQ

### Q: What is `<account>` in the workers.dev URL?

**A:** It's your Cloudflare account subdomain, automatically assigned to your account.

**Find it by:**
1. Running: `pnpm wrangler whoami`
2. After first deployment, check the output URL
3. In Cloudflare Dashboard → Workers & Pages → (any worker) → Preview URL

### Q: Where do I add environment variables?

**A:** Use Wrangler CLI (recommended):
```bash
pnpm wrangler secret put YOUR_SECRET_NAME
```

**Or** via Cloudflare Dashboard:
1. Workers & Pages → **notes-app**
2. Settings → **Variables and Secrets**
3. Add variable or secret

### Q: What about local development?

**A:** Create a `.dev.vars` file (already in `.gitignore`):
```
GROQ_API_KEY=your_local_api_key
AWS_ACCESS_KEY_ID=your_local_aws_key
AWS_SECRET_ACCESS_KEY=your_local_aws_secret
```

Then run:
```bash
pnpm run preview
```

### Q: How do I update environment variables?

**A:** Just run the secret command again with the new value:
```bash
pnpm wrangler secret put GROQ_API_KEY
# Enter new value when prompted
```

### Q: Can I use a different domain?

**A:** Yes! Edit `wrangler.jsonc`:
```jsonc
"routes": [
  {
    "pattern": "your-domain.com/*",
    "custom_domain": true
  }
]
```

---

## Useful Commands

```bash
# Deploy to production
pnpm run deploy

# Test locally in Workers runtime
pnpm run preview

# View real-time logs
pnpm wrangler tail

# List all deployments
pnpm wrangler deployments list

# List all secrets
pnpm wrangler secret list

# Check account info
pnpm wrangler whoami

# Generate TypeScript types for Cloudflare env
pnpm run cf-typegen
```

---

## Troubleshooting

### Issue: "Not authenticated"
**Solution:** Run `pnpm wrangler login`

### Issue: "Custom domain not working"
**Solution:**
1. Verify DNS record exists (CNAME for `notes`)
2. Ensure proxy is enabled (orange cloud)
3. Wait 1-2 minutes for DNS propagation

### Issue: "Environment variables undefined"
**Solution:**
1. Check: `pnpm wrangler secret list`
2. Re-add missing secrets: `pnpm wrangler secret put SECRET_NAME`

### Issue: "Build failed"
**Solution:**
1. Ensure compatibility date is 2024-09-23 or later in `wrangler.jsonc`
2. Check `nodejs_compat` flag is enabled
3. Review error logs

---

## Next Steps

1. ✅ Deploy: `pnpm run deploy`
2. 🔍 Monitor: [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages
3. 📊 View logs: `pnpm wrangler tail`
4. 🚀 Iterate: Make changes, commit, and redeploy

---

## Documentation

- **Deployment Guide:** [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md)
- **Custom Domain Setup:** [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md)
- **Cloudflare Docs:** [developers.cloudflare.com](https://developers.cloudflare.com/workers/)
