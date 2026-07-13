import { createRequire } from "node:module";
import type { Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

/**
 * Use createRequire instead of a static ESM import so that Turbopack does
 * not bundle @libsql/client into a hashed server chunk (e.g.
 * "@libsql/client-bc2a1f2e4d569585") that Node cannot resolve at runtime.
 * Node resolves the package from node_modules at call time instead.
 */
const require = createRequire(import.meta.url);

function requireEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }
  const [first] = names;
  throw new Error(`Missing environment variable: ${first}`);
}

function optionalEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }
  return undefined;
}

const tursoUrl = requireEnv("TURSO_DATABASE_URL", "TURSO_DB_URL");
const tursoAuthToken = optionalEnv("TURSO_DB_TOKEN", "TURSO_AUTH_TOKEN");

let client: Client | null = null;

export function getTursoClient(): Client {
  if (!client) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client") as typeof import("@libsql/client");
    client = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
  }
  return client;
}

export const db = drizzle(getTursoClient());
