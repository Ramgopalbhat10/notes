import type { Node as TreeNode, NodeId } from "./types";

export function basename(path: string): string {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  const idx = trimmed.lastIndexOf("/");
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
}

export function ensureFolderPath(parentPath: string, name: string): string {
  return `${parentPath}${name}/`;
}

export function ensureFilePath(parentPath: string, name: string): string {
  const normalized = name.toLowerCase().endsWith(".md") ? name : `${name}.md`;
  return `${parentPath}${normalized}`;
}

export function parentPathFromKey(key: string): NodeId | null {
  const idx = key.lastIndexOf("/");
  if (idx === -1) {
    return null;
  }
  return key.slice(0, idx + 1);
}

export function parentPathFromFolderKey(key: string): NodeId | null {
  const trimmed = key.endsWith("/") ? key.slice(0, -1) : key;
  if (!trimmed) {
    return null;
  }
  const idx = trimmed.lastIndexOf("/");
  if (idx === -1) {
    return null;
  }
  return `${trimmed.slice(0, idx + 1)}`;
}

export function removeNodesWithPrefix(nodes: Record<NodeId, Node>, prefix: string): void {
  Object.keys(nodes).forEach((key) => {
    if (key.startsWith(prefix)) {
      delete nodes[key];
    }
  });
}

export function openAncestorFolders(
  nodes: Record<NodeId, TreeNode>,
  openFolders: Record<NodeId, boolean>,
  startId: NodeId | null,
): Record<NodeId, boolean> {
  const updated = { ...openFolders };
  if (!startId) {
    return updated;
  }
  const visited = new Set<NodeId>();
  let current: NodeId | null = startId;
  while (current && !visited.has(current)) {
    visited.add(current);
    updated[current] = true;
    const node: TreeNode | undefined = nodes[current];
    if (!node || node.type !== "folder") {
      break;
    }
    current = node.parentId;
  }
  return updated;
}

export function pathSegmentsForSlug(path: string): string[] {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  if (!trimmed) {
    return [];
  }
  return trimmed.split("/");
}

export function slugifySegment(segment: string, stripExtension: boolean): string {
  let value = segment;
  if (stripExtension) {
    value = value.replace(/\.md$/i, "");
  }
  return value.trim().replace(/\s+/g, "-").toLowerCase();
}

export function buildSlugPath(node: TreeNode): string {
  const segments = pathSegmentsForSlug(node.path);
  if (segments.length === 0) {
    return "";
  }
  const slugSegments = segments.map((segment, index) => {
    const isFileSegment = node.type === "file" && index === segments.length - 1;
    return slugifySegment(segment, isFileSegment);
  });
  let slug = slugSegments.join("/");
  if (node.type === "folder" && slug) {
    slug = `${slug}/`;
  }
  return slug;
}

export function buildSlugState(nodes: Record<NodeId, TreeNode>): {
  slugToId: Record<string, NodeId>;
  idToSlug: Record<NodeId, string>;
} {
  const slugToId: Record<string, NodeId> = {};
  const idToSlug: Record<NodeId, string> = {};

  Object.values(nodes).forEach((node: TreeNode) => {
    const baseSlug = buildSlugPath(node);
    if (!baseSlug) {
      idToSlug[node.id] = node.id;
      return;
    }
    let slug = baseSlug;
    let counter = 2;
    while (slugToId[slug] && slugToId[slug] !== node.id) {
      if (node.type === "folder") {
        const folderSlug = baseSlug.replace(/\/$/, "");
        slug = `${folderSlug}-${counter}/`;
      } else {
        slug = `${baseSlug}-${counter}`;
      }
      counter += 1;
    }
    slugToId[slug] = node.id;
    idToSlug[node.id] = slug;
  });

  return { slugToId, idToSlug };
}

export function filterOpenFolders(
  openFolders: Record<NodeId, boolean>,
  nodes: Record<NodeId, TreeNode>,
): Record<NodeId, boolean> {
  const result: Record<NodeId, boolean> = {};
  Object.entries(openFolders).forEach(([id, isOpen]) => {
    const node = nodes[id];
    if (node && node.type === "folder") {
      result[id] = isOpen;
    }
  });
  return result;
}


export function sanitizeEtag(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.replace(/^W\//i, "").replace(/"/g, "");
}

export function formatIfNoneMatch(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return `"${value}"`;
}
