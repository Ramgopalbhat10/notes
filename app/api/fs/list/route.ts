import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import {
  applyVaultPrefix,
  ensureFolderPath,
  getBucket,
  getS3Client,
  stripVaultPrefix,
} from "@/lib/s3";

export const runtime = "nodejs";

const INVALID_PREFIX_PATTERN = /(^|\/)\.\.(\/|$)/;

function normalizeRequestPrefix(input: string | null): string {
  if (!input) {
    return "";
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("/")) {
    throw new Error("Prefix must be relative to the vault root");
  }
  if (trimmed.includes("\\")) {
    throw new Error("Prefix must use '/' as a separator");
  }
  if (INVALID_PREFIX_PATTERN.test(trimmed)) {
    throw new Error("Prefix cannot contain '..'");
  }
  return ensureFolderPath(trimmed);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  let prefix: string;
  try {
    prefix = normalizeRequestPrefix(url.searchParams.get("prefix"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid prefix" },
      { status: 400 },
    );
  }

  const continuationToken = url.searchParams.get("continuationToken") ?? undefined;

  const client = getS3Client();
  const bucket = getBucket();
  const listPrefix = applyVaultPrefix(prefix);

  try {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: listPrefix,
        Delimiter: "/",
        ContinuationToken: continuationToken,
      }),
    );

    const folderSet = new Set<string>();

    // From CommonPrefixes
    (response.CommonPrefixes ?? [])
      .map((entry) => entry.Prefix)
      .filter((value): value is string => Boolean(value))
      .forEach((value) => {
        const relative = stripVaultPrefix(value);
        const name = relative.slice(prefix.length) || relative;
        if (name) folderSet.add(name);
      });

    // From folder markers in Contents (providers may store a zero-byte object instead of returning CommonPrefixes)
    (response.Contents ?? []).forEach((object) => {
      const key = object.Key ?? "";
      if (!key) return;
      const relative = stripVaultPrefix(key);
      if (!relative) return;
      if (prefix && !relative.startsWith(prefix)) return;
      const remainder = relative.slice(prefix.length);
      if (!remainder || remainder.includes("/")) return;
      const isMarkdown = remainder.toLowerCase().endsWith(".md");
      const isFolderMarker = key.endsWith("/") || (object.Size ?? 0) === 0;
      if (!isMarkdown && isFolderMarker) {
        folderSet.add(ensureFolderPath(remainder));
      }
    });

    const folders = Array.from(folderSet);

    const files = (response.Contents ?? [])
      .map((object) => {
        const key = object.Key ?? "";
        const relative = key ? stripVaultPrefix(key) : "";
        return { object, key, relative };
      })
      .filter(({ key }) => Boolean(key))
      .filter(({ key }) => !key.endsWith("/"))
      .filter(({ relative }) => Boolean(relative))
      .filter(({ relative }) => relative.endsWith(".md"))
      .filter(({ relative }) => (prefix ? relative.startsWith(prefix) : true))
      .filter(({ relative }) => relative !== prefix)
      .map(({ object, relative }) => ({
        key: relative,
        etag: object.ETag ?? undefined,
        lastModified: object.LastModified?.toISOString(),
        size: object.Size ?? undefined,
      }));

    return NextResponse.json({
      prefix,
      folders,
      files,
      nextContinuationToken: response.NextContinuationToken ?? null,
    });
  } catch (error) {
    console.error("Failed to list S3 objects", error);
    return NextResponse.json(
      { error: "Failed to list folder contents" },
      { status: 500 },
    );
  }
}
