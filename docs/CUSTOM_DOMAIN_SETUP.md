# Custom Domain Setup: notes.mrgb.in

This guide explains how to deploy your Next.js application to your custom subdomain `notes.mrgb.in` on Cloudflare.

## Prerequisites

- ✅ Domain `mrgb.in` is already added to Cloudflare
- ✅ Cloudflare account with access to the domain
- ✅ Wrangler CLI installed and authenticated

## Deployment Methods

There are two ways to deploy to a custom domain on Cloudflare Workers:

### Method 1: Using Routes (Configured in wrangler.jsonc) ⭐ Recommended

This method is already configured in your `wrangler.jsonc`:

```jsonc
{
  "routes": [
    {
      "pattern": "notes.mrgb.in/*",
      "custom_domain": true
    }
  ]
}
```

**Steps:**

1. **Ensure DNS record exists:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Select `mrgb.in`
   - Navigate to **DNS** → **Records**
   - Add a DNS record if not exists:
     - **Type:** `CNAME`
     - **Name:** `notes`
     - **Target:** `@` (or `notes-app.<your-account>.workers.dev` if you know it)
     - **Proxy status:** Proxied (orange cloud) ✅
   
   > **Note:** `<your-account>` is your Cloudflare account subdomain. You can find it by running `pnpm wrangler whoami` or after your first deployment in the output URL.

2. **Deploy your worker:**
   ```bash
   pnpm run deploy
   ```

3. **Wrangler will automatically:**
   - Create the custom domain route
   - Configure SSL certificate
   - Set up the routing

4. **Access your app:**
   - Your app will be available at: `https://notes.mrgb.in`

### Method 2: Using Cloudflare Dashboard (Alternative)

If you prefer to configure through the dashboard:

1. **Deploy your worker first:**
   ```bash
   pnpm run deploy
   ```

2. **Add custom domain via Dashboard:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to **Workers & Pages** → Select **notes-app**
   - Go to **Settings** → **Triggers**
   - Under **Custom Domains**, click **Add Custom Domain**
   - Enter: `notes.mrgb.in`
   - Click **Add Custom Domain**

3. **Cloudflare will automatically:**
   - Create the DNS record
   - Provision SSL certificate
   - Route traffic to your worker

## DNS Configuration Details

### Recommended DNS Setup

For your subdomain `notes.mrgb.in`:

```
Type:   CNAME
Name:   notes
Target: notes-app.<your-account>.workers.dev (or @ as placeholder)
TTL:    Auto
Proxy:  Proxied (✅ Orange cloud)
```

**Important:** Keep the proxy status as "Proxied" (orange cloud) to enable Cloudflare's CDN, DDoS protection, and Workers.

## Verification Steps

1. **Check deployment status:**
   ```bash
   pnpm wrangler deployments list
   ```

2. **Test the custom domain:**
   ```bash
   curl -I https://notes.mrgb.in
   ```

3. **View in browser:**
   Open `https://notes.mrgb.in` in your browser

## Troubleshooting

### Issue: "DNS record not found" or 522 error

**Solution:**
1. Ensure DNS record exists in Cloudflare Dashboard
2. Make sure proxy is enabled (orange cloud)
3. Wait 1-2 minutes for DNS propagation

### Issue: "Custom domain not working"

**Solution:**
1. Verify domain is active in Cloudflare Dashboard
2. Check Workers & Pages → notes-app → Settings → Triggers
3. Ensure custom domain is listed there
4. Try removing and re-adding the custom domain

### Issue: "SSL/TLS certificate error"

**Solution:**
1. Go to Cloudflare Dashboard → SSL/TLS
2. Set SSL/TLS encryption mode to **Full** or **Full (strict)**
3. Wait a few minutes for certificate provisioning

### Issue: "Still seeing workers.dev URL"

**Solution:**
- Custom domains work alongside workers.dev URLs
- Both will be accessible:
  - `https://notes.mrgb.in` ← Your custom domain
  - `https://notes-app.<account>.workers.dev` ← Default workers URL

To disable the workers.dev route, add to `wrangler.jsonc`:
```jsonc
{
  "workers_dev": false
}
```

## Environment-Specific Domains

If you want different domains for staging/production:

### wrangler.jsonc (Production)
```jsonc
{
  "name": "notes-app",
  "routes": [
    {
      "pattern": "notes.mrgb.in/*",
      "custom_domain": true
    }
  ]
}
```

### wrangler.staging.jsonc (Optional Staging)
```jsonc
{
  "name": "notes-app-staging",
  "routes": [
    {
      "pattern": "notes-staging.mrgb.in/*",
      "custom_domain": true
    }
  ]
}
```

Deploy staging with:
```bash
pnpm wrangler deploy --config wrangler.staging.jsonc
```

## Multiple Domains

To serve the app on multiple domains, update routes:

```jsonc
{
  "routes": [
    {
      "pattern": "notes.mrgb.in/*",
      "custom_domain": true
    },
    {
      "pattern": "www.notes.mrgb.in/*",
      "custom_domain": true
    }
  ]
}
```

## Useful Commands

```bash
# Deploy to custom domain
pnpm run deploy

# View deployment logs
pnpm wrangler tail

# List all deployments
pnpm wrangler deployments list

# View custom domain info
pnpm wrangler domains list

# Login to Cloudflare (if needed)
pnpm wrangler login

# View worker routes
pnpm wrangler routes list
```

## SSL/TLS Configuration

Cloudflare automatically provisions SSL certificates for custom domains. Ensure your SSL/TLS settings are correct:

1. **Cloudflare Dashboard** → Domain `mrgb.in` → **SSL/TLS**
2. **Encryption mode:** Set to **Full** or **Full (strict)**
3. **Edge Certificates:** Auto-provisioned (free)
4. **Always Use HTTPS:** Enable (recommended)

## Performance Tips

1. **Enable Caching:** Configure in `open-next.config.ts`
2. **Use Cache API:** For frequently accessed data
3. **Enable HTTP/3:** In Cloudflare Dashboard → Speed → Optimization
4. **Enable Brotli:** For better compression

## Cost

Custom domains on Cloudflare Workers are **free**. You only pay for:
- Worker requests beyond free tier (100,000/day free)
- Additional services (KV, R2, D1) if used

## Next Steps

1. Deploy your app: `pnpm run deploy`
2. Verify at: `https://notes.mrgb.in`
3. Monitor in [Cloudflare Dashboard](https://dash.cloudflare.com)

## Resources

- [Cloudflare Custom Domains Docs](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)
- [Workers Routing](https://developers.cloudflare.com/workers/configuration/routing/)
