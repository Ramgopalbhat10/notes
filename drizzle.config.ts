import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", override: true });
config();

const tursoUrl = process.env.TURSO_DB_URL;
const tursoAuthToken = process.env.TURSO_DB_TOKEN;

if (!tursoUrl) {
  throw new Error("TURSO_DB_URL is required");
}
if (!tursoAuthToken) {
  throw new Error("TURSO_DB_TOKEN is required");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "turso",
  dbCredentials: {
    url: tursoUrl,
    authToken: tursoAuthToken,
  },
});
