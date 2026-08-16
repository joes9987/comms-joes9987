/**
 * Group / close-friends client built on top of the SenderKey primitives in
 * `group.ts`. Same shape on both sides:
 *
 *   - Owner generates a SenderKey per (groupId).
 *   - Owner distributes the SenderKey to every member by encrypting it with
 *     their pairwise Signal session (envelope `kind: 'group_session'`).
 *   - When sending a message: AES-GCM with a per-message key derived by
 *     ratcheting the SenderKey. The ratchet state is persisted so the next
 *     message uses the next key.
 *   - When receiving a message: lookup SenderKey by (groupId, senderId) and
 *     fast-forward the chain to the message's iteration.
 *
 * "Close-friends statuses" are modelled as a group whose id == the author's
 * user id (one group per author). Posting a close-friends status is exactly
 * `encryptForGroup(authorUserId, plaintext)`.
 */
import {
  encryptForGroup,
  ratchet,
  type SenderKeyState,
  newSenderKey,
  deriveMessageKey,
} from '../group';
import type { SecureStore } from '../storage';
import { abToBase64, base64ToAb } from '../util';

const PREFIX = 'lime.group.';

interface SerializedSenderKey {
  groupId: string;
  senderId: string;
  iteration: number;
  chainKey: string; // base64
}

function serialize(s: SenderKeyState): string {
  const out: SerializedSenderKey = {
    groupId: s.groupId,
    senderId: s.senderId,
    iteration: s.iteration,
    chainKey: abToBase64(s.chainKey),
  };
  return JSON.stringify(out);
}

function deserialize(raw: string): SenderKeyState {
  const j = JSON.parse(raw) as SerializedSenderKey;
  return {
    groupId: j.groupId,
    senderId: j.senderId,
    iteration: j.iteration,
    chainKey: new Uint8Array(base64ToAb(j.chainKey)),
  };
}

function key(groupId: string, senderId: string): string {
  return `${PREFIX}${groupId}.${senderId}`;
}

/** Wire format for a SenderKey distribution message (sent inside a 1:1 Signal envelope). */
export interface SenderKeyDistribution {
  groupId: string;
  iteration: number;
  chainKey: string; // base64
}

export class LimeGroupClient {
  constructor(
    private store: SecureStore,
    private localUserId: string,
  ) {}

  /** Lazily creates a brand-new SenderKey for a group (call once per group on the owner side). */
  async ensureOwnSenderKey(groupId: string): Promise<SenderKeyState> {
    const existing = await this.store.get(key(groupId, this.localUserId));
    if (existing) return deserialize(existing);
    const fresh = await newSenderKey(groupId, this.localUserId);
    await this.store.set(key(groupId, this.localUserId), serialize(fresh));
    return fresh;
  }

  /** Returns the wire-format payload to encrypt and send to each new member. */
  async exportSenderKey(groupId: string): Promise<SenderKeyDistribution> {
    const s = await this.ensureOwnSenderKey(groupId);
    return {
      groupId,
      iteration: s.iteration,
      chainKey: abToBase64(s.chainKey),
    };
  }

  /** Stores a SenderKey received from another member (after Signal-decrypting it). */
  async ingestSenderKey(senderId: string, dist: SenderKeyDistribution): Promise<void> {
    const state: SenderKeyState = {
      groupId: dist.groupId,
      senderId,
      iteration: dist.iteration,
      chainKey: new Uint8Array(base64ToAb(dist.chainKey)),
    };
    await this.store.set(key(dist.groupId, senderId), serialize(state));
  }

  /** Encrypts a plaintext for the group, ratcheting our SenderKey forward by one. */
  async encrypt(groupId: string, plaintext: Uint8Array): Promise<{
    ciphertext: string;
    iv: string;
    iteration: number;
  }> {
    const state = await this.ensureOwnSenderKey(groupId);
    const r = await encryptForGroup(state, plaintext);
    await this.store.set(key(groupId, this.localUserId), serialize(r.nextState));
    return {
      ciphertext: abToBase64(r.ciphertext),
      iv: abToBase64(r.iv),
      iteration: r.iteration,
    };
  }

  /**
   * Decrypts a group message. Fast-forwards the receiver's stored chain to the
   * message's iteration if needed (handles missed messages from the same sender
   * up to a small bound to avoid DoS).
   */
  async decrypt(args: {
    groupId: string;
    senderId: string;
    iteration: number;
    ciphertext: string;
    iv: string;
  }): Promise<Uint8Array> {
    const raw = await this.store.get(key(args.groupId, args.senderId));
    if (!raw) throw new Error(`No SenderKey for ${args.senderId} in group ${args.groupId}`);
    let state = deserialize(raw);
    if (args.iteration < state.iteration) {
      throw new Error('Out-of-order message older than current chain (replay?)');
    }
    const skipBound = 1000;
    if (args.iteration - state.iteration > skipBound) {
      throw new Error('Message too far ahead of current chain');
    }
    while (state.iteration < args.iteration) state = await ratchet(state);
    const messageKey = await deriveMessageKey(state);
    const plaintext = await aesGcmDecrypt(messageKey, base64ToAb(args.iv), base64ToAb(args.ciphertext));
    // Persist the advanced chain (without consuming this iteration's key).
    await this.store.set(key(args.groupId, args.senderId), serialize(await ratchet(state)));
    return new Uint8Array(plaintext);
  }

  /** Wipes a single group's state (e.g. when the user is removed). */
  async forget(groupId: string, senderId?: string): Promise<void> {
    if (senderId) {
      await this.store.delete(key(groupId, senderId));
      return;
    }
    const all = await this.store.list(`${PREFIX}${groupId}.`);
    for (const k of all) await this.store.delete(k);
  }
}

async function aesGcmDecrypt(messageKey: Uint8Array, iv: ArrayBuffer, ct: ArrayBuffer): Promise<ArrayBuffer> {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c) throw new Error('No WebCrypto available');
  const cryptoKey = await c.subtle.importKey('raw', messageKey as BufferSource, 'AES-GCM', false, ['decrypt']);
  return c.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, cryptoKey, ct as BufferSource);
}
