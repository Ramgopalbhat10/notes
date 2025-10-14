/**
 * Shared types and helpers for the cached file tree manifest stored in S3.
 *
 * Each node mirrors a markdown file or folder in the vault. Nodes are
 * referenced by a stable `id` (matching the normalized path within the vault)
 * which keeps lookups simple and enables cross-cutting features like search and
 * routing. The manifest intentionally omits the manifest file itself.
 */

export const FILE_TREE_MANIFEST_VERSION = 1;
export const FILE_TREE_MANIFEST_FILENAME = "file-tree.json";

export type FileTreeNodeType = "file" | "folder";

export type FileTreeNodeId = string;

export interface FileTreeNodeBase<TType extends FileTreeNodeType> {
  /** Stable identifier for the node (relative path, trailing slash for folders). */
  id: FileTreeNodeId;
  /** Distinguishes files from folders. */
  type: TType;
  /** Display name without any path information. */
  name: string;
  /** Path relative to the vault root; matches `id`. */
  path: string;
  /** Identifier of the parent folder; `null` for root-level nodes. */
  parentId: FileTreeNodeId | null;
  /**
   * ISO 8601 timestamp representing the last observed modification time.
   * Populated from S3 object metadata when available.
   */
  lastModified?: string;
}

export interface FileTreeFileNode extends FileTreeNodeBase<"file"> {
  /** Strong validator for optimistic concurrency (S3 ETag). */
  etag?: string;
  /** File size in bytes (useful for analytics/search weighting). */
  size?: number;
  /** Folders never include `childrenIds`; keep optional to prevent spread issues. */
  childrenIds?: never;
}

export interface FileTreeFolderNode extends FileTreeNodeBase<"folder"> {
  /** Sorted ids of child nodes; enables tree reconstruction without traversal. */
  childrenIds: FileTreeNodeId[];
  etag?: undefined;
  size?: undefined;
}

export type FileTreeNode = FileTreeFileNode | FileTreeFolderNode;

export interface FileTreeManifestMetadata {
  /** Schema version to help with backwards compatibility. */
  version: number;
  /** Timestamp when the manifest was generated (ISO 8601). */
  generatedAt: string;
  /** Hex-encoded checksum of the manifest payload for cache validation. */
  checksum: string;
  /** Number of nodes included; quick sanity check after hydration. */
  nodeCount: number;
}

export interface FileTreeManifest {
  metadata: FileTreeManifestMetadata;
  /** Array of all nodes in the tree; folders list their children via `childrenIds`. */
  nodes: FileTreeNode[];
  /** Top-level folder/file ids (no parent). */
  rootIds: FileTreeNodeId[];
}

export function isFileNode(node: FileTreeNode): node is FileTreeFileNode {
  return node.type === "file";
}

export function isFolderNode(node: FileTreeNode): node is FileTreeFolderNode {
  return node.type === "folder";
}

export const fileTreeManifestJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemas.local/file-tree-manifest.json",
  type: "object",
  required: ["metadata", "nodes", "rootIds"],
  additionalProperties: false,
  properties: {
    metadata: {
      type: "object",
      required: ["version", "generatedAt", "checksum", "nodeCount"],
      additionalProperties: false,
      properties: {
        version: { type: "integer", minimum: 1 },
        generatedAt: { type: "string", format: "date-time" },
        checksum: { type: "string", pattern: "^[a-f0-9]{32,}$" },
        nodeCount: { type: "integer", minimum: 0 },
      },
    },
    nodes: {
      type: "array",
      items: {
        oneOf: [
          {
            allOf: [
              { $ref: "#/$defs/baseNode" },
              {
                properties: {
                  type: { const: "file" },
                  etag: { type: "string" },
                  size: { type: "integer", minimum: 0 },
                },
                required: ["type"],
                not: { required: ["childrenIds"] },
              },
            ],
          },
          {
            allOf: [
              { $ref: "#/$defs/baseNode" },
              {
                properties: {
                  type: { const: "folder" },
                  childrenIds: {
                    type: "array",
                    items: { type: "string", minLength: 1 },
                  },
                },
                required: ["type", "childrenIds"],
                not: {
                  anyOf: [
                    { required: ["etag"] },
                    { required: ["size"] },
                  ],
                },
              },
            ],
          },
        ],
      },
    },
    rootIds: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
  },
  $defs: {
    baseNode: {
      type: "object",
      required: ["id", "type", "name", "path", "parentId"],
      properties: {
        id: { type: "string", minLength: 1 },
        type: { type: "string", enum: ["file", "folder"] },
        name: { type: "string", minLength: 1 },
        path: { type: "string", minLength: 1 },
        parentId: { type: ["string", "null"] },
        lastModified: { type: "string", format: "date-time" },
        etag: { type: "string" },
        size: { type: "integer", minimum: 0 },
        childrenIds: {
          type: "array",
          items: { type: "string", minLength: 1 },
        },
      },
      additionalProperties: false,
    },
  },
} as const;

export type FileTreeManifestJsonSchema = typeof fileTreeManifestJsonSchema;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export type FileTreeManifestValidationResult =
  | { success: true; manifest: FileTreeManifest }
  | { success: false; errors: string[] };

export function validateFileTreeManifest(value: unknown): FileTreeManifestValidationResult {
  const errors: string[] = [];

  if (!isPlainObject(value)) {
    return { success: false, errors: ["Manifest must be an object"] };
  }

  const metadataValue = value.metadata;
  if (!isPlainObject(metadataValue)) {
    errors.push("metadata must be an object");
  }

  const nodesValue = value.nodes;
  if (!Array.isArray(nodesValue)) {
    errors.push("nodes must be an array");
  }

  const rootIdsValue = value.rootIds;
  if (!isStringArray(rootIdsValue)) {
    errors.push("rootIds must be an array of strings");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const metadata = metadataValue as Record<string, unknown>;
  const nodesRaw = nodesValue as unknown[];
  const rootIds = rootIdsValue as string[];

  const version = metadata.version;
  const generatedAt = metadata.generatedAt;
  const checksum = metadata.checksum;
  const nodeCount = metadata.nodeCount;

  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    errors.push("metadata.version must be a positive integer");
  }
  if (typeof generatedAt !== "string" || Number.isNaN(Date.parse(generatedAt))) {
    errors.push("metadata.generatedAt must be an ISO timestamp");
  }
  if (typeof checksum !== "string" || !/^[a-f0-9]{32,}$/i.test(checksum)) {
    errors.push("metadata.checksum must be a hex string");
  }
  if (typeof nodeCount !== "number" || !Number.isInteger(nodeCount) || nodeCount < 0) {
    errors.push("metadata.nodeCount must be a non-negative integer");
  }

  const nodes: FileTreeNode[] = [];
  const seenIds = new Set<string>();

  nodesRaw.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      errors.push(`nodes[${index}] must be an object`);
      return;
    }
    const id = entry.id;
    const type = entry.type;
    const name = entry.name;
    const path = entry.path;
    const parentId = entry.parentId;

    if (typeof id !== "string" || !id) {
      errors.push(`nodes[${index}].id must be a non-empty string`);
      return;
    }
    if (seenIds.has(id)) {
      errors.push(`nodes[${index}].id duplicates an existing node id`);
      return;
    }
    seenIds.add(id);
    if (type !== "file" && type !== "folder") {
      errors.push(`nodes[${index}].type must be "file" or "folder"`);
      return;
    }
    if (typeof name !== "string" || !name) {
      errors.push(`nodes[${index}].name must be a non-empty string`);
      return;
    }
    if (typeof path !== "string" || !path) {
      errors.push(`nodes[${index}].path must be a non-empty string`);
      return;
    }
    if (parentId !== null && typeof parentId !== "string") {
      errors.push(`nodes[${index}].parentId must be string or null`);
      return;
    }

    const lastModifiedRaw = entry.lastModified;
    const lastModifiedValidated =
      typeof lastModifiedRaw === "string" && !Number.isNaN(Date.parse(lastModifiedRaw))
        ? lastModifiedRaw
        : undefined;

    if (type === "file") {
      const etag = entry.etag;
      const size = entry.size;
      nodes.push({
        id,
        type: "file",
        name,
        path,
        parentId: parentId ?? null,
        lastModified: lastModifiedValidated,
        etag: typeof etag === "string" ? etag : undefined,
        size: typeof size === "number" ? size : undefined,
      });
    } else {
      const childrenIds = entry.childrenIds;
      if (!isStringArray(childrenIds)) {
        errors.push(`nodes[${index}].childrenIds must be an array of strings`);
        return;
      }
      nodes.push({
        id,
        type: "folder",
        name,
        path,
        parentId: parentId ?? null,
        lastModified: lastModifiedValidated,
        childrenIds,
      });
    }
  });

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const manifest: FileTreeManifest = {
    metadata: {
      version: version as number,
      generatedAt: generatedAt as string,
      checksum: checksum as string,
      nodeCount: nodeCount as number,
    },
    nodes,
    rootIds,
  };

  if (manifest.metadata.nodeCount !== nodes.length) {
    errors.push(
      `metadata.nodeCount (${manifest.metadata.nodeCount}) does not match nodes length (${nodes.length})`,
    );
    return { success: false, errors };
  }

  return { success: true, manifest };
}
