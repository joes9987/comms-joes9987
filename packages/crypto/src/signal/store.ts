/**
 * StorageType implementation for @privacyresearch/libsignal-protocol-typescript
 * backed by Lime's pluggable SecureStore (IndexedDB on web, expo-secure-store
 * on mobile, in-memory in tests).
 *
 * libsignal's StorageType expects:
 *   - identity key pair  (KeyPairType<ArrayBuffer>)
 *   - registration id    (number)
 *   - prekey records     (KeyPairType<ArrayBuffer>) keyed by id
 *   - signed prekey      (KeyPairType<ArrayBuffer>) keyed by id
 *   - session records    (string) keyed by SignalProtocolAddress.toString()
 *   - identity records   (per-address ArrayBuffer pubkey, used for trust)
 *
 * We persist everything as JSON-encoded base64 strings via SecureStore, namespaced
 * with a stable prefix so a single store can hold multiple "Signal accounts" if
 * we ever want that.
 */
import type { Direction, KeyPairType, SessionRecordType, StorageType } from '@privacyresearch/libsignal-protocol-typescript';
import type { SecureStore } from '../storage';
import { abToBase64, base64ToAb } from '../util';

const NS = 'lime.signal.';
const KEY_IDENTITY_KP = `${NS}identityKeyPair`;
const KEY_REG_ID = `${NS}registrationId`;
const PREFIX_PREKEY = `${NS}prekey.`;
const PREFIX_SIGNED_PREKEY = `${NS}signedPrekey.`;
const PREFIX_SESSION = `${NS}session.`;
const PREFIX_IDENTITY = `${NS}identity.`;

interface SerializedKeyPair { pubKey: string; privKey: string }

function serializeKp(kp: KeyPairType<ArrayBuffer>): string {
  const out: SerializedKeyPair = {
    pubKey: abToBase64(kp.pubKey),
    privKey: abToBase64(kp.privKey),
  };
  return JSON.stringify(out);
}

function deserializeKp(raw: string): KeyPairType<ArrayBuffer> {
  const j = JSON.parse(raw) as SerializedKeyPair;
  return { pubKey: base64ToAb(j.pubKey), privKey: base64ToAb(j.privKey) };
}

function abEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const av = new Uint8Array(a);
  const bv = new Uint8Array(b);
  for (let i = 0; i < av.length; i++) if (av[i] !== bv[i]) return false;
  return true;
}

export class LimeSignalStore implements StorageType {
  constructor(private store: SecureStore) {}

  // ---- identity ----

  async getIdentityKeyPair(): Promise<KeyPairType<ArrayBuffer> | undefined> {
    const raw = await this.store.get(KEY_IDENTITY_KP);
    return raw ? deserializeKp(raw) : undefined;
  }

  async getLocalRegistrationId(): Promise<number | undefined> {
    const raw = await this.store.get(KEY_REG_ID);
    return raw ? Number(raw) : undefined;
  }

  async setIdentityKeyPair(kp: KeyPairType<ArrayBuffer>): Promise<void> {
    await this.store.set(KEY_IDENTITY_KP, serializeKp(kp));
  }

  async setLocalRegistrationId(id: number): Promise<void> {
    await this.store.set(KEY_REG_ID, String(id));
  }

  async isTrustedIdentity(
    identifier: string,
    identityKey: ArrayBuffer,
    _direction: Direction,
  ): Promise<boolean> {
    if (!identifier) throw new Error('Empty identifier passed to isTrustedIdentity');
    const trusted = await this.store.get(PREFIX_IDENTITY + identifier);
    if (!trusted) return true; // first sighting -> TOFU.
    return abEqual(base64ToAb(trusted), identityKey);
  }

  async saveIdentity(
    encodedAddress: string,
    publicKey: ArrayBuffer,
    _nonblockingApproval?: boolean,
  ): Promise<boolean> {
    if (!encodedAddress) throw new Error('Empty address passed to saveIdentity');
    const existing = await this.store.get(PREFIX_IDENTITY + encodedAddress);
    await this.store.set(PREFIX_IDENTITY + encodedAddress, abToBase64(publicKey));
    if (!existing) return false;
    return !abEqual(base64ToAb(existing), publicKey); // returns true if changed.
  }

  // ---- prekeys ----

  async loadPreKey(keyId: number | string): Promise<KeyPairType<ArrayBuffer> | undefined> {
    const raw = await this.store.get(PREFIX_PREKEY + String(keyId));
    return raw ? deserializeKp(raw) : undefined;
  }

  async storePreKey(keyId: number | string, keyPair: KeyPairType<ArrayBuffer>): Promise<void> {
    await this.store.set(PREFIX_PREKEY + String(keyId), serializeKp(keyPair));
  }

  async removePreKey(keyId: number | string): Promise<void> {
    await this.store.delete(PREFIX_PREKEY + String(keyId));
  }

  // ---- signed prekeys ----

  async loadSignedPreKey(keyId: number | string): Promise<KeyPairType<ArrayBuffer> | undefined> {
    const raw = await this.store.get(PREFIX_SIGNED_PREKEY + String(keyId));
    return raw ? deserializeKp(raw) : undefined;
  }

  async storeSignedPreKey(keyId: number | string, keyPair: KeyPairType<ArrayBuffer>): Promise<void> {
    await this.store.set(PREFIX_SIGNED_PREKEY + String(keyId), serializeKp(keyPair));
  }

  async removeSignedPreKey(keyId: number | string): Promise<void> {
    await this.store.delete(PREFIX_SIGNED_PREKEY + String(keyId));
  }

  // ---- sessions ----

  async loadSession(encodedAddress: string): Promise<SessionRecordType | undefined> {
    const raw = await this.store.get(PREFIX_SESSION + encodedAddress);
    return raw ?? undefined;
  }

  async storeSession(encodedAddress: string, record: SessionRecordType): Promise<void> {
    await this.store.set(PREFIX_SESSION + encodedAddress, record);
  }

  // ---- helpers ----

  /** Lists all stored prekey ids. */
  async listPreKeyIds(): Promise<number[]> {
    const keys = await this.store.list(PREFIX_PREKEY);
    return keys
      .map((k) => Number(k.slice(PREFIX_PREKEY.length)))
      .filter((n) => Number.isFinite(n));
  }

  /** Wipes everything Signal-related. Used by Settings → Regenerate identity keys. */
  async reset(): Promise<void> {
    const pre = await this.store.list(PREFIX_PREKEY);
    const signed = await this.store.list(PREFIX_SIGNED_PREKEY);
    const sess = await this.store.list(PREFIX_SESSION);
    const id = await this.store.list(PREFIX_IDENTITY);
    for (const k of [...pre, ...signed, ...sess, ...id, KEY_IDENTITY_KP, KEY_REG_ID]) {
      await this.store.delete(k);
    }
  }
}
