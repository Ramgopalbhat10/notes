import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { NextRequest } from "next/server";
import * as schema from "../../drizzle/schema";
import { db } from "../db";

const secretEnv = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "";
const githubClientId = process.env.GITHUB_CLIENT_ID || "";
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET || "";

if (!secretEnv) {
  throw new Error("Missing BETTER_AUTH_SECRET or AUTH_SECRET");
}
if (!githubClientId) {
  throw new Error("Missing GITHUB_CLIENT_ID");
}
if (!githubClientSecret) {
  throw new Error("Missing GITHUB_CLIENT_SECRET");
}

export const auth = betterAuth({
  secret: secretEnv,
  basePath: "/api/auth",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  socialProviders: {
    github: {
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    },
  },
  onAPIError: {
    errorURL: "/auth/error",
  },
});

export async function getApiSession(request: NextRequest) {
  return auth.api.getSession({ headers: request.headers });
}

export async function getServerSession() {
  const { headers } = await import("next/headers");
  return auth.api.getSession({ headers: await headers() });
}

export async function getSession() {
  return getServerSession();
}

const ALLOWED_LOGIN = (process.env.GITHUB_ALLOWED_LOGIN || "").trim().toLowerCase();

function normalizeCandidate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function getUserCandidates(session: any) {
  const user = session?.user ?? {};
  const username = normalizeCandidate(
    user.username ?? (user as Record<string, unknown>)?.login ?? undefined,
  );
  const email = normalizeCandidate(user.email);
  return { username, email };
}

export function isAllowedUser(session: any): boolean {
  if (!ALLOWED_LOGIN) return true;
  const { username, email } = getUserCandidates(session);
  return username === ALLOWED_LOGIN || email === ALLOWED_LOGIN;
}

export async function requireApiUser(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }

  if (!isAllowedUser(session)) {
    return { ok: false as const, status: 403 as const, error: "Access denied" };
  }
  return { ok: true as const, session };
}

export async function requireUser(request: NextRequest) {
  return requireApiUser(request);
}
