import type { TreeSnapshot } from "./types";

export function captureTreeSnapshot(snapshot: TreeSnapshot): TreeSnapshot {
  return structuredClone(snapshot);
}

export function restoreTreeSnapshot<TState extends TreeSnapshot>(
  set: (updater: (state: TState) => Partial<TState>) => void,
  snapshot: TreeSnapshot,
) {
  const cloned = structuredClone(snapshot);
  set((current) => ({
    ...current,
    ...cloned,
  }));
}
