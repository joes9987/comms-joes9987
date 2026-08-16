/**
 * Identity + prekey management.
 *
 * NOTE: This module is intentionally written against an abstract Signal-protocol
 * surface (`SignalAdapter`) so it can be swapped between:
 *   - `@signalapp/libsignal-client` (default, native modules on iOS/Android, WASM on web)
 *   - `libolm` fallback if libsignal can't build for a target
 *
 * The adapter is injected at runtime (see `index.ts`).
 */

import type { SecureStore } from './storage';

export interface IdentityKeys {
  registrationId: number;
  identityKeyPublic: string; // base64
  identityKeyPrivate: string; // base64
}

export interface SignedPreKey {
  id: number;
  publicKey: string;
  privateKey: string;
  signature: string;
}

export interface OneTimePreKey {
  id: number;
  publicKey: string;
  privateKey: string;
}

export interface PreKeyBundleOut {
  registrationId: number;
  identityKey: string;
  signedPreKey: { id: number; publicKey: string; signature: string };
  oneTimePreKeys: { id: number; publicKey: string }[];
}

export interface SignalAdapter {
  generateIdentity(): Promise<IdentityKeys>;
  generateSignedPreKey(identityPriv: string, id: number): Promise<SignedPreKey>;
  generateOneTimePreKeys(start: number, count: number): Promise<OneTimePreKey[]>;
  encrypt(args: {
    plaintext: Uint8Array;
    remoteIdentityKey: string;
    remoteSignedPreKey: { id: number; publicKey: string; signature: string };
    remoteOneTimePreKey?: { id: number; publicKey: string };
    sessionState?: string;
  }): Promise<{ ciphertext: string; type: number; sessionState: string }>;
  decrypt(args: {
    ciphertext: string;
    type: number;
    ourIdentity: IdentityKeys;
    ourSignedPreKey: SignedPreKey;
    ourOneTimePreKeys: OneTimePreKey[];
    sessionState?: string;
  }): Promise<{ plaintext: Uint8Array; sessionState: string }>;
}

const KEY_IDENTITY = 'lime.identity';
const KEY_SIGNED_PREKEY = 'lime.signedPreKey';
const KEY_PREKEY_PREFIX = 'lime.preKey.';
const KEY_SESSION_PREFIX = 'lime.session.';

export class IdentityManager {
  constructor(
    private store: SecureStore,
    private signal: SignalAdapter,
  ) {}

  async getOrCreateIdentity(): Promise<IdentityKeys> {
    const existing = await this.store.get(KEY_IDENTITY);
    if (existing) return JSON.parse(existing) as IdentityKeys;
    const id = await this.signal.generateIdentity();
    await this.store.set(KEY_IDENTITY, JSON.stringify(id));
    return id;
  }

  async ensurePreKeys(opts: { signedPreKeyId?: number; oneTimeCount?: number } = {}) {
    const identity = await this.getOrCreateIdentity();
    let signed = await this.getSignedPreKey();
    if (!signed) {
      signed = await this.signal.generateSignedPreKey(
        identity.identityKeyPrivate,
        opts.signedPreKeyId ?? 1,
      );
      await this.store.set(KEY_SIGNED_PREKEY, JSON.stringify(signed));
    }
    const existing = await this.store.list(KEY_PREKEY_PREFIX);
    if (existing.length < 10) {
      const start = existing.length;
      const count = (opts.oneTimeCount ?? 100) - existing.length;
      const fresh = await this.signal.generateOneTimePreKeys(start, count);
      for (const p of fresh) {
        await this.store.set(`${KEY_PREKEY_PREFIX}${p.id}`, JSON.stringify(p));
      }
    }
  }

  async exportBundle(): Promise<PreKeyBundleOut> {
    const identity = await this.getOrCreateIdentity();
    const signed = await this.getSignedPreKey();
    if (!signed) throw new Error('No signed prekey - call ensurePreKeys() first');
    const otpKeys = await this.listOneTimePreKeys();
    return {
      registrationId: identity.registrationId,
      identityKey: identity.identityKeyPublic,
      signedPreKey: { id: signed.id, publicKey: signed.publicKey, signature: signed.signature },
      oneTimePreKeys: otpKeys.slice(0, 50).map((k) => ({ id: k.id, publicKey: k.publicKey })),
    };
  }

  async getSignedPreKey(): Promise<SignedPreKey | null> {
    const raw = await this.store.get(KEY_SIGNED_PREKEY);
    return raw ? (JSON.parse(raw) as SignedPreKey) : null;
  }

  async listOneTimePreKeys(): Promise<OneTimePreKey[]> {
    const keys = await this.store.list(KEY_PREKEY_PREFIX);
    const out: OneTimePreKey[] = [];
    for (const k of keys) {
      const raw = await this.store.get(k);
      if (raw) out.push(JSON.parse(raw) as OneTimePreKey);
    }
    return out;
  }

  async sessionKey(remoteUserId: string, remoteDeviceId: number) {
    return `${KEY_SESSION_PREFIX}${remoteUserId}.${remoteDeviceId}`;
  }

  async loadSession(remoteUserId: string, remoteDeviceId: number) {
    const k = await this.sessionKey(remoteUserId, remoteDeviceId);
    return this.store.get(k);
  }

  async saveSession(remoteUserId: string, remoteDeviceId: number, state: string) {
    const k = await this.sessionKey(remoteUserId, remoteDeviceId);
    await this.store.set(k, state);
  }
}
