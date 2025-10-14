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

interface CliOptions {
  dryRun: boolean;
  pretty: boolean;
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
  const options: CliOptions = { dryRun: false, pretty: false };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--dry-run") {
      options.dryRun = true;
    } else if (current === "--pretty") {
      options.pretty = true;
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

async function writeOutput(outFile: string, contents: string) {
  const resolved = path.resolve(process.cwd(), outFile);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, contents, "utf8");
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    verifyRequiredEnvVars();
    const manifest = await generateFileTreeManifest();
    const payload = serializeFileTreeManifest(manifest, options.pretty);

    if (!options.dryRun) {
      const { etag } = await uploadFileTreeManifest(manifest);
      const etagInfo = etag ? `, etag: ${etag}` : "";
      console.log(
        `Uploaded ${FILE_TREE_MANIFEST_FILENAME} with ${manifest.metadata.nodeCount} nodes (checksum: ${manifest.metadata.checksum}${etagInfo})`,
      );
    } else {
      console.log(`Dry run generated manifest with ${manifest.metadata.nodeCount} nodes`);
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
