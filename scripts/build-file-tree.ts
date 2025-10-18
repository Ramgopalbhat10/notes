import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { FILE_TREE_MANIFEST_FILENAME } from "@/lib/file-tree-manifest";
import {
  generateFileTreeManifest,
  serializeFileTreeManifest,
  uploadFileTreeManifest,
} from "@/lib/file-tree-builder";
import { writeManifestToRedis } from "@/lib/manifest-store";

interface CliOptions {
  dryRun: boolean;
  pretty: boolean;
  pushRedis: boolean;
  outFile?: string;
}

const REQUIRED_ENV_VARS = [
  "TIGRIS_S3_ENDPOINT",
  "TIGRIS_S3_REGION",
  "TIGRIS_S3_ACCESS_KEY_ID",
  "TIGRIS_S3_SECRET_ACCESS_KEY",
  "TIGRIS_S3_BUCKET",
];

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false, pretty: false, pushRedis: false };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--dry-run") {
      options.dryRun = true;
    } else if (current === "--pretty") {
      options.pretty = true;
    } else if (current === "--push-redis") {
      options.pushRedis = true;
    } else if (current === "--out" || current === "-o") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("Missing value for --out");
      }
      options.outFile = next;
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${current}`);
    }
  }
  return options;
}

function verifyRequiredEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missing.length > 0) {
    const formatted = missing.join(", ");
    throw new Error(
      `Missing required S3 environment variables: ${formatted}. ` +
        "Ensure they're exported in your shell or defined in .env before running tree:refresh.",
    );
  }
}

function ensureRedisEnv() {
  const required = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
  const missing = required.filter((key) => {
    const value = process.env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
  if (missing.length > 0) {
    throw new Error(
      `Cannot push manifest to Redis. Missing environment variables: ${missing.join(", ")}. ` +
        "Provide Upstash credentials or omit --push-redis.",
    );
  }
}

async function writeOutput(outFile: string, contents: string) {
  const resolved = path.resolve(process.cwd(), outFile);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, contents, "utf8");
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    verifyRequiredEnvVars();
    if (options.pushRedis) {
      ensureRedisEnv();
    }
    const manifest = await generateFileTreeManifest();
    const payload = serializeFileTreeManifest(manifest, options.pretty);
    let uploadedEtag: string | undefined;

    if (!options.dryRun) {
      const { etag } = await uploadFileTreeManifest(manifest);
      uploadedEtag = etag ?? undefined;
      const etagInfo = uploadedEtag ? `, etag: ${uploadedEtag}` : "";
      console.log(
        `Uploaded ${FILE_TREE_MANIFEST_FILENAME} with ${manifest.metadata.nodeCount} nodes (checksum: ${manifest.metadata.checksum}${etagInfo})`,
      );
    } else {
      console.log(`Dry run generated manifest with ${manifest.metadata.nodeCount} nodes`);
    }

    if (options.pushRedis) {
      const canonicalPayload = serializeFileTreeManifest(manifest);
      await writeManifestToRedis({
        body: canonicalPayload,
        metadata: manifest.metadata,
        etag: uploadedEtag,
        updatedAt: new Date().toISOString(),
      });
      console.log("Synced manifest to Upstash Redis");
    }

    if (options.outFile) {
      await writeOutput(options.outFile, payload);
      console.log(`Wrote manifest to ${options.outFile}`);
    }

    if (options.dryRun && !options.outFile) {
      console.log(payload);
    }
  } catch (error) {
    console.error("Failed to build file tree manifest", error);
    process.exitCode = 1;
  }
}

void main();
