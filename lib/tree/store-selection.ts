import type { Node, NodeId } from "@/lib/tree/types";
import { slugifySegment } from "@/lib/tree/utils";

export const ROOT_PARENT_KEY = "__root__";

export function parentKey(id: NodeId | null): string {
  return id ?? ROOT_PARENT_KEY;
}

export function appendToHistoryIfNew(history: NodeId[], id: NodeId): NodeId[] {
  const lastId = history.length > 0 ? history[history.length - 1] : null;
  return lastId === id ? history : [...history, id];
}

export function persistLastViewedFile(id: NodeId): void {
  void import("@/lib/platform/persistent-preferences").then(({ saveLastViewedFile }) => {
    void saveLastViewedFile(id);
  });
}

export function buildRouteSlugKey(path: string): { canonicalPath: string; slugKey: string } {
  let canonicalPath = path;
  while (canonicalPath.startsWith("/")) canonicalPath = canonicalPath.slice(1);
  const hasTrailingSlash = canonicalPath.endsWith("/");
  let withoutTrailing = canonicalPath;
  while (withoutTrailing.endsWith("/")) withoutTrailing = withoutTrailing.slice(0, -1);
  const segments = withoutTrailing
    ? withoutTrailing.split("/").filter((segment) => segment.length > 0)
    : [];

  const slugSegments = segments.map((segment, index) => {
    const isLast = index === segments.length - 1;
    return slugifySegment(segment, isLast && !hasTrailingSlash);
  });

  const baseSlug = slugSegments.join("/");
  const slugKey = hasTrailingSlash ? (baseSlug ? `${baseSlug}/` : "") : baseSlug;
  return { canonicalPath, slugKey };
}

export function findRouteTargetNode(
  nodes: Record<NodeId, Node>,
  slugToId: Record<string, NodeId>,
  slugKey: string,
  canonicalPath: string,
): Node | undefined {
  let target: Node | undefined;

  if (slugKey) {
    target = slugToId[slugKey] ? nodes[slugToId[slugKey]] : undefined;
    if (!target && !slugKey.endsWith("/")) {
      const folderKey = `${slugKey}/`;
      target = slugToId[folderKey] ? nodes[slugToId[folderKey]] : undefined;
    }
  }

  if (target) {
    return target;
  }

  const exact = nodes[canonicalPath];
  if (exact) {
    return exact;
  }

  return canonicalPath.endsWith("/") ? undefined : nodes[`${canonicalPath}/`];
}
