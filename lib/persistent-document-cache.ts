import { openDB, type IDBPDatabase } from "idb";

export type PersistentDocumentRecord = {
  content: string;
  etag: string | null;
  lastModified: string | null;
};

const DB_NAME = "mrgb-file-cache";
const STORE_NAME = "documents";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

async function getDb(): Promise<IDBPDatabase | null> {
  if (!isBrowser()) {
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export type PersistentDocumentEvictionEvent =
  | { type: "single"; key: string }
  | { type: "many"; keys: string[]; prefix?: string };

type EvictionListener = (event: PersistentDocumentEvictionEvent) => void;

const evictionListeners = new Set<EvictionListener>();

function notifyEviction(event: PersistentDocumentEvictionEvent): void {
  for (const listener of evictionListeners) {
    try {
      listener(event);
    } catch {
      // ignore listener errors to avoid breaking eviction flow
    }
  }
}

export function subscribePersistentDocumentEvictions(listener: EvictionListener): () => void {
  evictionListeners.add(listener);
  return () => {
    evictionListeners.delete(listener);
  };
}

export async function loadPersistentDocument(key: string): Promise<PersistentDocumentRecord | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }
  return (await db.get(STORE_NAME, key)) ?? undefined;
}

export async function savePersistentDocument(
  key: string,
  value: PersistentDocumentRecord,
): Promise<void> {
  const db = await getDb();
  if (!db) {
    return;
  }
  await db.put(STORE_NAME, value, key);
}

export async function removePersistentDocument(key: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    return;
  }
  await db.delete(STORE_NAME, key);
  notifyEviction({ type: "single", key });
}

export async function removePersistentDocumentsWithPrefix(prefix: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    return;
  }

  const tx = db.transaction(STORE_NAME, "readwrite");
  const range = IDBKeyRange.bound(prefix, prefix + "\uffff");
  const removedKeys = (await tx.store.getAllKeys(range)) as string[];

  if (removedKeys.length > 0) {
    await tx.store.delete(range);
  }
  await tx.done;
  if (removedKeys.length > 0) {
    notifyEviction({ type: "many", keys: removedKeys, prefix });
  }
}

export async function renamePersistentDocument(oldKey: string, newKey: string): Promise<void> {
  if (oldKey === newKey) {
    return;
  }
  const db = await getDb();
  if (!db) {
    return;
  }
  const existing = await db.get(STORE_NAME, oldKey);
  if (!existing) {
    return;
  }
  await db.delete(STORE_NAME, oldKey);
  await db.put(STORE_NAME, existing, newKey);
}

export async function clearPersistentDocuments(): Promise<void> {
  const db = await getDb();
  if (!db) {
    return;
  }
  await db.clear(STORE_NAME);
}
