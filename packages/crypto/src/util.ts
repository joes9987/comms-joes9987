/** Cross-runtime ArrayBuffer <-> base64 helpers. */

export function abToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  if (typeof btoa !== 'undefined') return btoa(binary);
  // Node fallback
  return Buffer.from(binary, 'binary').toString('base64');
}

export function base64ToAb(b64: string): ArrayBuffer {
  let binary: string;
  if (typeof atob !== 'undefined') binary = atob(b64);
  else binary = Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out.buffer;
}

export function utf8ToAb(s: string): ArrayBuffer {
  return new TextEncoder().encode(s).buffer;
}

export function abToUtf8(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return new TextDecoder().decode(bytes);
}
