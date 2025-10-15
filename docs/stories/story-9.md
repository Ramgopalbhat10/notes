# Story 9 — GitHub OAuth Access Control

Goal: Lock the Notes application behind GitHub OAuth using BetterAuth so only the owner's GitHub account can sign in and call privileged APIs.

## Scope
- In: BetterAuth server setup, GitHub provider wiring, middleware/session checks, protected server actions and API routes, minimal sign-in UI.
- Out: Multi-user support, database persistence of sessions, audit logging, role-based access.

## Deliverables
- Server: BetterAuth instance with GitHub provider limited to a single allowed username/email, catch-all auth route, helpers for session checks.
- Runtime: Middleware that enforces authentication on pages and API routes, returning 401 or redirecting as appropriate.
- Client: Sign-in/out affordances and session awareness for gated UI; docs describing credential setup and environment configuration.

## Acceptance Criteria
- Only the configured GitHub account can sign in; other accounts are denied with a helpful error.
- Unauthenticated requests to protected pages/APIs redirect to sign-in or return 401 JSON.
- Signed-in user can access UI and tree endpoints without extra headers.
- Environment variables documented and validated at runtime.

---

## Story 9.1 — BetterAuth Backend Setup
- API
  - Add `app/api/auth/[...betterauth]/route.ts` forwarding GET/POST to BetterAuth `handleAuth`.
  - Export `auth`, `getSession`, and `requireUser` helpers from `lib/auth/betterauth.ts` for reuse.
- Behavior
  - Initialize BetterAuth with `github()` provider, restricting allowed accounts via `process.env.GITHUB_ALLOWED_LOGIN`.
  - Store no database state; rely on encrypted session cookies with `BETTER_AUTH_SECRET`.
  - Surface clear errors when required env vars are missing at startup.

Steps to obtain GitHub OAuth credentials
1. Navigate to <https://github.com/settings/developers> and click “New OAuth App”.
2. Set application name and homepage URL (use your custom domain or `http://localhost:3000` for development).
3. Configure the Authorization callback URL to `https://<your-vercel-domain>/api/auth/callback/github`; add `http://localhost:3000/api/auth/callback/github` for local development.
4. After creation, copy the Client ID and generate a Client secret. Store them in `.env.local` as `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, and mirror them in Vercel project settings.
5. Record your GitHub login (username or primary email) in `GITHUB_ALLOWED_LOGIN` so BetterAuth denies any other account.

Sub-tasks
- [ ] Install BetterAuth packages and configure env schema for secrets.
- [ ] Implement `lib/auth/betterauth.ts` with GitHub provider and helpers.
- [ ] Add the auth catch-all API route and export GET/POST handlers.

Test Plan
- Missing env vars trigger descriptive errors in logs/build.
- Signing in with the allowed GitHub account succeeds; others receive “Access denied”.
- Callback URL works locally (`localhost:3000`) and on Vercel custom domain.

---

## Story 9.2 — Client & Access Guard
- Middleware
  - Use `middleware.ts` to call BetterAuth session check; redirect unauthenticated page requests to `/auth/sign-in`, return 401 for API calls.
  - Exclude static assets and auth routes from guarding.
- UI
  - Provide a dedicated sign-in screen built with shadcn/ui primitives (`Card`, `CardHeader`, `CardContent`, `Button`, `Separator`) that advertises GitHub OAuth and links to `signIn("github")`.
  - Embed session status in the main layout using shadcn/ui `Avatar`, `Badge`, and `DropdownMenu` components for quick sign-out, account info, and navigation.
  - Display the signed-in GitHub username/email for confirmation; hide gated features until session is ready.
- API Protection
  - Update tree and filesystem routes (`app/api/tree/*`, `app/api/fs/list`) to call `auth()` and verify the GitHub login before performing work.
  - Ensure refresh/status endpoints keep existing secret checks while also requiring the session.

Sub-tasks
- [ ] Implement `middleware.ts` logic with session guard and redirects.
- [ ] Update protected API routes to enforce BetterAuth user checks.
- [ ] Build the shadcn/ui sign-in card/CTA on `/auth/sign-in` and wire it to BetterAuth `signIn("github")`.
- [ ] Add session-aware header/sidebar controls with shadcn/ui `Avatar`, `Badge`, `DropdownMenu`, and `Button` for sign-out.

Test Plan
- Visiting protected pages unauthenticated redirects to sign-in; APIs return 401 JSON.
- Authenticated session grants access across pages and API fetches (e.g., `/api/tree`).
- Sign-out clears session and returns user to sign-in screen; middleware blocks further access.

---

## Definition of Done
- BetterAuth with GitHub OAuth restricts access to the single configured GitHub account.
- Middleware and API guards prevent anonymous or unauthorized usage.
- Documentation covers environment variables and GitHub credential setup for future maintenance.
