/**
 * End-to-End Encryption (E2EE) Engine for ApexPTT Walkie Talkie
 * Implements AES-256-GCM authenticated encryption via native Web Crypto API.
 */

// Helper to convert ArrayBuffer to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive AES-GCM 256-bit Key from passphrase and salt using PBKDF2
async function deriveKey(passphrase: string, saltBuffer: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
}

/**
 * Encrypt arbitrary string (e.g. voice base64 data url or text) with AES-256-GCM
 */
export async function encryptAudioPayload(
  rawPayload: string,
  passphrase: string
): Promise<EncryptedPayload> {
  const enc = new TextEncoder();
  const data = enc.encode(rawPayload);

  // Generate random 16-byte salt and 12-byte IV for GCM
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(passphrase, salt);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
  };
}

/**
 * Decrypt AES-256-GCM payload back to raw string
 */
export async function decryptAudioPayload(
  payload: EncryptedPayload,
  passphrase: string
): Promise<string> {
  const salt = new Uint8Array(base64ToArrayBuffer(payload.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
  const ciphertextBuffer = base64ToArrayBuffer(payload.ciphertext);

  const key = await deriveKey(passphrase, salt);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    ciphertextBuffer
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

/**
 * Computes a standardized military verification safety number for the passphrase
 * (e.g., "7B3A - 9E4F - 21C0 - 8D77") so team operators can confirm voice encryption keys match.
 */
export async function computeSafetyFingerprint(passphrase: string): Promise<string> {
  if (!passphrase) return '0000 - 0000 - 0000 - 0000';
  const enc = new TextEncoder();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(passphrase));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${hex.slice(0, 4)} - ${hex.slice(4, 8)} - ${hex.slice(8, 12)} - ${hex.slice(12, 16)}`;
}
