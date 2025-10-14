import { ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";

import {
  applyVaultPrefix,
  ensureFolderPath,
  getBucket,
  getS3Client,
  stripVaultPrefix,
} from "@/lib/s3";
import {
  FILE_TREE_MANIFEST_FILENAME,
  FILE_TREE_MANIFEST_VERSION,
  type FileTreeFileNode,
  type FileTreeFolderNode,
  type FileTreeManifest,
  type FileTreeNode,
  type FileTreeNodeId,
  isFolderNode,
} from "@/lib/file-tree-manifest";

interface BuildContext {
  nodes: Map<FileTreeNodeId, FileTreeNode>;
  childMap: Map<FileTreeNodeId | null, Set<FileTreeNodeId>>;
}

function basename(input: string): string {
  if (!input) {
    return input;
  }
  const trimmed = input.endsWith("/") ? input.slice(0, -1) : input;
  const idx = trimmed.lastIndexOf("/");
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

function parentIdFromPath(path: string): FileTreeNodeId | null {
  if (!path) {
    return null;
  }
  const normalized = path.endsWith("/") ? path.slice(0, -1) : path;
  const idx = normalized.lastIndexOf("/");
  if (idx === -1) {
    return null;
  }
  return `${normalized.slice(0, idx + 1)}`;
}

function ensureChild(map: Map<FileTreeNodeId | null, Set<FileTreeNodeId>>, parent: FileTreeNodeId | null) {
  if (!map.has(parent)) {
    map.set(parent, new Set());
  }
  return map.get(parent)!;
}

function addChild(childMap: Map<FileTreeNodeId | null, Set<FileTreeNodeId>>, parent: FileTreeNodeId | null, child: FileTreeNodeId) {
  ensureChild(childMap, parent).add(child);
}

function toSortedArray(set: Set<FileTreeNodeId> | undefined): FileTreeNodeId[] {
  return set ? Array.from(set).sort((a, b) => a.localeCompare(b)) : [];
}

function sanitizeEtag(etag: string | undefined): string | undefined {
  if (!etag) {
    return undefined;
  }
  return etag.replace(/"/g, "");
}

async function buildContext(): Promise<BuildContext> {
  const nodes = new Map<FileTreeNodeId, FileTreeNode>();
  const childMap = new Map<FileTreeNodeId | null, Set<FileTreeNodeId>>();
  const client = getS3Client();
  const bucket = getBucket();

  const folderQueue: string[] = [""];
  const visited = new Set<string>();

  while (folderQueue.length > 0) {
    const prefix = folderQueue.shift() ?? "";
    if (visited.has(prefix)) {
      continue;
    }
    visited.add(prefix);

    let continuationToken: string | undefined;

    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: applyVaultPrefix(prefix),
          Delimiter: "/",
          ContinuationToken: continuationToken,
        }),
      );

      const folderEntries = response.CommonPrefixes ?? [];
      for (const entry of folderEntries) {
        const rawPrefix = entry.Prefix;
        if (!rawPrefix) {
          continue;
        }
        const relative = stripVaultPrefix(rawPrefix);
        if (!relative) {
          continue;
        }
        const folderId = ensureFolderPath(relative);
        if (folderId === FILE_TREE_MANIFEST_FILENAME) {
          continue;
        }
        folderQueue.push(folderId);
        const parentId = parentIdFromPath(folderId);
        addChild(childMap, parentId, folderId);
        if (!nodes.has(folderId)) {
          const folderNode: FileTreeFolderNode = {
            id: folderId,
            type: "folder",
            name: basename(folderId),
            path: folderId,
            parentId,
            childrenIds: [],
          };
          nodes.set(folderId, folderNode);
        }
      }

      const fileEntries = response.Contents ?? [];
      for (const object of fileEntries) {
        const key = object.Key ?? "";
        if (!key) {
          continue;
        }
        if (key.endsWith("/")) {
          continue;
        }
        const relative = stripVaultPrefix(key);
        if (!relative) {
          continue;
        }
        if (!relative.endsWith(".md")) {
          continue;
        }
        if (relative === FILE_TREE_MANIFEST_FILENAME) {
          continue;
        }

        const parentId = parentIdFromPath(relative);
        addChild(childMap, parentId, relative);

        const fileNode: FileTreeFileNode = {
          id: relative,
          type: "file",
          name: basename(relative),
          path: relative,
          parentId,
          lastModified: object.LastModified?.toISOString(),
          etag: sanitizeEtag(object.ETag ?? undefined),
          size: typeof object.Size === "number" ? object.Size : undefined,
        };
        nodes.set(relative, fileNode);
      }

      continuationToken = response.NextContinuationToken ?? undefined;
    } while (continuationToken);
  }

  return { nodes, childMap };
}

function finalizeManifest(context: BuildContext): FileTreeManifest {
  const { nodes, childMap } = context;

  for (const node of nodes.values()) {
    if (isFolderNode(node)) {
      node.childrenIds = toSortedArray(childMap.get(node.id));
    }
  }

  const sortedNodes = Array.from(nodes.values()).sort((a, b) => a.id.localeCompare(b.id));
  const rootIds = toSortedArray(childMap.get(null));
  const generatedAt = new Date().toISOString();

  const checksumPayload = JSON.stringify({
    version: FILE_TREE_MANIFEST_VERSION,
    generatedAt,
    nodes: sortedNodes,
    rootIds,
  });
  const checksum = createHash("md5").update(checksumPayload).digest("hex");

  return {
    metadata: {
      version: FILE_TREE_MANIFEST_VERSION,
      generatedAt,
      checksum,
      nodeCount: sortedNodes.length,
    },
    nodes: sortedNodes,
    rootIds,
  };
}

export async function generateFileTreeManifest(): Promise<FileTreeManifest> {
  const context = await buildContext();
  return finalizeManifest(context);
}

export function serializeFileTreeManifest(manifest: FileTreeManifest, pretty = false): string {
  return pretty ? JSON.stringify(manifest, null, 2) : JSON.stringify(manifest);
}

export async function uploadFileTreeManifest(manifest: FileTreeManifest): Promise<{ etag?: string }> {
  const client = getS3Client();
  const bucket = getBucket();
  const payload = serializeFileTreeManifest(manifest);
  const response = await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: FILE_TREE_MANIFEST_FILENAME,
      Body: payload,
      ContentType: "application/json; charset=utf-8",
    }),
  );
  return { etag: sanitizeEtag(response.ETag ?? undefined) };
}
