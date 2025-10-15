import type { S3Client as S3ClientType } from "@aws-sdk/client-s3";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { AwsClient } from "aws4fetch";

type S3Config = {
  client: S3ClientType;
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

  const client = createFetchS3Client({
    region,
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
  }) as unknown as S3ClientType;

  const vaultPrefix = normalizeVaultPrefix(process.env.TIGRIS_S3_PREFIX);

  return { client, bucket, vaultPrefix };
}

function getConfig(): S3Config {
  if (!cached) {
    cached = createConfig();
  }
  return cached;
}

export function getS3Client(): S3ClientType {
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

// --- Internal fetch-based S3 client --------------------------------------

type FetchS3ClientOptions = {
  region: string;
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function createFetchS3Client(opts: FetchS3ClientOptions) {
  const { region, endpoint, bucket, accessKeyId, secretAccessKey } = opts;
  const aws = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region,
  });

  function join(...parts: string[]) {
    return parts
      .map((p, i) => (i === 0 ? p.replace(/\/$/, "") : p.replace(/^\/+|\/$/g, "")))
      .filter(Boolean)
      .join("/");
  }

  function encodeKeyPath(key: string): string {
    return key
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
  }

  function objUrl(key: string): string {
    // path-style addressing: {endpoint}/{bucket}/{key}
    // IMPORTANT: preserve trailing slash on the key (folder markers)
    const base = join(endpoint, bucket);
    const encoded = encodeKeyPath(key);
    return `${base}/${encoded}`;
  }

  async function headObject(input: { Bucket: string; Key: string }) {
    const url = objUrl(input.Key);
    const res = await aws.fetch(url, { method: "HEAD" });
    if (!res.ok) throw new Error(`S3 HEAD failed: ${res.status}`);
    const etag = res.headers.get("etag") ?? undefined;
    const lastMod = res.headers.get("last-modified");
    return {
      ETag: etag,
      LastModified: lastMod ? new Date(lastMod) : undefined,
    };
  }

  async function getObject(input: { Bucket: string; Key: string }) {
    const url = objUrl(input.Key);
    const res = await aws.fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`S3 GET failed: ${res.status}`);
    const etag = res.headers.get("etag") ?? undefined;
    const lastMod = res.headers.get("last-modified");
    return {
      ETag: etag,
      LastModified: lastMod ? new Date(lastMod) : undefined,
      Body: res.body, // ReadableStream for Workers; our s3BodyToString handles it
    };
  }

  async function putObject(input: {
    Bucket: string;
    Key: string;
    Body?: string | Uint8Array;
    ContentType?: string;
    IfMatch?: string;
  }) {
    const url = objUrl(input.Key);
    let bodyInit: BodyInit | null | undefined;
    if (typeof input.Body === "string") {
      bodyInit = input.Body;
    } else if (input.Body instanceof Uint8Array) {
      // Copy to a fresh ArrayBuffer (guaranteed ArrayBuffer, not SharedArrayBuffer)
      const ab = new ArrayBuffer(input.Body.byteLength);
      new Uint8Array(ab).set(input.Body);
      bodyInit = ab;
    } else {
      bodyInit = "";
    }
    const res = await aws.fetch(url, {
      method: "PUT",
      headers: {
        ...(input.ContentType ? { "content-type": input.ContentType } : {}),
        ...(input.IfMatch ? { "if-match": input.IfMatch } : {}),
      },
      body: bodyInit,
    });
    if (!res.ok) throw new Error(`S3 PUT failed: ${res.status}`);
    return { ETag: res.headers.get("etag") ?? undefined };
  }

  async function deleteObject(input: { Bucket: string; Key: string }) {
    const url = objUrl(input.Key);
    const res = await aws.fetch(url, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error(`S3 DELETE failed: ${res.status}`);
    return {};
  }

  async function deleteObjects(input: { Bucket: string; Delete: { Objects: { Key: string }[] } }) {
    // Simpler: issue individual deletes to avoid XML payload complexity
    for (const { Key } of input.Delete.Objects) {
      await deleteObject({ Bucket: input.Bucket, Key });
    }
    return {};
  }

  function parseXmlValue(xml: string, tag: string): string | null {
    const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    return m ? m[1] : null;
  }

  function parseListObjectsV2(xml: string) {
    const commonPrefixes: { Prefix: string }[] = [];
    const contents: { Key: string; ETag?: string; LastModified?: Date; Size?: number }[] = [];

    const cpRegex = /<CommonPrefixes>[\s\S]*?<Prefix>([\s\S]*?)<\/Prefix>[\s\S]*?<\/CommonPrefixes>/g;
    let cpMatch: RegExpExecArray | null;
    while ((cpMatch = cpRegex.exec(xml))) {
      commonPrefixes.push({ Prefix: cpMatch[1] });
    }

    const cRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let cMatch: RegExpExecArray | null;
    while ((cMatch = cRegex.exec(xml))) {
      const block = cMatch[1];
      const key = parseXmlValue(block, "Key");
      if (!key) continue;
      const etag = parseXmlValue(block, "ETag") ?? undefined;
      const lastModifiedRaw = parseXmlValue(block, "LastModified");
      const lastModified = lastModifiedRaw ? new Date(lastModifiedRaw) : undefined;
      const sizeRaw = parseXmlValue(block, "Size");
      const size = sizeRaw ? Number(sizeRaw) : undefined;
      contents.push({ Key: key, ETag: etag, LastModified: lastModified, Size: size });
    }

    const next = parseXmlValue(xml, "NextContinuationToken");

    return {
      CommonPrefixes: commonPrefixes,
      Contents: contents,
      NextContinuationToken: next ?? undefined,
    };
  }

  async function listObjectsV2(input: {
    Bucket: string;
    Prefix?: string;
    Delimiter?: string;
    ContinuationToken?: string;
  }) {
    // Ensure bucket base ends with a slash to avoid any odd redirects that could drop query params
    const base = join(endpoint, bucket);
    const baseUrl = base.endsWith("/") ? base : `${base}/`;

    // Primary request honoring delimiter
    const url = new URL(baseUrl);
    url.searchParams.set("list-type", "2");
    if (input.Prefix && input.Prefix.length > 0) url.searchParams.set("prefix", input.Prefix);
    url.searchParams.set("max-keys", "1000");
    if (typeof input.Delimiter === "string") url.searchParams.set("delimiter", input.Delimiter);
    if (input.ContinuationToken) url.searchParams.set("continuation-token", input.ContinuationToken);
    const res = await aws.fetch(url.toString(), { method: "GET" });
    if (!res.ok) throw new Error(`S3 ListObjectsV2 failed: ${res.status}`);
    const xml = await res.text();
    const parsed = parseListObjectsV2(xml);

    // Fallback: some providers ignore delimiter and don't return CommonPrefixes. Re-list without delimiter
    // and synthesize CommonPrefixes and top-level Contents to emulate delimiter semantics.
    const needsFallback = input.Delimiter === "/" && (!parsed.CommonPrefixes || parsed.CommonPrefixes.length === 0);
    if (!needsFallback) {
      return parsed;
    }

    const url2 = new URL(baseUrl);
    url2.searchParams.set("list-type", "2");
    if (input.Prefix && input.Prefix.length > 0) url2.searchParams.set("prefix", input.Prefix);
    url2.searchParams.set("max-keys", "1000");
    if (input.ContinuationToken) url2.searchParams.set("continuation-token", input.ContinuationToken);
    const res2 = await aws.fetch(url2.toString(), { method: "GET" });
    if (!res2.ok) throw new Error(`S3 ListObjectsV2 (fallback) failed: ${res2.status}`);
    const xml2 = await res2.text();
    const raw = parseListObjectsV2(xml2);

    const topLevelContents: { Key: string; ETag?: string; LastModified?: Date; Size?: number }[] = [];
    const cpSet = new Set<string>();
    const prefixBase = input.Prefix ?? "";
    for (const obj of raw.Contents ?? []) {
      const key = obj.Key || "";
      if (!key.startsWith(prefixBase)) continue;
      const remainder = key.slice(prefixBase.length);
      const slashIdx = remainder.indexOf("/");
      if (slashIdx === -1) {
        // top-level file under this prefix
        topLevelContents.push(obj);
      } else {
        const firstSeg = remainder.slice(0, slashIdx + 1); // include trailing '/'
        cpSet.add(prefixBase + firstSeg);
      }
    }

    const synthesized = {
      CommonPrefixes: Array.from(cpSet).map((p) => ({ Prefix: p })),
      Contents: topLevelContents,
      NextContinuationToken: raw.NextContinuationToken,
    };
    return synthesized;
  }

  function encodeCopySourcePath(b: string, k: string) {
    return encodeURIComponent(`${b}/${k}`).replace(/%2F/g, "/");
  }

  async function copyObject(input: { Bucket: string; CopySource: string; Key: string; MetadataDirective?: string }) {
    const url = objUrl(input.Key);
    // If CopySource provided as "bucket/key" use as-is; otherwise build from params
    const copySource = input.CopySource || encodeCopySourcePath(bucket, input.Key);
    const res = await aws.fetch(url, {
      method: "PUT",
      headers: {
        "x-amz-copy-source": copySource,
        ...(input.MetadataDirective ? { "x-amz-metadata-directive": input.MetadataDirective } : {}),
      },
    });
    if (!res.ok) throw new Error(`S3 CopyObject failed: ${res.status}`);
    // Some S3 providers also include ETag in XML; headers may be absent, keep undefined
    return { CopyObjectResult: { ETag: res.headers.get("etag") ?? undefined } };
  }

  return {
    async send(command: unknown): Promise<unknown> {
      const input = (command as { input?: Record<string, unknown> }).input ?? {};
      if (command instanceof HeadObjectCommand) {
        return headObject({ Bucket: input.Bucket as string, Key: input.Key as string });
      }
      if (command instanceof GetObjectCommand) {
        return getObject({ Bucket: input.Bucket as string, Key: input.Key as string });
      }
      if (command instanceof PutObjectCommand) {
        return putObject({
          Bucket: input.Bucket as string,
          Key: input.Key as string,
          Body: input.Body as string | Uint8Array | undefined,
          ContentType: input.ContentType as string | undefined,
          IfMatch: input.IfMatch as string | undefined,
        });
      }
      if (command instanceof DeleteObjectCommand) {
        return deleteObject({ Bucket: input.Bucket as string, Key: input.Key as string });
      }
      if (command instanceof DeleteObjectsCommand) {
        return deleteObjects({ Bucket: input.Bucket as string, Delete: input.Delete as { Objects: { Key: string }[] } });
      }
      if (command instanceof ListObjectsV2Command) {
        return listObjectsV2({
          Bucket: input.Bucket as string,
          Prefix: input.Prefix as string | undefined,
          Delimiter: input.Delimiter as string | undefined,
          ContinuationToken: input.ContinuationToken as string | undefined,
        });
      }
      if (command instanceof CopyObjectCommand) {
        return copyObject({
          Bucket: input.Bucket as string,
          CopySource: input.CopySource as string,
          Key: input.Key as string,
          MetadataDirective: input.MetadataDirective as string | undefined,
        });
      }
      throw new Error("Unsupported S3 command instance");
    },
  };
}
