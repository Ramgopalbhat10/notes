import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "mrgb-preferences";
const STORE_NAME = "preferences";
const DB_VERSION = 1;

const LAST_VIEWED_KEY = "lastViewedFile";

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

export async function saveLastViewedFile(key: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.put(STORE_NAME, key, LAST_VIEWED_KEY);
  } catch (error) {
    console.error("Failed to save last viewed file", error);
  }
}

export async function loadLastViewedFile(): Promise<string | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const value = await db.get(STORE_NAME, LAST_VIEWED_KEY);
    return typeof value === "string" ? value : null;
  } catch (error) {
    console.error("Failed to load last viewed file", error);
    return null;
  }
}

export async function clearLastViewedFile(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.delete(STORE_NAME, LAST_VIEWED_KEY);
  } catch (error) {
    console.error("Failed to clear last viewed file", error);
  }
}
