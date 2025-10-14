import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

export async function s3BodyToString(body: GetObjectCommandOutput["Body"]): Promise<string> {
  if (!body) {
    return "";
  }
  if (typeof body === "string") {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return body.toString("utf-8");
  }
  if ("transformToString" in body && typeof body.transformToString === "function") {
    return body.transformToString("utf-8");
  }
  const readable = body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}
