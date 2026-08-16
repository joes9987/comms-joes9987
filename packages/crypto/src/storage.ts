/**
 * Pluggable secure key/value storage so the same crypto module works on:
 *   - mobile (expo-secure-store)
 *   - web    (IndexedDB wrapped with WebCrypto-derived key)
 *   - tests  (in-memory)
 */

export interface SecureStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

export class InMemoryStore implements SecureStore {
  private map = new Map<string, string>();
  async get(key: string) {
    return this.map.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.map.set(key, value);
  }
  async delete(key: string) {
    this.map.delete(key);
  }
  async list(prefix: string) {
    return [...this.map.keys()].filter((k) => k.startsWith(prefix));
  }
}
