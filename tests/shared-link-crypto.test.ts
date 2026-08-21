import { describe, expect, test } from 'bun:test'

import {
  decryptLivePayload,
  exportPublicKeySpki,
  generateLivePayloadKeyPair,
} from '@/lib/utils/crypto/shared-link-browser'
import {
  encryptLivePayload,
  InvalidSharedLinkPublicKeyError,
} from '@/lib/utils/crypto/shared-link'

describe('live shared-link payload encryption', () => {
  test('round-trips a fresh payload through a browser-only key pair', async () => {
    const token = 'share-token'
    const plaintext = JSON.stringify({ project: { name: 'Example' } })
    const keyPair = await generateLivePayloadKeyPair()
    const publicKey = await exportPublicKeySpki(keyPair.publicKey)

    const encrypted = await encryptLivePayload(plaintext, publicKey, token)
    const decrypted = await decryptLivePayload(
      encrypted,
      keyPair.privateKey,
      token,
    )

    expect(encrypted.payload.enc).not.toContain('Example')
    expect(decrypted).toBe(plaintext)
  })

  test('rejects a payload under the wrong link context', async () => {
    const keyPair = await generateLivePayloadKeyPair()
    const publicKey = await exportPublicKeySpki(keyPair.publicKey)
    const encrypted = await encryptLivePayload('secret', publicKey, 'token-a')

    await expect(
      decryptLivePayload(encrypted, keyPair.privateKey, 'token-b'),
    ).rejects.toThrow('Shared-link encryption context mismatch')
  })

  test('rejects malformed browser public keys', async () => {
    await expect(
      encryptLivePayload('secret', 'not-a-public-key', 'token'),
    ).rejects.toBeInstanceOf(InvalidSharedLinkPublicKeyError)
  })
})
