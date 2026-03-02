import type { NodeId } from "@/lib/tree/types";

export const ROOT_PARENT_KEY = "__root__";

export function parentKey(id: NodeId | null): string {
  return id ?? ROOT_PARENT_KEY;
}

export function appendToHistoryIfNew(history: NodeId[], id: NodeId): NodeId[] {
  const lastId = history.length > 0 ? history[history.length - 1] : null;
  return lastId === id ? history : [...history, id];
}

export function persistLastViewedFile(id: NodeId): void {
  void import("@/lib/persistent-preferences").then(({ saveLastViewedFile }) => {
    void saveLastViewedFile(id);
  });
}
