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
} from "@/lib/cache/manifest-store";
import { serializeFileTreeManifest, uploadFileTreeManifest } from "@/lib/file-tree-builder";
import { normalizeEtag } from "@/lib/etag";
import { applyVaultPrefix, ensureFolderPath, getBucket, getS3Client } from "@/lib/fs/s3";
import { basename, getParentPath } from "@/lib/platform/paths";

class Manifest {
  private manifest: FileTreeManifest;
  private nodeById: Map<FileTreeNodeId, FileTreeNode>;

  constructor(manifest: FileTreeManifest) {
    this.manifest = manifest;
    this.nodeById = new Map(manifest.nodes.map((node) => [node.id, node]));
  }

  public getRaw(): FileTreeManifest {
    return this.manifest;
  }

  private computeChecksum(): string {
    const checksumPayload = JSON.stringify({
      version: this.manifest.metadata.version,
      generatedAt: this.manifest.metadata.generatedAt,
      nodes: this.manifest.nodes,
      rootIds: this.manifest.rootIds,
    });
    return createHash("md5").update(checksumPayload).digest("hex");
  }

  private rebuildNodeLookup(): void {
    this.nodeById = new Map(this.manifest.nodes.map((node) => [node.id, node]));
  }

  public ensureParentFolders(childPath: string): void {
    const parts: string[] = [];
    const segments = childPath.split("/").filter(Boolean);

    for (let i = 0; i < segments.length - 1; i++) {
      parts.push(segments[i]);
      const folderPath = ensureFolderPath(parts.join("/"));

      const existingNode = this.findNode(folderPath);
      if (existingNode) {
        continue;
      }

      const parentId = getParentPath(folderPath);
      const folderNode: FileTreeFolderNode = {
        id: folderPath,
        type: "folder",
        name: basename(folderPath),
        path: folderPath,
        parentId,
        childrenIds: [],
      };
      this.addNode(folderNode);

      if (parentId === null) {
        if (!this.manifest.rootIds.includes(folderPath)) {
          this.manifest.rootIds.push(folderPath);
        }
      } else {
        const parent = this.findNode(parentId);
        if (parent && isFolderNode(parent)) {
          if (!parent.childrenIds.includes(folderPath)) {
            parent.childrenIds.push(folderPath);
          }
        }
      }
    }
  }

  public addChildToParent(childId: FileTreeNodeId): void {
    const childNode = this.findNode(childId);
    if (!childNode) return;

    const parentId = childNode.parentId;
    if (parentId === null) {
      if (!this.manifest.rootIds.includes(childId)) {
        this.manifest.rootIds.push(childId);
      }
    } else {
      const parent = this.findNode(parentId);
      if (parent && isFolderNode(parent)) {
        if (!parent.childrenIds.includes(childId)) {
          parent.childrenIds.push(childId);
        }
      }
    }
  }

  public removeChildFromParent(childId: FileTreeNodeId, parentId: FileTreeNodeId | null): void {
    if (parentId === null) {
      this.manifest.rootIds = this.manifest.rootIds.filter((id) => id !== childId);
    } else {
      const parent = this.findNode(parentId);
      if (parent && isFolderNode(parent)) {
        parent.childrenIds = parent.childrenIds.filter((id) => id !== childId);
      }
    }
  }

  public sort(): void {
    this.manifest.nodes.sort((a, b) => a.id.localeCompare(b.id));
    this.manifest.rootIds.sort((a, b) => a.localeCompare(b));
    for (const node of this.manifest.nodes) {
      if (isFolderNode(node)) {
        node.childrenIds.sort((a, b) => a.localeCompare(b));
      }
    }
  }

  public async save(): Promise<void> {
    this.manifest.metadata.generatedAt = new Date().toISOString();
    this.manifest.metadata.nodeCount = this.manifest.nodes.length;
    this.manifest.metadata.checksum = this.computeChecksum();

    const { etag } = await uploadFileTreeManifest(this.manifest);
    const payload = serializeFileTreeManifest(this.manifest);
    const updatedAt = new Date().toISOString();

    const redisValue: RedisManifestValue = {
      body: payload,
      metadata: this.manifest.metadata,
      etag,
      updatedAt,
    };
    await writeManifestToRedis(redisValue);
    revalidateTag(MANIFEST_CACHE_TAG, "max");
  }

  public findNode(id: string): FileTreeNode | undefined {
    return this.nodeById.get(id);
  }

  public findIndex(id: string): number {
    return this.manifest.nodes.findIndex((n) => n.id === id);
  }

  public getNode(index: number): FileTreeNode {
    return this.manifest.nodes[index];
  }

  public updateNode(index: number, node: FileTreeNode, previousId?: FileTreeNodeId): void {
    const existingNodeId = previousId ?? this.manifest.nodes[index]?.id;
    this.manifest.nodes[index] = node;
    if (existingNodeId && existingNodeId !== node.id) {
      this.nodeById.delete(existingNodeId);
    }
    this.nodeById.set(node.id, node);
  }

  public addNode(node: FileTreeNode): void {
    this.manifest.nodes.push(node);
    this.nodeById.set(node.id, node);
  }

  public removeNode(index: number): void {
    const [removedNode] = this.manifest.nodes.splice(index, 1);
    if (removedNode) {
      this.nodeById.delete(removedNode.id);
    }
  }

  public filterNodes(predicate: (node: FileTreeNode) => boolean): void {
    this.manifest.nodes = this.manifest.nodes.filter(predicate);
    this.rebuildNodeLookup();
  }

  public getNodes(): FileTreeNode[] {
    return this.manifest.nodes;
  }
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

  const manifest = new Manifest(manifestRecord.manifest);
  const { key, etag, lastModified, size } = params;

  manifest.ensureParentFolders(key);
  const existingIndex = manifest.findIndex(key);
  const parentId = getParentPath(key);

  const fileNode: FileTreeFileNode = {
    id: key,
    type: "file",
    name: basename(key),
    path: key,
    parentId,
    lastModified,
    etag: normalizeEtag(etag) ?? undefined,
    size,
  };

  if (existingIndex >= 0) {
    manifest.updateNode(existingIndex, fileNode);
  } else {
    manifest.addNode(fileNode);
    manifest.addChildToParent(key);
  }

  manifest.sort();
  await manifest.save();
}

export interface AddFolderParams {
  prefix: string;
}

export async function addFolder(params: AddFolderParams): Promise<void> {
  const manifestRecord = await loadLatestManifest();
  if (!manifestRecord) {
    throw new Error("No manifest available for incremental update");
  }

  const manifest = new Manifest(manifestRecord.manifest);
  const folderId = ensureFolderPath(params.prefix);

  if (manifest.findNode(folderId)) {
    return;
  }

  manifest.ensureParentFolders(folderId);

  const parentId = getParentPath(folderId);
  const folderNode: FileTreeFolderNode = {
    id: folderId,
    type: "folder",
    name: basename(folderId),
    path: folderId,
    parentId,
    childrenIds: [],
  };

  manifest.addNode(folderNode);
  manifest.addChildToParent(folderId);

  manifest.sort();
  await manifest.save();
}

export interface DeleteFileParams {
  key: string;
}

export async function deleteFile(params: DeleteFileParams): Promise<void> {
  const manifestRecord = await loadLatestManifest();
  if (!manifestRecord) {
    throw new Error("No manifest available for incremental update");
  }

  const manifest = new Manifest(manifestRecord.manifest);
  const { key } = params;

  const fileIndex = manifest.findIndex(key);
  if (fileIndex < 0) {
    return;
  }

  const fileNode = manifest.getNode(fileIndex);
  const parentId = fileNode.parentId;
  manifest.removeNode(fileIndex);
  manifest.removeChildFromParent(key, parentId);

  manifest.sort();
  await manifest.save();
}

export interface DeleteFolderParams {
  prefix: string;
}

export async function deleteFolder(params: DeleteFolderParams): Promise<void> {
  const manifestRecord = await loadLatestManifest();
  if (!manifestRecord) {
    throw new Error("No manifest available for incremental update");
  }

  const manifest = new Manifest(manifestRecord.manifest);
  const folderId = ensureFolderPath(params.prefix);

  const folderNode = manifest.findNode(folderId);
  const folderParentId = folderNode?.parentId ?? null;

  const toRemove = new Set<FileTreeNodeId>();
  const nodeById = new Map<FileTreeNodeId, FileTreeNode>(manifest.getNodes().map((n) => [n.id, n]));
  const queue: FileTreeNodeId[] = [folderId];
  let qi = 0;

  while (qi < queue.length) {
    const currentId = queue[qi++];
    toRemove.add(currentId);

    const node = nodeById.get(currentId);
    if (node && isFolderNode(node)) {
      queue.push(...node.childrenIds);
    }
  }

  manifest.filterNodes((n) => !toRemove.has(n.id));
  manifest.removeChildFromParent(folderId, folderParentId);

  manifest.sort();
  await manifest.save();
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

  const manifest = new Manifest(manifestRecord.manifest);
  const { oldKey, newKey } = params;

  const fileIndex = manifest.findIndex(oldKey);
  if (fileIndex < 0) {
    return;
  }

  const currentFileNode = manifest.getNode(fileIndex) as FileTreeFileNode;
  manifest.removeChildFromParent(oldKey, currentFileNode.parentId);

  const client = getS3Client();
  const bucket = getBucket();
  try {
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: applyVaultPrefix(newKey),
      }),
    );

    const newParentId = getParentPath(newKey);
    manifest.ensureParentFolders(newKey);

    const updatedFileNode: FileTreeFileNode = {
      ...currentFileNode,
      id: newKey,
      name: basename(newKey),
      path: newKey,
      parentId: newParentId,
      etag: normalizeEtag(head.ETag ?? undefined) ?? undefined,
      lastModified: head.LastModified?.toISOString(),
      size: typeof head.ContentLength === "number" ? head.ContentLength : undefined,
    };

    manifest.updateNode(fileIndex, updatedFileNode, oldKey);
    manifest.addChildToParent(newKey);

    manifest.sort();
    await manifest.save();
  } catch (error) {
    console.error("Failed to fetch metadata for moved file", error);
    const newParentId = getParentPath(newKey);
    manifest.ensureParentFolders(newKey);

    const updatedFileNode: FileTreeFileNode = {
      ...currentFileNode,
      id: newKey,
      name: basename(newKey),
      path: newKey,
      parentId: newParentId,
    };

    manifest.updateNode(fileIndex, updatedFileNode, oldKey);
    manifest.addChildToParent(newKey);

    manifest.sort();
    await manifest.save();
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

  const manifest = new Manifest(manifestRecord.manifest);
  const oldFolderId = ensureFolderPath(params.oldPrefix);
  const newFolderId = ensureFolderPath(params.newPrefix);

  const toUpdate: Array<{ index: number; id: FileTreeNodeId }> = [];
  for (const [index, node] of manifest.getNodes().entries()) {
    if (node.id === oldFolderId || node.id.startsWith(oldFolderId)) {
      toUpdate.push({ index, id: node.id });
    }
  }

  toUpdate.sort((a, b) => a.id.length - b.id.length);

  if (toUpdate.length === 0) {
    return;
  }

  const oldFolderNode = manifest.findNode(oldFolderId);
  const oldFolderParentId = oldFolderNode?.parentId ?? null;

  manifest.removeChildFromParent(oldFolderId, oldFolderParentId);

  for (const { index, id } of toUpdate) {
    const node = manifest.getNode(index);
    const newId = id.replace(oldFolderId, newFolderId);
    const newParentId = getParentPath(newId);

    manifest.ensureParentFolders(newId);

    const updatedNode = isFolderNode(node)
      ? {
          ...node,
          id: newId,
          name: basename(newId),
          path: newId,
          parentId: newParentId,
          childrenIds: node.childrenIds.map((childId) =>
            childId.startsWith(oldFolderId) ? childId.replace(oldFolderId, newFolderId) : childId,
          ),
        }
      : {
          ...node,
          id: newId,
          name: basename(newId),
          path: newId,
          parentId: newParentId,
        };

    manifest.updateNode(index, updatedNode, id);
  }

  manifest.addChildToParent(newFolderId);

  manifest.sort();
  await manifest.save();
}
