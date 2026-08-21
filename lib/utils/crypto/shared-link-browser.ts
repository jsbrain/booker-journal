const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(out).set(bytes)
  return out
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function aesGcmDecrypt(
  keyBytes: Uint8Array,
  ciphertext: Uint8Array,
  iv: Uint8Array,
  additionalData?: Uint8Array,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    'AES-GCM',
    false,
    ['decrypt'],
  )
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      ...(additionalData
        ? { additionalData: toArrayBuffer(additionalData) }
        : {}),
    },
    key,
    toArrayBuffer(ciphertext),
  )

  return new Uint8Array(plaintext)
}

export async function generateLivePayloadKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function exportPublicKeySpki(publicKey: CryptoKey) {
  const spki = await crypto.subtle.exportKey('spki', publicKey)
  return bytesToBase64(new Uint8Array(spki))
}

export async function decryptLivePayload(
  encrypted: {
    algorithm: 'RSA-OAEP-256+A256GCM'
    wrappedKey: string
    payload: { enc: string; iv: string; aad: string }
  },
  privateKey: CryptoKey,
  expectedAad: string,
) {
  if (encrypted.algorithm !== 'RSA-OAEP-256+A256GCM') {
    throw new Error('Unsupported shared-link encryption algorithm')
  }
  if (encrypted.payload.aad !== expectedAad) {
    throw new Error('Shared-link encryption context mismatch')
  }

  const dataKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    toArrayBuffer(base64ToBytes(encrypted.wrappedKey)),
  )
  const plaintext = await aesGcmDecrypt(
    new Uint8Array(dataKey),
    base64ToBytes(encrypted.payload.enc),
    base64ToBytes(encrypted.payload.iv),
    textEncoder.encode(expectedAad),
  )

  return textDecoder.decode(plaintext)
}
