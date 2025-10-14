import { S3Client } from "@aws-sdk/client-s3";

type S3Config = {
  client: S3Client;
  bucket: string;
  vaultPrefix: string;
};

let cached: S3Config | null = null;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function normalizeVaultPrefix(value: string | undefined): string {
  if (!value) {
    return "";
  }
  let cleaned = value.trim();
  if (!cleaned) {
    return "";
  }
  cleaned = cleaned.replace(/^\/+/, "");
  if (cleaned && !cleaned.endsWith("/")) {
    cleaned = `${cleaned}/`;
  }
  return cleaned;
}

function createConfig(): S3Config {
  const bucket = required("TIGRIS_S3_BUCKET");
  const endpoint = required("TIGRIS_S3_ENDPOINT");
  const region = required("TIGRIS_S3_REGION");
  const accessKeyId = required("TIGRIS_S3_ACCESS_KEY_ID");
  const secretAccessKey = required("TIGRIS_S3_SECRET_ACCESS_KEY");

  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const vaultPrefix = normalizeVaultPrefix(process.env.TIGRIS_S3_PREFIX);

  return { client, bucket, vaultPrefix };
}

function getConfig(): S3Config {
  if (!cached) {
    cached = createConfig();
  }
  return cached;
}

export function getS3Client(): S3Client {
  return getConfig().client;
}

export function getBucket(): string {
  return getConfig().bucket;
}

export function getVaultPrefix(): string {
  return getConfig().vaultPrefix;
}

export function applyVaultPrefix(key: string): string {
  const prefix = getVaultPrefix();
  const cleaned = key.replace(/^\/+/, "");
  return `${prefix}${cleaned}`;
}

export function stripVaultPrefix(key: string): string {
  const prefix = getVaultPrefix();
  if (prefix && key.startsWith(prefix)) {
    return key.slice(prefix.length);
  }
  return key;
}

export function ensureFolderPath(value: string): string {
  if (!value) {
    return value;
  }
  return value.endsWith("/") ? value : `${value}/`;
}
