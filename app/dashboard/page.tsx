'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import type { DateRange } from 'react-day-picker'
import {
  LogOut,
  Plus,
  FolderOpen,
  Settings,
  TrendingUp,
  Package,
} from 'lucide-react'
import { getProjects } from '@/lib/actions/projects'
import { getCurrentMonthRange } from '@/lib/actions/metrics'
import { CreateProjectDialog } from '@/components/create-project-dialog'
import { MetricsDashboard } from '@/components/metrics-dashboard'
import { InventoryList } from '@/components/inventory-list'
import { formatDate } from '@/lib/utils/locale'
import Link from 'next/link'

type Project = {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  userId: string
  entries: {
    id: string
    timestamp: Date
  }[]
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const buildHref = (
    basePath: string,
    overrides: Record<string, string | null | undefined>,
  ) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null || value === undefined || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    }
    const queryString = next.toString()
    return queryString ? `${basePath}?${queryString}` : basePath
  }

  // Get active tab from URL search params, default to "projects"
  const activeTab =
    (searchParams.get('tab') as 'projects' | 'metrics' | 'inventory') ||
    'projects'

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      loadProjects()
      loadDefaultDates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const loadDefaultDates = async () => {
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    if (fromParam && toParam) {
      // Validate and use dates from URL
      const fromDate = new Date(fromParam)
      const toDate = new Date(toParam)

      // Check if dates are valid
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        setDateRange({
          from: fromDate,
          to: toDate,
        })
        return
      }
    }

    // Fall back to current month
    const { startDate: start, endDate: end } = await getCurrentMonthRange()
    setDateRange({
      from: new Date(start),
      to: new Date(end),
    })
  }

  const loadProjects = async () => {
    try {
      const data = await getProjects()
      setProjects(data)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const handleProjectCreated = () => {
    setShowCreateDialog(false)
    loadProjects()
  }

  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange)

    // Update URL with new date range
    if (newDateRange?.from && newDateRange?.to) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('from', newDateRange.from.toISOString())
      params.set('to', newDateRange.to.toISOString())
      router.push(`/dashboard?${params.toString()}`)
    }
  }

  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold cursor-pointer hover:text-primary transition-colors">
              Booker Journal
            </h1>
          </Link>
          <div className="flex gap-2">
            <Link href="/dashboard/admin">
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Button>
            </Link>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        {/* Tab Navigation */}
        <div className="mb-6 flex flex-wrap gap-2 border-b">
          <Link
            href={buildHref('/dashboard', { tab: 'projects' })}
            className="inline-block">
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'projects'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              <FolderOpen className="mr-2 inline h-4 w-4" />
              Projects
            </button>
          </Link>
          <Link
            href={buildHref('/dashboard', { tab: 'metrics' })}
            className="inline-block">
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'metrics'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              <TrendingUp className="mr-2 inline h-4 w-4" />
              Global Metrics
            </button>
          </Link>
          <Link
            href={buildHref('/dashboard', { tab: 'inventory' })}
            className="inline-block">
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'inventory'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              <Package className="mr-2 inline h-4 w-4" />
              Global Inventory
            </button>
          </Link>
        </div>

        {activeTab === 'projects' && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Projects</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your project journals
                </p>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>

            {projects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No projects yet
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Create your first project to start tracking entries
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map(project => (
                  <Link
                    key={project.id}
                    href={buildHref(`/dashboard/projects/${project.id}`, {
                      tab: 'entries',
                    })}>
                    <Card className="cursor-pointer transition-colors hover:bg-accent h-full">
                      <CardHeader>
                        <CardTitle className="truncate">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="truncate">
                          Created {formatDate(project.createdAt)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground truncate">
                          {project.entries.length > 0
                            ? `Last entry: ${formatDate(
                                project.entries[0].timestamp,
                              )}`
                            : 'No entries yet'}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'metrics' && (
          <div>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Global Metrics</h2>
                <p className="text-sm text-muted-foreground">
                  Metrics across all your projects
                </p>
              </div>
              <DateRangePicker
                dateRange={dateRange}
                setDateRange={handleDateRangeChange}
              />
            </div>
            <MetricsDashboard projectId={null} dateRange={dateRange} />
          </div>
        )}

        {activeTab === 'inventory' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Global Inventory</h2>
              <p className="text-sm text-muted-foreground">
                Manage your global inventory across all customers
              </p>
            </div>
            <InventoryList />
          </div>
        )}
      </main>

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleProjectCreated}
      />
    </div>
  )
}
