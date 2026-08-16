/**
 * Symmetric AES-GCM encryption for chat / DM / close-friends-status media.
 * The wrapped key is sent inside the Signal envelope so the server only
 * ever stores ciphertext.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export interface EncryptedMedia {
  ciphertext: Uint8Array;
  key: Uint8Array; // raw AES-256 key
  iv: Uint8Array; // 12-byte GCM nonce
}

function getCrypto(): Crypto {
  // Available natively in browsers, React Native (via getRandomValues polyfill +
  // expo-crypto/react-native-quick-crypto), and Node 20+.
  let c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c && typeof process !== 'undefined' && process.versions?.node) {
    // Older-Node fallback. We resolve the module name at runtime so webpack
    // doesn't try to bundle `node:crypto` for the browser build.
    try {
      const moduleName = ['node', 'crypto'].join(':');
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
      const req: any = eval('require');
      c = req(moduleName).webcrypto as Crypto;
    } catch {
      /* fall through to throw below */
    }
  }
  if (!c) throw new Error('No WebCrypto available');
  return c;
}

export async function encryptMedia(plaintext: Uint8Array): Promise<EncryptedMedia> {
  const c = getCrypto();
  const key = c.getRandomValues(new Uint8Array(32));
  const iv = c.getRandomValues(new Uint8Array(12));
  const cryptoKey = await c.subtle.importKey('raw', key as BufferSource, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(
    await c.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, cryptoKey, plaintext as BufferSource),
  );
  return { ciphertext: ct, key, iv };
}

export async function decryptMedia(
  ciphertext: Uint8Array,
  key: Uint8Array,
  iv: Uint8Array,
): Promise<Uint8Array> {
  const c = getCrypto();
  const cryptoKey = await c.subtle.importKey('raw', key as BufferSource, 'AES-GCM', false, ['decrypt']);
  return new Uint8Array(
    await c.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, cryptoKey, ciphertext as BufferSource),
  );
}

export function packMediaKey(key: Uint8Array, iv: Uint8Array): string {
  const buf = new Uint8Array(key.length + iv.length);
  buf.set(key, 0);
  buf.set(iv, key.length);
  return btoa(String.fromCharCode(...buf));
}

export function unpackMediaKey(packed: string): { key: Uint8Array; iv: Uint8Array } {
  const buf = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
  return { key: buf.slice(0, 32), iv: buf.slice(32, 44) };
}

export function utf8(s: string) {
  return enc.encode(s);
}
export function fromUtf8(b: Uint8Array) {
  return dec.decode(b);
}
