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
