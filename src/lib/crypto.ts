// Local browser encryption is REAL AES-GCM; the authority model around it is SIMULATED.
// These functions never impersonate TideCloak APIs.
export function toBase64(bytes: Uint8Array): string {
  let value = '';
  for (let i = 0; i < bytes.length; i += 8192) value += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(value);
}
export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}
export async function generateStreamKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const encoded = toBase64(bytes);
  const key = await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt']);
  bytes.fill(0);
  return { encoded, key };
}
export async function importStreamKey(encoded: string) {
  const bytes = fromBase64(encoded);
  try { return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['decrypt']); }
  finally { bytes.fill(0); }
}
export async function encryptBytes(key: CryptoKey, bytes: Uint8Array<ArrayBuffer>) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  return { iv, data };
}
export async function decryptBytes(key: CryptoKey, packet: { iv: Uint8Array<ArrayBuffer>; data: Uint8Array<ArrayBuffer> }) {
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: packet.iv }, key, packet.data));
}
export async function createLocalVault() {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return {
    async seal(plaintext: string) {
      const packet = await encryptBytes(key, new TextEncoder().encode(plaintext));
      return `local-aes-gcm:${toBase64(packet.iv)}:${toBase64(packet.data)}`;
    },
    async open(ciphertext: string) {
      const [, iv, data] = ciphertext.split(':');
      return new TextDecoder().decode(await decryptBytes(key, { iv: fromBase64(iv), data: fromBase64(data) }));
    },
  };
}
