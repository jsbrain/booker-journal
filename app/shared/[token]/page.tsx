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
import { Calendar, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { getBalanceColor, getBalanceStatus } from '@/lib/utils/balance'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils/locale'
import { devLogError, getPublicErrorMessage } from '@/lib/utils/public-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  decryptLivePayload,
  exportPublicKeySpki,
  generateLivePayloadKeyPair,
} from '@/lib/utils/crypto/shared-link-browser'

type Entry = {
  id: string
  amount: string
  price: string
  note: string | null
  timestamp: Date
  type: {
    name: string
  }
  product: {
    name: string
  } | null
}

type Project = {
  name: string
  createdAt: Date
}

type DateRangeInfo = {
  startDate: Date | null
  endDate: Date | null
} | null

type SharedLinkMetadata = {
  encrypted: true
  live: true
  passwordRequired: boolean
  expiresAt: string
  startDate: string | null
  endDate: string | null
}

type LiveEncryptedResponse = {
  encrypted: true
  algorithm: 'RSA-OAEP-256+A256GCM'
  wrappedKey: string
  payload: { enc: string; iv: string; aad: string }
}

type SharedProjectResponse = {
  generatedAt: string
  project: {
    name: string
    createdAt: string
  }
  entries: Array<{
    id: string
    amount: string
    price: string
    note: string | null
    timestamp: string
    type: Entry['type']
    product: Entry['product']
  }>
  balance: number
  dateRange: { startDate: string | null; endDate: string | null } | null
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
  const [fatalError, setFatalError] = useState('')
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [unlockError, setUnlockError] = useState('')
  const [password, setPassword] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)

  const accessTokenStorageKey = `shared-link-access:${token}`

  const sortBy: 'timestamp_desc' | 'timestamp_asc' =
    searchParams.get('sort') === 'timestamp_asc'
      ? 'timestamp_asc'
      : 'timestamp_desc'

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
    const maxTs = Math.max(
      ...entries.map((e) => new Date(e.timestamp).getTime()),
    )
    return new Date(maxTs)
  }, [entries])

  useEffect(() => {
    void loadProjectData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const applySharedProjectData = (data: SharedProjectResponse) => {
    setProject({
      name: data.project.name,
      createdAt: new Date(data.project.createdAt),
    })
    setRefreshedAt(new Date(data.generatedAt))
    setEntries(
      data.entries.map((entry) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      })),
    )
    setBalance(data.balance)
    setDateRange(
      data.dateRange
        ? {
            startDate: data.dateRange.startDate
              ? new Date(data.dateRange.startDate)
              : null,
            endDate: data.dateRange.endDate
              ? new Date(data.dateRange.endDate)
              : null,
          }
        : null,
    )
  }

  const clearStoredAccessToken = () => {
    sessionStorage.removeItem(accessTokenStorageKey)
  }

  const loadEncryptedLiveData = async (accessToken: string) => {
    const keyPair = await generateLivePayloadKeyPair()
    const publicKey = await exportPublicKeySpki(keyPair.publicKey)
    const response = await fetch(`/api/shared/${token}/data`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ publicKey }),
    })
    const payload = (await response.json().catch(() => null)) as
      LiveEncryptedResponse | { error?: string } | null

    if (!response.ok) {
      return {
        ok: false as const,
        status: response.status,
        error:
          payload && 'error' in payload && payload.error
            ? payload.error
            : 'Failed to load shared project',
      }
    }

    const plaintext = await decryptLivePayload(
      payload as LiveEncryptedResponse,
      keyPair.privateKey,
      token,
    )
    applySharedProjectData(JSON.parse(plaintext) as SharedProjectResponse)

    return { ok: true as const }
  }

  const loadProjectData = async () => {
    try {
      setFatalError('')
      setUnlockError('')
      setPasswordRequired(false)
      setProject(null)
      setEntries([])
      setBalance(0)
      setDateRange(null)
      setRefreshedAt(null)

      const res = await fetch(`/api/shared/${token}/payload`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const msg = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(msg?.error || 'Invalid or expired link')
      }

      const payload = (await res.json()) as SharedLinkMetadata
      if (!payload.encrypted || !payload.live || !payload.passwordRequired) {
        throw new Error('Unsupported shared link')
      }

      const storedAccessToken = sessionStorage.getItem(accessTokenStorageKey)
      if (!storedAccessToken) {
        setPasswordRequired(true)
        return
      }

      const result = await loadEncryptedLiveData(storedAccessToken)

      if (!result.ok) {
        clearStoredAccessToken()

        if (result.status === 404) {
          throw new Error(result.error)
        }

        setPasswordRequired(true)
        setUnlockError('Access session expired. Enter the password again.')
      }
    } catch (err) {
      devLogError('Failed to load shared project:', err)
      setFatalError(getPublicErrorMessage(err, 'Invalid or expired link'))
    } finally {
      setLoading(false)
    }
  }

  const unlockAndLoad = async () => {
    setUnlocking(true)
    setUnlockError('')

    try {
      const unlockRes = await fetch(`/api/shared/${token}/unlock`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ password }),
      })

      const unlockJson = (await unlockRes.json().catch(() => null)) as
        { accessToken: string; expiresAt: string } | { error?: string } | null

      if (!unlockRes.ok || !unlockJson || !('accessToken' in unlockJson)) {
        const unlockError =
          unlockJson && 'error' in unlockJson && unlockJson.error
            ? unlockJson.error
            : 'Invalid password'
        throw new Error(unlockError)
      }

      sessionStorage.setItem(accessTokenStorageKey, unlockJson.accessToken)

      const result = await loadEncryptedLiveData(unlockJson.accessToken)

      if (!result.ok) {
        clearStoredAccessToken()

        if (result.status === 404) {
          setPasswordRequired(false)
          setFatalError(result.error)
          return
        }

        throw new Error(result.error)
      }

      setPassword('')
      setPasswordRequired(false)
    } catch (err) {
      devLogError('Failed to unlock shared link:', err)
      setUnlockError(getPublicErrorMessage(err, 'Unable to unlock link'))
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

  if (fatalError) {
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
            <p className="text-sm text-muted-foreground">{fatalError}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!project) {
    if (passwordRequired) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password Required
              </CardTitle>
              <CardDescription>
                Enter the password to view this encrypted live project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-password">Password</Label>
                <Input
                  id="share-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {unlockError && (
                <p className="text-sm text-destructive">{unlockError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Each live response is encrypted for this browser and remains
                read-only.
              </p>
              <Button
                type="button"
                className="w-full"
                disabled={unlocking || password.length === 0}
                onClick={unlockAndLoad}
              >
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
            <span className="sm:hidden">Read-only</span>
            <span className="hidden sm:inline">Encrypted read-only view</span>
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
          {refreshedAt && (
            <div className="mt-1 text-sm text-muted-foreground">
              Live data refreshed {formatDateTime(refreshedAt)}
            </div>
          )}
          {dataThrough && (
            <div className="mt-1 text-sm text-muted-foreground">
              Latest entry {formatDateTime(dataThrough)}
            </div>
          )}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {dateRange ? 'Activity Balance' : 'Current Balance'}
              </CardTitle>
              <CardDescription>
                {dateRange
                  ? 'Net change from the activity shown in this period'
                  : 'Current amount owed by the customer'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getBalanceColor(balance)}`}>
                {formatCurrency(balance)}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {dateRange
                  ? balance > 0
                    ? 'Activity increased the customer balance'
                    : balance < 0
                      ? 'Activity reduced the customer balance'
                      : 'Activity was balanced for this period'
                  : getBalanceStatus(balance)}
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
            {sortedEntries.map((entry) => {
              const amount = parseFloat(entry.amount)
              const price = parseFloat(entry.price)
              // Display totals in the same convention as the displayed balance:
              // balance = -Σ(amount×price) => displayTotal = -(amount×price)
              const displayTotal = -(amount * price)

              return (
                <Card key={entry.id}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
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
                      className={`shrink-0 text-xl font-bold ${
                        displayTotal >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
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
