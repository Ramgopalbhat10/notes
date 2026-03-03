import { useMemo } from "react";

import { slugifySegment } from "@/lib/tree/utils";
import type { Node, NodeId, RouteTargetState } from "@/lib/tree/types";

type UseResolvedPathOptions = {
  selectedPath: string | null;
  routeTarget: RouteTargetState;
  nodes: Record<NodeId, Node>;
  rootIds: NodeId[];
};

export function useResolvedPath({
  selectedPath,
  routeTarget,
  nodes,
  rootIds,
}: UseResolvedPathOptions): string | null {
  return useMemo(() => {
    if (selectedPath) return selectedPath;
    if (!routeTarget?.path) return null;

    const slugParts = routeTarget.path.split("/");
    const resolvedParts: string[] = [];
    let currentScopeIds = rootIds;

    for (const slugPart of slugParts) {
      let found = false;
      for (const id of currentScopeIds) {
        const node = nodes[id];
        if (!node) {
          continue;
        }

        const slug = slugifySegment(node.name, node.type === "file");
        if (slug === slugPart) {
          resolvedParts.push(node.name);
          if (node.type === "folder") {
            currentScopeIds = node.children;
          }
          found = true;
          break;
        }
      }

      if (!found) {
        resolvedParts.push(slugPart);
      }
    }

    return resolvedParts.join("/");
  }, [selectedPath, routeTarget?.path, nodes, rootIds]);
}
