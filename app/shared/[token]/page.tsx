'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronDown, ChevronUp, Lock, Printer } from 'lucide-react'
import { getProjectBySharedLink } from '@/lib/actions/shared-links'
import { getBalanceColor, getBalanceStatus } from '@/lib/utils/balance'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils/locale'
import { devLogError, getPublicErrorMessage } from '@/lib/utils/public-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Entry = {
  id: string
  projectId: string
  amount: string
  price: string
  typeId: string
  productId: string | null
  note: string | null
  timestamp: Date
  createdAt: Date
  type: {
    id: string
    key: string
    name: string
  }
  product: {
    id: string
    key: string
    name: string
  } | null
}

type Project = {
  id: string
  name: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

type DateRangeInfo = {
  startDate: Date | null
  endDate: Date | null
} | null

type EncryptedPackage = {
  encrypted: true
  expiresAt: string | Date
  startDate: string | Date | null
  endDate: string | Date | null
  payload: { enc: string; iv: string; aad: string }
  keyUser: {
    enc: string
    iv: string
    salt: string
    iterations: number
  }
}

type PayloadResponse =
  | EncryptedPackage
  | {
      encrypted: false
      expiresAt: string | Date
      startDate: string | Date | null
      endDate: string | Date | null
    }

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(out).set(bytes)
  return out
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) throw new Error('xorBytes: length mismatch')
  const out = new Uint8Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i]
  return out
}

async function pbkdf2Sha256(
  password: string,
  salt: Uint8Array,
  iterations: number,
  lengthBytes: number,
): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(textEncoder.encode(password)),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      iterations,
    },
    baseKey,
    lengthBytes * 8,
  )

  return new Uint8Array(bits)
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

  const plain = await crypto.subtle.decrypt(
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

  return new Uint8Array(plain)
}

export default function SharedProjectPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = params.token as string

  const [project, setProject] = useState<Project | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [balance, setBalance] = useState(0)
  const [dateRange, setDateRange] = useState<DateRangeInfo>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [encryptedPackage, setEncryptedPackage] =
    useState<EncryptedPackage | null>(null)
  const [password, setPassword] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  const sortBy =
    (searchParams.get('sort') as 'timestamp_desc' | 'timestamp_asc') ||
    'timestamp_desc'

  const sortedEntries = useMemo(() => {
    const sorted = [...entries]
    sorted.sort((a, b) => {
      const diff =
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      return sortBy === 'timestamp_desc' ? diff : -diff
    })
    return sorted
  }, [entries, sortBy])

  const dataThrough = useMemo(() => {
    if (entries.length === 0) return null
    const maxTs = Math.max(...entries.map(e => new Date(e.timestamp).getTime()))
    return new Date(maxTs)
  }, [entries])

  useEffect(() => {
    loadProjectData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const loadProjectData = async () => {
    try {
      setError('')
      setEncryptedPackage(null)
      setProject(null)
      setEntries([])
      setBalance(0)
      setDateRange(null)

      const res = await fetch(`/api/shared/${token}/payload`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const msg = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(msg?.error || 'Invalid or expired link')
      }

      const payload = (await res.json()) as PayloadResponse

      if (payload.encrypted) {
        setEncryptedPackage(payload)
        return
      }

      // Legacy (plaintext) share fallback
      const data = await getProjectBySharedLink(token)
      setProject(data.project)
      setEntries(data.entries)
      setBalance(data.balance)
      setDateRange(data.dateRange)
    } catch (err) {
      devLogError('Failed to load shared project:', err)
      setError(getPublicErrorMessage(err, 'Invalid or expired link'))
    } finally {
      setLoading(false)
    }
  }

  const unlockAndDecrypt = async () => {
    if (!encryptedPackage) return
    setUnlocking(true)
    setError('')

    try {
      const unlockRes = await fetch(`/api/shared/${token}/unlock`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ password }),
      })

      const unlockJson = (await unlockRes.json().catch(() => null)) as
        | { accessToken: string; expiresAt: string }
        | { error?: string }
        | null

      if (!unlockRes.ok || !unlockJson || !('accessToken' in unlockJson)) {
        const unlockError =
          unlockJson && 'error' in unlockJson && unlockJson.error
            ? unlockJson.error
            : 'Invalid password'
        throw new Error(unlockError)
      }

      const keyRes = await fetch(`/api/shared/${token}/key`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ accessToken: unlockJson.accessToken }),
      })

      const keyJson = (await keyRes.json().catch(() => null)) as
        | { keyServer: string }
        | { error?: string }
        | null

      if (!keyRes.ok || !keyJson || !('keyServer' in keyJson)) {
        const keyError =
          keyJson && 'error' in keyJson && keyJson.error
            ? keyJson.error
            : 'Unable to unlock link'
        throw new Error(keyError)
      }

      const aadBytes = textEncoder.encode(encryptedPackage.payload.aad)

      const salt = b64ToBytes(encryptedPackage.keyUser.salt)
      const iterations = encryptedPackage.keyUser.iterations
      const derivedKey = await pbkdf2Sha256(password, salt, iterations, 32)

      const userShareEnc = b64ToBytes(encryptedPackage.keyUser.enc)
      const userShareIv = b64ToBytes(encryptedPackage.keyUser.iv)
      const userShare = await aesGcmDecrypt(
        derivedKey,
        userShareEnc,
        userShareIv,
        aadBytes,
      )

      const serverShare = b64ToBytes(keyJson.keyServer)
      const dek = xorBytes(userShare, serverShare)

      const payloadEnc = b64ToBytes(encryptedPackage.payload.enc)
      const payloadIv = b64ToBytes(encryptedPackage.payload.iv)
      const payloadBytes = await aesGcmDecrypt(
        dek,
        payloadEnc,
        payloadIv,
        aadBytes,
      )

      const payloadText = textDecoder.decode(payloadBytes)
      const parsed = JSON.parse(payloadText) as {
        project: {
          id: string
          name: string
          userId: string
          createdAt: string
          updatedAt: string
        }
        entries: Array<{
          id: string
          projectId: string
          amount: string
          price: string
          typeId: string
          productId: string | null
          note: string | null
          timestamp: string
          createdAt: string
          type: Entry['type']
          product: Entry['product']
        }>
        balance: number
        dateRange: { startDate: string | null; endDate: string | null } | null
      }

      setProject({
        id: parsed.project.id,
        name: parsed.project.name,
        userId: parsed.project.userId,
        createdAt: new Date(parsed.project.createdAt),
        updatedAt: new Date(parsed.project.updatedAt),
      })
      setEntries(
        parsed.entries.map(e => ({
          id: e.id,
          projectId: e.projectId,
          amount: e.amount,
          price: e.price,
          typeId: e.typeId,
          productId: e.productId,
          note: e.note,
          timestamp: new Date(e.timestamp),
          createdAt: new Date(e.createdAt),
          type: e.type,
          product: e.product,
        })),
      )
      setBalance(parsed.balance)
      setDateRange(
        parsed.dateRange
          ? {
              startDate: parsed.dateRange.startDate
                ? new Date(parsed.dateRange.startDate)
                : null,
              endDate: parsed.dateRange.endDate
                ? new Date(parsed.dateRange.endDate)
                : null,
            }
          : null,
      )

      setPassword('')
    } catch (err) {
      devLogError('Failed to decrypt shared link:', err)
      setError(getPublicErrorMessage(err, 'Unable to unlock link'))
    } finally {
      setUnlocking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!project) {
    if (encryptedPackage) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password Required
              </CardTitle>
              <CardDescription>
                Enter the password to decrypt this shared view.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-password">Password</Label>
                <Input
                  id="share-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="button"
                className="w-full"
                disabled={unlocking || password.length === 0}
                onClick={unlockAndDecrypt}>
                {unlocking ? 'Unlocking…' : 'Unlock'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return null
  }

  const toggleSort = () => {
    const next = new URLSearchParams(searchParams.toString())
    next.set(
      'sort',
      sortBy === 'timestamp_desc' ? 'timestamp_asc' : 'timestamp_desc',
    )
    router.replace(`/shared/${token}?${next.toString()}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b print:hidden">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">Booker Journal</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            Read-only view
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{project.name}</h2>
          <p className="text-sm text-muted-foreground">
            Created {formatDate(project.createdAt)}
          </p>
          {dateRange && (dateRange.startDate || dateRange.endDate) && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Showing entries from{' '}
                {dateRange.startDate
                  ? formatDate(dateRange.startDate)
                  : 'beginning'}{' '}
                to {dateRange.endDate ? formatDate(dateRange.endDate) : 'end'}
              </span>
            </div>
          )}
          {dataThrough && (
            <div className="mt-1 text-sm text-muted-foreground">
              Data through {formatDateTime(dataThrough)}
            </div>
          )}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Balance</CardTitle>
              <CardDescription>
                Amount owed by customer{dateRange ? ' (filtered)' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getBalanceColor(balance)}`}>
                {formatCurrency(balance)}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {getBalanceStatus(balance)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Project overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Entries</span>
                  <span className="text-2xl font-bold">{entries.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Updated</span>
                  <span className="text-sm text-muted-foreground">
                    {entries.length > 0
                      ? formatDate(entries[0].timestamp)
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-lg font-semibold">Journal Entries</h3>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button type="button" variant="outline" onClick={toggleSort}>
                Date
                {sortBy === 'timestamp_desc' ? (
                  <ChevronDown className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronUp className="ml-2 h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                {dateRange
                  ? 'No entries in the selected date range'
                  : 'No entries yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sortedEntries.map(entry => {
              const amount = parseFloat(entry.amount)
              const price = parseFloat(entry.price)
              // Display totals in the same convention as the displayed balance:
              // balance = -Σ(amount×price) => displayTotal = -(amount×price)
              const displayTotal = -(amount * price)

              return (
                <Card key={entry.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.type.name}</span>
                        {entry.product && (
                          <>
                            <span className="text-sm text-muted-foreground">
                              •
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {entry.product.name}
                            </span>
                          </>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(entry.timestamp)}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-sm text-muted-foreground">
                          {entry.note}
                        </p>
                      )}
                      <div className="mt-1 text-sm text-muted-foreground">
                        Amount: {amount} × {formatCurrency(price)}
                      </div>
                    </div>
                    <div
                      className={`text-xl font-bold ${
                        displayTotal >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {displayTotal >= 0 ? '+' : ''}
                      {formatCurrency(displayTotal)}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
