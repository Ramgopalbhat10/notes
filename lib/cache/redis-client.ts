import { Redis } from "@upstash/redis";

let client: Redis | null = null;

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} must be set to use Upstash Redis`);
  }
  return value;
}

export function getRedisClient(): Redis {
  if (!client) {
    const url = getEnv("UPSTASH_REDIS_REST_URL");
    const token = getEnv("UPSTASH_REDIS_REST_TOKEN");
    client = new Redis({ url, token });
  }
  return client;
}
