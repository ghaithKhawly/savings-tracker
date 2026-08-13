const ENCRYPTED_BACKUP_KIND = 'savings-tracker.encrypted-backup';
const ENCRYPTION_VERSION = 1;
const PBKDF2_ITERATIONS = 210_000;

export interface EncryptedBackupPayload {
  kind: typeof ENCRYPTED_BACKUP_KIND;
  version: number;
  algorithm: 'AES-GCM';
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  payload: string;
}

export function isEncryptedBackupPayload(value: unknown): value is EncryptedBackupPayload {
  const payload = value as Partial<EncryptedBackupPayload>;
  return (
    Boolean(payload) &&
    payload.kind === ENCRYPTED_BACKUP_KIND &&
    payload.version === ENCRYPTION_VERSION &&
    typeof payload.salt === 'string' &&
    typeof payload.iv === 'string' &&
    typeof payload.payload === 'string'
  );
}

export function canUsePassphraseBackups(): boolean {
  return Boolean(globalThis.crypto?.subtle && globalThis.crypto?.getRandomValues);
}

export async function encryptBackupJson(json: string, passphrase: string): Promise<string> {
  assertPassphrase(passphrase);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(passphrase, salt);
  const encoded = new TextEncoder().encode(json);
  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBufferSource(iv) },
    key,
    toBufferSource(encoded)
  );

  const payload: EncryptedBackupPayload = {
    kind: ENCRYPTED_BACKUP_KIND,
    version: ENCRYPTION_VERSION,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    payload: bytesToBase64(new Uint8Array(encrypted)),
  };

  return JSON.stringify(payload, null, 2);
}

export async function decryptBackupJson(payload: EncryptedBackupPayload, passphrase: string): Promise<string> {
  assertPassphrase(passphrase);

  try {
    const salt = base64ToBytes(payload.salt);
    const iv = base64ToBytes(payload.iv);
    const encrypted = base64ToBytes(payload.payload);
    const key = await deriveKey(passphrase, salt);
    const decrypted = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv) },
      key,
      toBufferSource(encrypted)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error('Unable to decrypt backup. Check the passphrase and file.');
  }
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  if (!canUsePassphraseBackups()) {
    throw new Error('Protected backups are not supported on this platform.');
  }

  const passphraseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toBufferSource(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function toBufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function assertPassphrase(passphrase: string) {
  if (passphrase.trim().length < 8) {
    throw new Error('Use a backup passphrase with at least 8 characters.');
  }
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
