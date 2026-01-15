import crypto from 'crypto'

const textEncoder = new TextEncoder()

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(out).set(bytes)
  return out
}

export function base64Encode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

export function base64Decode(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

export function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) {
    throw new Error('xorBytes: length mismatch')
  }
  const out = new Uint8Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i]
  return out
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

export function randomBytes(length: number): Uint8Array {
  return new Uint8Array(crypto.randomBytes(length))
}

export async function pbkdf2Sha256(
  password: string,
  salt: Uint8Array,
  iterations: number,
  keyLengthBytes: number,
): Promise<Uint8Array> {
  const subtle = crypto.webcrypto.subtle
  const baseKey = await subtle.importKey(
    'raw',
    toArrayBuffer(textEncoder.encode(password)),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations,
    },
    baseKey,
    keyLengthBytes * 8,
  )

  return new Uint8Array(bits)
}

export async function aesGcmEncrypt(
  keyBytes: Uint8Array,
  plaintext: Uint8Array,
  iv: Uint8Array,
  additionalData?: Uint8Array,
): Promise<Uint8Array> {
  const subtle = crypto.webcrypto.subtle
  const key = await subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    'AES-GCM',
    false,
    ['encrypt'],
  )

  const ciphertext = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      ...(additionalData
        ? { additionalData: toArrayBuffer(additionalData) }
        : {}),
    },
    key,
    toArrayBuffer(plaintext),
  )

  return new Uint8Array(ciphertext)
}

export function utf8ToBytes(input: string): Uint8Array {
  return textEncoder.encode(input)
}
