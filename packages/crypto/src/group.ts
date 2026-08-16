/**
 * Sender Keys for group chat AND close-friends statuses.
 *
 * The pattern:
 *   1. Group/close-friends-list owner generates a random "sender key".
 *   2. Owner ratchets the sender key per message (HKDF chain).
 *   3. The sender key itself is distributed to each member via 1:1 Signal sessions
 *      (so adding/removing a member triggers a new sender key + redistribution).
 *   4. Messages are AES-GCM with the per-message chain key.
 */

const SENDER_KEY_BYTES = 32;
const CHAIN_KEY_INFO = new TextEncoder().encode('lime/sender-chain/v1');
const MESSAGE_KEY_INFO = new TextEncoder().encode('lime/sender-message/v1');

function getCrypto(): Crypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c) throw new Error('No WebCrypto available');
  return c;
}

export interface SenderKeyState {
  groupId: string;
  senderId: string;
  iteration: number;
  chainKey: Uint8Array;
}

export async function newSenderKey(groupId: string, senderId: string): Promise<SenderKeyState> {
  const chainKey = getCrypto().getRandomValues(new Uint8Array(SENDER_KEY_BYTES));
  return { groupId, senderId, iteration: 0, chainKey };
}

async function hkdf(ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const c = getCrypto();
  const key = await c.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits']);
  const bits = await c.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32) as BufferSource, info: info as BufferSource },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

export async function ratchet(state: SenderKeyState): Promise<SenderKeyState> {
  const next = await hkdf(state.chainKey, CHAIN_KEY_INFO, SENDER_KEY_BYTES);
  return { ...state, iteration: state.iteration + 1, chainKey: next };
}

export async function deriveMessageKey(state: SenderKeyState): Promise<Uint8Array> {
  return hkdf(state.chainKey, MESSAGE_KEY_INFO, SENDER_KEY_BYTES);
}

export async function encryptForGroup(
  state: SenderKeyState,
  plaintext: Uint8Array,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array; iteration: number; nextState: SenderKeyState }> {
  const c = getCrypto();
  const messageKey = await deriveMessageKey(state);
  const iv = c.getRandomValues(new Uint8Array(12));
  const cryptoKey = await c.subtle.importKey('raw', messageKey as BufferSource, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(
    await c.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, cryptoKey, plaintext as BufferSource),
  );
  const next = await ratchet(state);
  return { ciphertext: ct, iv, iteration: state.iteration, nextState: next };
}
