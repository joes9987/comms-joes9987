/**
 * High-level Signal-protocol client used by the chat UI.
 *
 * Wraps @privacyresearch/libsignal-protocol-typescript with a small surface:
 *   - init()              : generate identity + signed prekey + N one-time prekeys
 *   - exportBundle()      : public bundle in the wire format the API stores
 *   - encryptToUser()     : encrypts plaintext for a remote (uses bundle if no
 *                           session yet)
 *   - decryptFromUser()   : decrypts a Signal envelope (handles both PreKey and
 *                           Whisper message types transparently)
 *   - hasSession()        : whether a session record exists for an address
 *   - reset()             : wipes the local store (regenerate identity)
 *
 * The library is stateful (sessions, prekeys, etc.) so all operations are
 * funneled through a single store instance.
 */
import {
  KeyHelper,
  SessionBuilder,
  SessionCipher,
  SignalProtocolAddress,
  type DeviceType,
  type MessageType,
} from '@privacyresearch/libsignal-protocol-typescript';
import type { SecureStore } from '../storage';
import { abToBase64, base64ToAb, abToUtf8, utf8ToAb } from '../util';
import { LimeSignalStore } from './store';

/** Wire-format bundle, matching `PreKeyBundleSchema` in @lime/shared. */
export interface WireBundle {
  user_id: string;
  device_id: number;
  registration_id: number;
  identity_key: string;
  signed_pre_key: { id: number; public_key: string; signature: string };
  one_time_pre_keys: { id: number; public_key: string }[];
}

export interface EncryptedEnvelope {
  ciphertext: string; // base64
  ciphertext_type: number; // 1 = WhisperMessage, 3 = PreKeyWhisperMessage
}

const SIGNED_PRE_KEY_ID = 1;
const FIRST_OTPK_ID = 1;
const NUM_ONE_TIME_PREKEYS = 100;

export class LimeSignalClient {
  readonly store: LimeSignalStore;
  private deviceId: number;
  private localUserId: string;

  constructor(opts: { store: SecureStore; userId: string; deviceId?: number }) {
    this.store = new LimeSignalStore(opts.store);
    this.localUserId = opts.userId;
    this.deviceId = opts.deviceId ?? 1;
  }

  /** Generates identity, registration id, signed prekey, and one-time prekeys if missing. */
  async init(): Promise<void> {
    let identity = await this.store.getIdentityKeyPair();
    if (!identity) {
      identity = await KeyHelper.generateIdentityKeyPair();
      await this.store.setIdentityKeyPair(identity);
    }
    let regId = await this.store.getLocalRegistrationId();
    if (regId === undefined) {
      regId = KeyHelper.generateRegistrationId();
      await this.store.setLocalRegistrationId(regId);
    }
    const existingSigned = await this.store.loadSignedPreKey(SIGNED_PRE_KEY_ID);
    if (!existingSigned) {
      const signed = await KeyHelper.generateSignedPreKey(identity, SIGNED_PRE_KEY_ID);
      await this.store.storeSignedPreKey(SIGNED_PRE_KEY_ID, signed.keyPair);
      // Stash the signature next to the key so exportBundle() can read it back.
      await this.persistSignature(SIGNED_PRE_KEY_ID, abToBase64(signed.signature));
    }
    const existingPreKeys = await this.store.listPreKeyIds();
    if (existingPreKeys.length < 10) {
      const start = FIRST_OTPK_ID + existingPreKeys.length;
      const need = NUM_ONE_TIME_PREKEYS - existingPreKeys.length;
      for (let i = 0; i < need; i++) {
        const pk = await KeyHelper.generatePreKey(start + i);
        await this.store.storePreKey(pk.keyId, pk.keyPair);
      }
    }
  }

  /** Returns the public bundle for this device, ready to upload to the server. */
  async exportBundle(): Promise<WireBundle> {
    const identity = await this.store.getIdentityKeyPair();
    if (!identity) throw new Error('Signal identity not initialized; call init() first');
    const regId = await this.store.getLocalRegistrationId();
    if (regId === undefined) throw new Error('Registration id missing');
    const signed = await this.store.loadSignedPreKey(SIGNED_PRE_KEY_ID);
    if (!signed) throw new Error('Signed prekey missing');
    const sig = await this.loadSignature(SIGNED_PRE_KEY_ID);
    const ids = (await this.store.listPreKeyIds()).slice(0, 50);
    const otpks: { id: number; public_key: string }[] = [];
    for (const id of ids) {
      const kp = await this.store.loadPreKey(id);
      if (kp) otpks.push({ id, public_key: abToBase64(kp.pubKey) });
    }
    return {
      user_id: this.localUserId,
      device_id: this.deviceId,
      registration_id: regId,
      identity_key: abToBase64(identity.pubKey),
      signed_pre_key: {
        id: SIGNED_PRE_KEY_ID,
        public_key: abToBase64(signed.pubKey),
        signature: sig,
      },
      one_time_pre_keys: otpks,
    };
  }

  /** Whether we already have a Signal session with the given remote. */
  async hasSession(remoteUserId: string, remoteDeviceId = 1): Promise<boolean> {
    const addr = new SignalProtocolAddress(remoteUserId, remoteDeviceId);
    const cipher = new SessionCipher(this.store, addr);
    return cipher.hasOpenSession();
  }

  /**
   * Encrypts a plaintext message for the given user.
   *
   * If no session exists yet (`hasSession()` returns false), `remoteBundle` is
   * required so we can establish the X3DH session via SessionBuilder.
   */
  async encryptToUser(opts: {
    remoteUserId: string;
    remoteDeviceId?: number;
    plaintext: string;
    remoteBundle?: WireBundle;
  }): Promise<EncryptedEnvelope> {
    const remoteDeviceId = opts.remoteDeviceId ?? 1;
    const addr = new SignalProtocolAddress(opts.remoteUserId, remoteDeviceId);
    const cipher = new SessionCipher(this.store, addr);

    if (!(await cipher.hasOpenSession())) {
      if (!opts.remoteBundle) {
        throw new Error('No session and no remote bundle provided');
      }
      const builder = new SessionBuilder(this.store, addr);
      const device = wireBundleToDevice(opts.remoteBundle);
      await builder.processPreKey(device);
    }

    const result = await cipher.encrypt(utf8ToAb(opts.plaintext));
    return {
      ciphertext: messageBodyToBase64(result),
      ciphertext_type: result.type,
    };
  }

  /** Decrypts an envelope. Handles both PreKey (3) and Whisper (1) message types. */
  async decryptFromUser(opts: {
    remoteUserId: string;
    remoteDeviceId?: number;
    ciphertext: string;
    ciphertext_type: number;
  }): Promise<string> {
    const addr = new SignalProtocolAddress(opts.remoteUserId, opts.remoteDeviceId ?? 1);
    const cipher = new SessionCipher(this.store, addr);
    const buf = base64ToAb(opts.ciphertext);
    let plaintext: ArrayBuffer;
    if (opts.ciphertext_type === 3) {
      plaintext = await cipher.decryptPreKeyWhisperMessage(buf, 'binary');
    } else {
      plaintext = await cipher.decryptWhisperMessage(buf, 'binary');
    }
    return abToUtf8(plaintext);
  }

  /** Wipes all crypto state. Use when the user picks "Regenerate identity keys". */
  async reset(): Promise<void> {
    await this.store.reset();
    await this.dropSignatures();
  }

  // The library only persists a key pair for signed prekeys, but we also need
  // to stash the signature so exportBundle() can return a valid public bundle.
  // The signature is small so we just keep it next to the key.
  private async persistSignature(keyId: number, sigB64: string) {
    await this.store['store'].set(`lime.signal.signedPrekeySig.${keyId}`, sigB64);
  }

  private async loadSignature(keyId: number): Promise<string> {
    const sig = await this.store['store'].get(`lime.signal.signedPrekeySig.${keyId}`);
    if (!sig) throw new Error(`Signature for signed prekey ${keyId} missing`);
    return sig;
  }

  private async dropSignatures() {
    const keys = await this.store['store'].list('lime.signal.signedPrekeySig.');
    for (const k of keys) await this.store['store'].delete(k);
  }
}

function wireBundleToDevice(b: WireBundle): DeviceType {
  return {
    identityKey: base64ToAb(b.identity_key),
    registrationId: b.registration_id,
    signedPreKey: {
      keyId: b.signed_pre_key.id,
      publicKey: base64ToAb(b.signed_pre_key.public_key),
      signature: base64ToAb(b.signed_pre_key.signature),
    },
    preKey: b.one_time_pre_keys[0]
      ? {
          keyId: b.one_time_pre_keys[0].id,
          publicKey: base64ToAb(b.one_time_pre_keys[0].public_key),
        }
      : undefined,
  };
}

/**
 * libsignal returns `MessageType.body` as either ArrayBuffer or string depending
 * on the runtime path. Normalise to base64 either way.
 */
function messageBodyToBase64(m: MessageType): string {
  if (!m.body) return '';
  if (typeof m.body === 'string') {
    // Already a binary string (from msrcrypto). Convert to Uint8Array first.
    const bytes = new Uint8Array(m.body.length);
    for (let i = 0; i < m.body.length; i++) bytes[i] = m.body.charCodeAt(i) & 0xff;
    return abToBase64(bytes.buffer);
  }
  return abToBase64(m.body as ArrayBuffer);
}
