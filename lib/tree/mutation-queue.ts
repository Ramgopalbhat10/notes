import type { RefreshState } from "./types";

type StoreSetter<TState> = (updater: Partial<TState> | ((state: TState) => Partial<TState>)) => void;
type StoreGetter<TState> = () => TState;
type ReloadManifest = () => Promise<void>;

export type MutationJob = {
  description: string;
  perform: () => Promise<void>;
  rollback: () => void;
};

type MutationState = {
  pendingMutations: number;
  refreshState: RefreshState;
  refreshError: string | null;
  refreshLastSource: "manual" | "silent" | "mutation" | null;
};

export function createMutationQueue<TState extends MutationState>(
  set: StoreSetter<TState>,
  get: StoreGetter<TState>,
  reloadManifest: ReloadManifest,
) {
  const queue: MutationJob[] = [];
  let processing = false;

  const process = async () => {
    if (processing) {
      return;
    }
    processing = true;
    while (queue.length > 0) {
      const job = queue.shift()!;
      try {
        await job.perform();
        set((state) => ({ pendingMutations: Math.max(0, state.pendingMutations - 1) } as Partial<TState>));
        // Reload manifest from server (already updated by API endpoint via incremental update)
        await reloadManifest();
      } catch (error) {
        job.rollback();
        const message = error instanceof Error ? error.message : "Failed to update file tree";
        set((state) => ({
          pendingMutations: Math.max(0, state.pendingMutations - 1),
          refreshError: message,
          refreshLastSource: "mutation",
          refreshState: Math.max(0, state.pendingMutations - 1) > 0 ? "pending" : "idle",
        } as Partial<TState>));
      }
    }
    processing = false;
    const state = get();
    if (state.pendingMutations === 0 && state.refreshState === "pending") {
      set({ refreshState: "idle" } as Partial<TState>);
    }
  };

  return (job: MutationJob) => {
    queue.push(job);
    set((state) => ({
      pendingMutations: state.pendingMutations + 1,
      refreshState: state.refreshState === "idle" ? "pending" : state.refreshState,
    } as Partial<TState>));
    void process();
  };
}
