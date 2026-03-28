import type { FileTreeManifest } from "@/lib/file-tree-manifest";
import { isFolderNode } from "@/lib/file-tree-manifest";
import type { FileNode, FolderNode, Node, NodeId } from "@/lib/tree/types";
import { buildNormalizedSearchText, buildSlugState } from "@/lib/tree/utils";

export type BuiltManifestState = {
  nodes: Record<NodeId, Node>;
  rootIds: NodeId[];
  slugToId: Record<string, NodeId>;
  idToSlug: Record<NodeId, string>;
};

export function buildStateFromManifest(manifest: FileTreeManifest): BuiltManifestState {
  const nodes: Record<NodeId, Node> = {};

  manifest.nodes.forEach((entry) => {
    if (isFolderNode(entry)) {
      const path = entry.path.endsWith("/") ? entry.path : `${entry.path}/`;
      nodes[entry.id] = {
        id: entry.id,
        type: "folder",
        name: entry.name,
        path,
        parentId: entry.parentId,
        normalizedSearchText: buildNormalizedSearchText(entry.name, path),
        children: [...entry.childrenIds],
        childrenLoaded: true,
        lastModified: entry.lastModified,
      } satisfies FolderNode;
    } else {
      nodes[entry.id] = {
        id: entry.id,
        type: "file",
        name: entry.name,
        path: entry.path,
        parentId: entry.parentId,
        normalizedSearchText: buildNormalizedSearchText(entry.name, entry.path),
        etag: entry.etag,
        lastModified: entry.lastModified,
        size: entry.size,
      } satisfies FileNode;
    }
  });

  const { slugToId, idToSlug } = buildSlugState(nodes);

  return {
    nodes,
    rootIds: [...manifest.rootIds],
    slugToId,
    idToSlug,
  };
}
