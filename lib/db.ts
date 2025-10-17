import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

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
