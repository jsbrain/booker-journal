import crypto from 'crypto'

const textEncoder = new TextEncoder()

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(out).set(bytes)
  return out
}

function base64Encode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

function base64Decode(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

function randomBytes(length: number): Uint8Array {
  return new Uint8Array(crypto.randomBytes(length))
}

export class InvalidSharedLinkPublicKeyError extends Error {
  constructor(cause?: unknown) {
    super('Invalid shared-link public key', { cause })
    this.name = 'InvalidSharedLinkPublicKeyError'
  }
}

async function aesGcmEncrypt(
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

export async function encryptLivePayload(
  plaintext: string,
  publicKeySpkiBase64: string,
  aad: string,
) {
  const subtle = crypto.webcrypto.subtle
  const publicKey = await (async () => {
    try {
      return await subtle.importKey(
        'spki',
        toArrayBuffer(base64Decode(publicKeySpkiBase64)),
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt'],
      )
    } catch (error) {
      throw new InvalidSharedLinkPublicKeyError(error)
    }
  })()

  const algorithm = publicKey.algorithm as RsaHashedKeyAlgorithm
  if (algorithm.name !== 'RSA-OAEP' || algorithm.modulusLength < 2048) {
    throw new InvalidSharedLinkPublicKeyError()
  }

  const dataKey = randomBytes(32)
  const iv = randomBytes(12)
  const aadBytes = utf8ToBytes(aad)
  const ciphertext = await aesGcmEncrypt(
    dataKey,
    utf8ToBytes(plaintext),
    iv,
    aadBytes,
  )
  const wrappedKey = await subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    toArrayBuffer(dataKey),
  )

  return {
    encrypted: true as const,
    algorithm: 'RSA-OAEP-256+A256GCM' as const,
    wrappedKey: base64Encode(new Uint8Array(wrappedKey)),
    payload: {
      enc: base64Encode(ciphertext),
      iv: base64Encode(iv),
      aad,
    },
  }
}

function utf8ToBytes(input: string): Uint8Array {
  return textEncoder.encode(input)
}
