import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";

export async function s3BodyToString(body: GetObjectCommandOutput["Body"]): Promise<string> {
  if (!body) {
    return "";
  }
  if (typeof body === "string") {
    return body;
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
    return body.toString("utf-8");
  }
  if ("transformToString" in body && typeof body.transformToString === "function") {
    return body.transformToString("utf-8");
  }
  // Web stream fallback (Workers/Edge)
  if (
    typeof body === "object" &&
    body !== null &&
    "getReader" in (body as ReadableStream<Uint8Array>) &&
    typeof (body as ReadableStream<Uint8Array>).getReader === "function"
  ) {
    const response = new Response(body as ReadableStream<Uint8Array>);
    return await response.text();
  }
  // Last resort: try to consume as async iterable (Node)
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
    chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
  }
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    joined.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(joined);
}
