/**
 * SecureStore implementation for React Native via `expo-secure-store`.
 *
 * Notes:
 * - expo-secure-store has a per-key value size limit of ~2KB on iOS keychain.
 *   That's plenty for identity/signed prekeys but Signal session records can
 *   exceed it on long-lived sessions. We chunk values >1.5KB into multiple
 *   keychain entries (`<key>.chunk.<n>`) to stay under the limit.
 * - `list()` is not supported by expo-secure-store, so we maintain an index
 *   key (`__keys__`) per prefix.
 */
import type { SecureStore } from '../storage';

interface ExpoSecureStoreModule {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

const CHUNK_SIZE = 1500;
const KEY_INDEX = '__lime_signal_keys__';

export class ExpoSecureStoreAdapter implements SecureStore {
  constructor(private mod: ExpoSecureStoreModule) {}

  private async readIndex(): Promise<string[]> {
    const raw = await this.mod.getItemAsync(KEY_INDEX);
    return raw ? (JSON.parse(raw) as string[]) : [];
  }

  private async writeIndex(keys: string[]): Promise<void> {
    await this.mod.setItemAsync(KEY_INDEX, JSON.stringify(keys));
  }

  async get(key: string): Promise<string | null> {
    const head = await this.mod.getItemAsync(`${key}.0`);
    if (head === null) return null;
    const meta = JSON.parse(head) as { chunks: number };
    let out = '';
    for (let i = 1; i <= meta.chunks; i++) {
      const part = await this.mod.getItemAsync(`${key}.${i}`);
      if (part === null) return null;
      out += part;
    }
    return out;
  }

  async set(key: string, value: string): Promise<void> {
    await this.delete(key);
    const chunks = Math.ceil(value.length / CHUNK_SIZE) || 1;
    await this.mod.setItemAsync(`${key}.0`, JSON.stringify({ chunks }));
    for (let i = 0; i < chunks; i++) {
      const slice = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await this.mod.setItemAsync(`${key}.${i + 1}`, slice);
    }
    const idx = await this.readIndex();
    if (!idx.includes(key)) {
      idx.push(key);
      await this.writeIndex(idx);
    }
  }

  async delete(key: string): Promise<void> {
    const head = await this.mod.getItemAsync(`${key}.0`);
    if (head !== null) {
      const meta = JSON.parse(head) as { chunks: number };
      for (let i = 0; i <= meta.chunks; i++) {
        await this.mod.deleteItemAsync(`${key}.${i}`);
      }
    }
    const idx = await this.readIndex();
    const next = idx.filter((k) => k !== key);
    if (next.length !== idx.length) await this.writeIndex(next);
  }

  async list(prefix: string): Promise<string[]> {
    const idx = await this.readIndex();
    return idx.filter((k) => k.startsWith(prefix));
  }
}
