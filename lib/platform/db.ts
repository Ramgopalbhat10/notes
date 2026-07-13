import { createClient, type Client } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";

/**
 * Shared Turso/Drizzle client used by auth and app tables (same `db` export).
 *
 * On Vercel we use the HTTP `/web` entries — Turso's serverless client — not
 * the Node entry with native bindings. Pair with `transpilePackages` for
 * `@libsql/client` in next.config.ts so Turbopack bundles it instead of
 * emitting a broken hashed external (`@libsql/client-<hash>`).
 */
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
    client = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
  }
  return client;
}

export const db = drizzle(getTursoClient());
