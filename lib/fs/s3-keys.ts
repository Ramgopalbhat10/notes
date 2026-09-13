import { DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

import { mapWithConcurrencyLimit } from "@/lib/async/concurrency";
import { getS3Client } from "@/lib/fs/s3";
import { statusError } from "@/lib/http/errors";

const DELETE_CHUNK_CONCURRENCY = 4;

export async function listKeys(bucket: string, prefix: string): Promise<string[]> {
  const client = getS3Client();
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    response.Contents?.forEach((object) => {
      if (object.Key) {
        keys.push(object.Key);
      }
    });
    continuationToken = response.NextContinuationToken ?? undefined;
  } while (continuationToken);
  return keys;
}

export async function ensureDestClear(bucket: string, destPrefix: string): Promise<void> {
  const client = getS3Client();
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: destPrefix,
      MaxKeys: 1,
    }),
  );
  if ((response.Contents?.length ?? 0) > 0) {
    throw statusError("Destination already exists", 409);
  }
}

export async function deleteKeys(bucket: string, keys: string[]): Promise<void> {
  const client = getS3Client();
  const chunks: string[][] = [];
  for (let i = 0; i < keys.length; i += 1000) {
    chunks.push(keys.slice(i, i + 1000));
  }
  await mapWithConcurrencyLimit(chunks, DELETE_CHUNK_CONCURRENCY, async (chunk) => {
    if (chunk.length === 1) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: chunk[0],
        }),
      );
      return;
    }

    if (chunk.length > 1) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: chunk.map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      );
    }
  });
}
