import type { RefreshState } from "./types";
import { getErrorMessage } from "@/lib/http/client";

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

type ManifestEtagState = {
  manifestEtag: string | null;
};

export function createMutationQueue<TState extends MutationState & ManifestEtagState>(
  set: StoreSetter<TState>,
  get: StoreGetter<TState>,
  _reloadManifest: ReloadManifest,
) {
  void _reloadManifest;
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
        // Don't reload manifest after mutations. The optimistic state is already
        // correct, and the server-side manifest was updated by the API route.
        // With stale-while-revalidate caching (revalidateTag with 'max'), the
        // first reload would receive stale data, overwriting the optimistic state.
        // Clear manifestEtag so the next natural tree load fetches fresh data.
        set((state) => ({
          pendingMutations: Math.max(0, state.pendingMutations - 1),
          manifestEtag: null,
        } as Partial<TState>));
      } catch (error) {
        job.rollback();
        const message = getErrorMessage(error, "Failed to update file tree");
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
