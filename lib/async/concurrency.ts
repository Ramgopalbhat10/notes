export async function mapWithConcurrencyLimit<T, TResult>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  if (items.length === 0) {
    return [];
  }

  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex] as T, currentIndex);
      }
    }),
  );

  return results;
}

export async function processQueueWithConcurrencyLimit<T>({
  initialItems,
  concurrency,
  processItem,
}: {
  initialItems: readonly T[];
  concurrency: number;
  processItem: (item: T, enqueue: (nextItem: T) => void) => Promise<void>;
}): Promise<void> {
  if (initialItems.length === 0) {
    return;
  }

  const queue = [...initialItems];
  const limit = Math.max(1, concurrency);
  let pendingCount = queue.length;
  let error: unknown = null;
  let wakePromise: Promise<void> | null = null;
  let resolveWake: (() => void) | null = null;

  const wakeWorkers = () => {
    if (!resolveWake) {
      return;
    }
    const resolve = resolveWake;
    resolveWake = null;
    wakePromise = null;
    resolve();
  };

  const enqueue = (nextItem: T) => {
    queue.push(nextItem);
    pendingCount += 1;
    wakeWorkers();
  };

  const waitForWork = async () => {
    if (pendingCount === 0 || error) {
      return;
    }
    if (!wakePromise) {
      wakePromise = new Promise<void>((resolve) => {
        resolveWake = resolve;
      });
    }
    await wakePromise;
  };

  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (true) {
        if (error) {
          return;
        }

        const currentItem = queue.shift();
        if (currentItem === undefined) {
          if (pendingCount === 0) {
            return;
          }
          await waitForWork();
          continue;
        }

        try {
          await processItem(currentItem, enqueue);
        } catch (processError) {
          error = processError;
          wakeWorkers();
          return;
        } finally {
          pendingCount -= 1;
          if (pendingCount === 0) {
            wakeWorkers();
          }
        }
      }
    }),
  );

  if (error) {
    throw error;
  }
}
