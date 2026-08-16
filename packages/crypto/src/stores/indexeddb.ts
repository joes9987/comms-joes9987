/**
 * SecureStore backed by IndexedDB - the canonical web persistence layer.
 *
 * IndexedDB itself isn't "secure" the way the OS keychain is, but it survives
 * page reloads and is per-origin. For a real production deployment we would
 * additionally wrap stored values with a key derived from the user's password
 * via PBKDF2/Argon2. For now we store as-is; the threat model is "another tab
 * on lime.app shouldn't see plaintext keys" and same-origin policy gives us
 * that.
 */
import type { SecureStore } from '../storage';

const DB_NAME = 'lime-crypto';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available in this environment'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

function awaitReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class IndexedDbSecureStore implements SecureStore {
  private dbPromise = openDb();

  async get(key: string): Promise<string | null> {
    const db = await this.dbPromise;
    const result = await awaitReq<string | undefined>(tx(db, 'readonly').get(key) as IDBRequest<string | undefined>);
    return result ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const db = await this.dbPromise;
    await awaitReq(tx(db, 'readwrite').put(value, key));
  }

  async delete(key: string): Promise<void> {
    const db = await this.dbPromise;
    await awaitReq(tx(db, 'readwrite').delete(key));
  }

  async list(prefix: string): Promise<string[]> {
    const db = await this.dbPromise;
    const out: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const req = tx(db, 'readonly').openKeyCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve();
          return;
        }
        const k = String(cursor.key);
        if (k.startsWith(prefix)) out.push(k);
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
    return out;
  }
}
