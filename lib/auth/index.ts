import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { NextRequest } from "next/server";
import * as schema from "../../drizzle/schema";
import { db } from "../platform/db";
import { AUTH_BYPASS_ENABLED, createAuthBypassSession } from "./config";

const secretEnv = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "";
const githubClientId = process.env.GH_CLIENT_ID || "";
const githubClientSecret = process.env.GH_CLIENT_SECRET || "";

function createConfiguredAuth() {
  if (!secretEnv) {
    throw new Error("Missing BETTER_AUTH_SECRET or AUTH_SECRET");
  }
  if (!githubClientId) {
    throw new Error("Missing GH_CLIENT_ID");
  }
  if (!githubClientSecret) {
    throw new Error("Missing GH_CLIENT_SECRET");
  }

  return betterAuth({
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
}

type BetterAuthInstance = ReturnType<typeof createConfiguredAuth>;

export const auth = AUTH_BYPASS_ENABLED ? null : createConfiguredAuth();

export type AuthSession = Awaited<ReturnType<BetterAuthInstance["api"]["getSession"]>>;

export function isAuthBypassed() {
  return AUTH_BYPASS_ENABLED;
}

export function getAuthBypassSession(): NonNullable<AuthSession> {
  return createAuthBypassSession() as NonNullable<AuthSession>;
}

export async function getApiSession(request: NextRequest) {
  if (AUTH_BYPASS_ENABLED) {
    return getAuthBypassSession();
  }

  if (!auth) {
    return null;
  }
  return auth.api.getSession({ headers: request.headers });
}

export async function getServerSession() {
  if (AUTH_BYPASS_ENABLED) {
    return getAuthBypassSession();
  }

  if (!auth) {
    return null;
  }

  const { headers } = await import("next/headers");
  return auth.api.getSession({ headers: await headers() });
}

export async function getSession() {
  return getServerSession();
}

const ALLOWED_LOGIN = (process.env.GH_ALLOWED_LOGIN || "").trim().toLowerCase();
const INSECURE_ALLOW_ALL = process.env.AUTH_INSECURE_ALLOW_ALL === "true";

type SessionLike =
  | AuthSession
  | {
      user?: Partial<{
        username: string | null;
        login: string | null;
        email: string | null;
      }> | null;
    }
  | null
  | undefined;

function normalizeCandidate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function getUserCandidates(session: SessionLike) {
  const user = session?.user ?? {};
  const usernameField =
    typeof user === "object" && user !== null
      ? (user as { username?: string | null; login?: string | null }).username ??
        (user as { login?: string | null }).login
      : undefined;
  const username = normalizeCandidate(
    usernameField,
  );
  const emailField =
    typeof user === "object" && user !== null
      ? (user as { email?: string | null }).email
      : undefined;
  const email = normalizeCandidate(emailField);
  return { username, email };
}

export function isAllowedUser(session: SessionLike): boolean {
  if (AUTH_BYPASS_ENABLED) return true;
  if (INSECURE_ALLOW_ALL) return true;
  if (!ALLOWED_LOGIN) return false;
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
