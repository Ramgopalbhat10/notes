import { createHash } from "node:crypto";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { revalidateTag } from "next/cache";

import {
  FILE_TREE_MANIFEST_VERSION,
  type FileTreeFileNode,
  type FileTreeFolderNode,
  type FileTreeManifest,
  type FileTreeNode,
  type FileTreeNodeId,
  isFolderNode,
} from "@/lib/file-tree-manifest";
import {
  MANIFEST_CACHE_TAG,
  loadLatestManifest,
  writeManifestToRedis,
  type RedisManifestValue,
} from "@/lib/manifest-store";
import { serializeFileTreeManifest, uploadFileTreeManifest } from "@/lib/file-tree-builder";
import { applyVaultPrefix, ensureFolderPath, getBucket, getS3Client } from "@/lib/s3";

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

function sanitizeEtag(etag: string | undefined): string | undefined {
  if (!etag) {
    return undefined;
  }
  return etag.replace(/"/g, "");
}

function computeChecksum(manifest: FileTreeManifest): string {
  const checksumPayload = JSON.stringify({
    version: manifest.metadata.version,
    generatedAt: manifest.metadata.generatedAt,
    nodes: manifest.nodes,
    rootIds: manifest.rootIds,
  });
  return createHash("md5").update(checksumPayload).digest("hex");
}

function ensureParentFolders(manifest: FileTreeManifest, childPath: string): void {
  const parts: string[] = [];
  const segments = childPath.split("/").filter(Boolean);

  // Build all parent folder paths
  for (let i = 0; i < segments.length - 1; i++) {
    parts.push(segments[i]);
    const folderPath = ensureFolderPath(parts.join("/"));
    
    // Check if folder already exists
    const existingNode = manifest.nodes.find((n) => n.id === folderPath);
    if (existingNode) {
      continue;
    }

    // Create folder node
    const parentId = parentIdFromPath(folderPath);
    const folderNode: FileTreeFolderNode = {
      id: folderPath,
      type: "folder",
      name: basename(folderPath),
      path: folderPath,
      parentId,
      childrenIds: [],
    };
    manifest.nodes.push(folderNode);

    // Update parent's childrenIds or rootIds
    if (parentId === null) {
      if (!manifest.rootIds.includes(folderPath)) {
        manifest.rootIds.push(folderPath);
      }
    } else {
      const parent = manifest.nodes.find((n) => n.id === parentId);
      if (parent && isFolderNode(parent)) {
        if (!parent.childrenIds.includes(folderPath)) {
          parent.childrenIds.push(folderPath);
        }
      }
    }
  }
}

function addChildToParent(manifest: FileTreeManifest, childId: FileTreeNodeId): void {
  const childNode = manifest.nodes.find((n) => n.id === childId);
  if (!childNode) {
    return;
  }

  const parentId = childNode.parentId;
  if (parentId === null) {
    // Root level
    if (!manifest.rootIds.includes(childId)) {
      manifest.rootIds.push(childId);
    }
  } else {
    // Find parent and add child
    const parent = manifest.nodes.find((n) => n.id === parentId);
    if (parent && isFolderNode(parent)) {
      if (!parent.childrenIds.includes(childId)) {
        parent.childrenIds.push(childId);
      }
    }
  }
}

function removeChildFromParent(manifest: FileTreeManifest, childId: FileTreeNodeId): void {
  const childNode = manifest.nodes.find((n) => n.id === childId);
  if (!childNode) {
    return;
  }

  const parentId = childNode.parentId;
  if (parentId === null) {
    // Remove from root
    manifest.rootIds = manifest.rootIds.filter((id) => id !== childId);
  } else {
    // Remove from parent's children
    const parent = manifest.nodes.find((n) => n.id === parentId);
    if (parent && isFolderNode(parent)) {
      parent.childrenIds = parent.childrenIds.filter((id) => id !== childId);
    }
  }
}

function sortManifest(manifest: FileTreeManifest): void {
  manifest.nodes.sort((a, b) => a.id.localeCompare(b.id));
  manifest.rootIds.sort((a, b) => a.localeCompare(b));
  for (const node of manifest.nodes) {
    if (isFolderNode(node)) {
      node.childrenIds.sort((a, b) => a.localeCompare(b));
    }
  }
}

async function saveManifest(manifest: FileTreeManifest): Promise<void> {
  // Update metadata
  manifest.metadata.generatedAt = new Date().toISOString();
  manifest.metadata.nodeCount = manifest.nodes.length;
  manifest.metadata.checksum = computeChecksum(manifest);

  // Upload to S3
  const { etag } = await uploadFileTreeManifest(manifest);
  const payload = serializeFileTreeManifest(manifest);
  const updatedAt = new Date().toISOString();

  // Update Redis
  const redisValue: RedisManifestValue = {
    body: payload,
    metadata: manifest.metadata,
    etag,
    updatedAt,
  };
  await writeManifestToRedis(redisValue);

  // Revalidate cache
  await revalidateTag(MANIFEST_CACHE_TAG, "max");
}

export interface AddFileParams {
  key: string;
  etag?: string;
  lastModified: string;
  size?: number;
}

export async function addOrUpdateFile(params: AddFileParams): Promise<void> {
  const manifestRecord = await loadLatestManifest();
  if (!manifestRecord) {
    throw new Error("No manifest available for incremental update");
  }

  const manifest = manifestRecord.manifest;
  const { key, etag, lastModified, size } = params;

  // Ensure all parent folders exist
  ensureParentFolders(manifest, key);

  // Check if file already exists
  const existingIndex = manifest.nodes.findIndex((n) => n.id === key);
  const parentId = parentIdFromPath(key);

  const fileNode: FileTreeFileNode = {
    id: key,
    type: "file",
    name: basename(key),
    path: key,
    parentId,
    lastModified,
    etag: sanitizeEtag(etag),
    size,
  };

  if (existingIndex >= 0) {
    // Update existing file
    manifest.nodes[existingIndex] = fileNode;
  } else {
    // Add new file
    manifest.nodes.push(fileNode);
    addChildToParent(manifest, key);
  }

  sortManifest(manifest);
  await saveManifest(manifest);
}

export interface AddFolderParams {
  prefix: string;
}

export async function addFolder(params: AddFolderParams): Promise<void> {
  const manifestRecord = await loadLatestManifest();
  if (!manifestRecord) {
    throw new Error("No manifest available for incremental update");
  }

  const manifest = manifestRecord.manifest;
  const folderId = ensureFolderPath(params.prefix);

  // Check if folder already exists
  const existingNode = manifest.nodes.find((n) => n.id === folderId);
  if (existingNode) {
    return; // Already exists
  }

  // Ensure parent folders exist
  ensureParentFolders(manifest, folderId);

  // Create folder node
  const parentId = parentIdFromPath(folderId);
  const folderNode: FileTreeFolderNode = {
    id: folderId,
    type: "folder",
    name: basename(folderId),
    path: folderId,
    parentId,
    childrenIds: [],
  };

  manifest.nodes.push(folderNode);
  addChildToParent(manifest, folderId);

  sortManifest(manifest);
  await saveManifest(manifest);
}

export interface DeleteFileParams {
  key: string;
}

export async function deleteFile(params: DeleteFileParams): Promise<void> {
  const manifestRecord = await loadLatestManifest();
  if (!manifestRecord) {
    throw new Error("No manifest available for incremental update");
  }

  const manifest = manifestRecord.manifest;
  const { key } = params;

  // Remove file node
  const fileIndex = manifest.nodes.findIndex((n) => n.id === key);
  if (fileIndex < 0) {
    return; // File doesn't exist in manifest
  }

  const fileNode = manifest.nodes[fileIndex];
  manifest.nodes.splice(fileIndex, 1);
  removeChildFromParent(manifest, key);

  sortManifest(manifest);
  await saveManifest(manifest);
}

export interface DeleteFolderParams {
  prefix: string;
}

export async function deleteFolder(params: DeleteFolderParams): Promise<void> {
  const manifestRecord = await loadLatestManifest();
  if (!manifestRecord) {
    throw new Error("No manifest available for incremental update");
  }

  const manifest = manifestRecord.manifest;
  const folderId = ensureFolderPath(params.prefix);

  // Remove folder and all its children recursively
  const toRemove = new Set<FileTreeNodeId>();
  const queue: FileTreeNodeId[] = [folderId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    toRemove.add(currentId);

    const node = manifest.nodes.find((n) => n.id === currentId);
    if (node && isFolderNode(node)) {
      queue.push(...node.childrenIds);
    }
  }

  // Remove all marked nodes
  manifest.nodes = manifest.nodes.filter((n) => !toRemove.has(n.id));
  removeChildFromParent(manifest, folderId);

  sortManifest(manifest);
  await saveManifest(manifest);
}

export interface MoveFileParams {
  oldKey: string;
  newKey: string;
}

export async function moveFile(params: MoveFileParams): Promise<void> {
  const manifestRecord = await loadLatestManifest();
  if (!manifestRecord) {
    throw new Error("No manifest available for incremental update");
  }

  const manifest = manifestRecord.manifest;
  const { oldKey, newKey } = params;

  // Find the file node
  const fileIndex = manifest.nodes.findIndex((n) => n.id === oldKey);
  if (fileIndex < 0) {
    return; // File doesn't exist
  }

  const fileNode = manifest.nodes[fileIndex] as FileTreeFileNode;
  removeChildFromParent(manifest, oldKey);

  // Get updated metadata from S3
  const client = getS3Client();
  const bucket = getBucket();
  try {
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: applyVaultPrefix(newKey),
      }),
    );

    // Update file node
    const newParentId = parentIdFromPath(newKey);
    ensureParentFolders(manifest, newKey);

    fileNode.id = newKey;
    fileNode.name = basename(newKey);
    fileNode.path = newKey;
    fileNode.parentId = newParentId;
    fileNode.etag = sanitizeEtag(head.ETag ?? undefined);
    fileNode.lastModified = head.LastModified?.toISOString();
    fileNode.size = typeof head.ContentLength === "number" ? head.ContentLength : undefined;

    manifest.nodes[fileIndex] = fileNode;
    addChildToParent(manifest, newKey);

    sortManifest(manifest);
    await saveManifest(manifest);
  } catch (error) {
    console.error("Failed to fetch metadata for moved file", error);
    // If we can't get S3 metadata, just update the IDs
    const newParentId = parentIdFromPath(newKey);
    ensureParentFolders(manifest, newKey);

    fileNode.id = newKey;
    fileNode.name = basename(newKey);
    fileNode.path = newKey;
    fileNode.parentId = newParentId;

    manifest.nodes[fileIndex] = fileNode;
    addChildToParent(manifest, newKey);

    sortManifest(manifest);
    await saveManifest(manifest);
  }
}

export interface MoveFolderParams {
  oldPrefix: string;
  newPrefix: string;
}

export async function moveFolder(params: MoveFolderParams): Promise<void> {
  const manifestRecord = await loadLatestManifest();
  if (!manifestRecord) {
    throw new Error("No manifest available for incremental update");
  }

  const manifest = manifestRecord.manifest;
  const oldFolderId = ensureFolderPath(params.oldPrefix);
  const newFolderId = ensureFolderPath(params.newPrefix);

  // Find all nodes that start with oldFolderId
  const toUpdate: FileTreeNode[] = [];
  for (const node of manifest.nodes) {
    if (node.id === oldFolderId || node.id.startsWith(oldFolderId)) {
      toUpdate.push(node);
    }
  }

  if (toUpdate.length === 0) {
    return; // Nothing to move
  }

  // Remove the old folder from its parent
  removeChildFromParent(manifest, oldFolderId);

  // Update all affected nodes
  for (const node of toUpdate) {
    const newId = node.id.replace(oldFolderId, newFolderId);
    const newParentId = parentIdFromPath(newId);

    // Ensure parent folders exist
    ensureParentFolders(manifest, newId);

    // Update node
    node.id = newId;
    node.name = basename(newId);
    node.path = newId;
    node.parentId = newParentId;

    // Update childrenIds for folders
    if (isFolderNode(node)) {
      node.childrenIds = node.childrenIds.map((childId) =>
        childId.startsWith(oldFolderId) ? childId.replace(oldFolderId, newFolderId) : childId,
      );
    }
  }

  // Add the new folder to its parent
  addChildToParent(manifest, newFolderId);

  sortManifest(manifest);
  await saveManifest(manifest);
}
