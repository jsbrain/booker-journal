"use client"

import { useEffect, useState, Suspense, useMemo } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useSession, signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import type { DateRange } from "react-day-picker"
import { ArrowLeft, LogOut, Plus, Share2, Trash2, Edit2, History, TrendingUp, Search } from "lucide-react"
import { getProject, deleteProject } from "@/lib/actions/projects"
import { getEntries, getProjectBalance, deleteEntry } from "@/lib/actions/entries"
import { getCurrentMonthRange } from "@/lib/actions/metrics"
import { CreateEntryDialog } from "@/components/create-entry-dialog"
import { EditEntryDialog } from "@/components/edit-entry-dialog"
import { ShareProjectDialog } from "@/components/share-project-dialog"
import { MetricsDashboard } from "@/components/metrics-dashboard"
import { getBalanceColor, getBalanceStatus } from "@/lib/utils/balance"
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils/locale"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { EditHistoryEntry } from "@/lib/db/schema"

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
  updatedAt: Date
  editHistory: EditHistoryEntry[] | null
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

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>}>
      <ProjectDetailContent />
    </Suspense>
  )
}

function ProjectDetailContent() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [viewingHistory, setViewingHistory] = useState<EditHistoryEntry[] | null>(null)
  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false)
  const [showDeleteEntryDialog, setShowDeleteEntryDialog] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  
  // Filter and sort states for journal entries
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc")
  
  // Get active tab from URL search params, default to "entries"
  const activeTab = (searchParams.get("tab") as "entries" | "metrics" | "inventory") || "entries"

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      loadProjectData()
      loadDefaultDates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, projectId])

  const loadDefaultDates = async () => {
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")
    
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

  const loadProjectData = async () => {
    try {
      const [projectData, entriesData, balanceData] = await Promise.all([
        getProject(projectId),
        getEntries(projectId),
        getProjectBalance(projectId),
      ])
      setProject(projectData)
      setEntries(entriesData)
      setBalance(balanceData)
    } catch (error) {
      console.error("Failed to load project:", error)
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const handleEntryCreated = () => {
    setShowCreateDialog(false)
    loadProjectData()
  }

  const handleEntryUpdated = () => {
    setShowEditDialog(false)
    setEditingEntry(null)
    loadProjectData()
  }

  const handleDeleteProject = () => {
    setShowDeleteProjectDialog(true)
  }

  const confirmDeleteProject = async () => {
    try {
      await deleteProject(projectId)
      router.push("/dashboard")
    } catch (error) {
      console.error("Failed to delete project:", error)
    }
    setShowDeleteProjectDialog(false)
  }

  const handleDeleteEntry = (entryId: string) => {
    setEntryToDelete(entryId)
    setShowDeleteEntryDialog(true)
  }

  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return

    try {
      await deleteEntry(entryToDelete, projectId)
      loadProjectData()
    } catch (error) {
      console.error("Failed to delete entry:", error)
    }
    setShowDeleteEntryDialog(false)
    setEntryToDelete(null)
  }

  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry)
    setShowEditDialog(true)
  }

  const handleViewHistory = (history: EditHistoryEntry[] | null) => {
    setViewingHistory(history)
    setShowHistoryDialog(true)
  }

  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange)
    
    // Update URL with new date range
    if (newDateRange?.from && newDateRange?.to) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("from", newDateRange.from.toISOString())
      params.set("to", newDateRange.to.toISOString())
      router.push(`/dashboard/projects/${projectId}?${params.toString()}`)
    }
  }

  // Get unique entry types for filter
  const uniqueTypes = useMemo(() => {
    const types = new Map<string, string>()
    entries.forEach(e => types.set(e.type.key, e.type.name))
    return Array.from(types.entries())
  }, [entries])

  // Filter and sort entries
  const filteredAndSortedEntries = useMemo(() => {
    let filtered = entries

    // Apply date range filter
    if (dateRange?.from && dateRange?.to) {
      const fromTime = dateRange.from.getTime()
      const toDate = new Date(dateRange.to)
      toDate.setHours(23, 59, 59, 999)
      const toTime = toDate.getTime()
      
      filtered = filtered.filter(e => {
        const entryTime = new Date(e.timestamp).getTime()
        return entryTime >= fromTime && entryTime <= toTime
      })
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e => 
        e.type.name.toLowerCase().includes(query) ||
        (e.product && e.product.name.toLowerCase().includes(query)) ||
        (e.note && e.note.toLowerCase().includes(query))
      )
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(e => e.type.key === typeFilter)
    }

    // Apply sorting
    const sorted = [...filtered]
    switch (sortBy) {
      case "date-desc":
        sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        break
      case "date-asc":
        sorted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        break
      case "amount-desc":
        sorted.sort((a, b) => {
          const totalA = parseFloat(a.amount) * parseFloat(a.price)
          const totalB = parseFloat(b.amount) * parseFloat(b.price)
          return Math.abs(totalB) - Math.abs(totalA)
        })
        break
      case "amount-asc":
        sorted.sort((a, b) => {
          const totalA = parseFloat(a.amount) * parseFloat(a.price)
          const totalB = parseFloat(b.amount) * parseFloat(b.price)
          return Math.abs(totalA) - Math.abs(totalB)
        })
        break
    }

    return sorted
  }, [entries, dateRange, searchQuery, typeFilter, sortBy])

  // Calculate filtered total
  const filteredTotal = useMemo(() => {
    return filteredAndSortedEntries.reduce((sum, entry) => {
      return sum + parseFloat(entry.amount) * parseFloat(entry.price)
    }, 0)
  }, [filteredAndSortedEntries])

  // Check if search or type filters are active
  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== "" || typeFilter !== "all"
  }, [searchQuery, typeFilter])

  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!session || !project) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <h1 className="text-xl font-bold cursor-pointer hover:text-primary transition-colors">Booker Journal</h1>
            </Link>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold truncate">{project.name}</h2>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(project.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DateRangePicker dateRange={dateRange} setDateRange={handleDateRangeChange} />
            <Button onClick={() => setShowShareDialog(true)} variant="outline" className="flex-1 sm:flex-none">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button onClick={handleDeleteProject} variant="outline" className="flex-1 sm:flex-none">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Balance</CardTitle>
              <CardDescription>Amount owed by customer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold break-words ${getBalanceColor(balance)}`}>
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
                  <span className="text-sm text-muted-foreground truncate">
                    {entries.length > 0
                      ? formatDate(entries[0].timestamp)
                      : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex flex-wrap gap-2 border-b">
          <Link href={`/dashboard/projects/${projectId}?tab=entries`} className="inline-block">
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "entries"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Journal Entries
            </button>
          </Link>
          <Link href={`/dashboard/projects/${projectId}?tab=metrics`} className="inline-block">
            <button
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                activeTab === "metrics"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Metrics
            </button>
          </Link>
        </div>

        {/* Tab Content */}
        {activeTab === "entries" && (
          <>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="text-lg font-semibold">Journal Entries</h3>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Entry
              </Button>
            </div>

            {entries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="mb-4 text-sm text-muted-foreground">
                    No entries yet
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Entry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Filtered Total - shown when filters are active */}
                {hasActiveFilters && (
                  <Card className="bg-muted/50">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Filtered Total ({filteredAndSortedEntries.length} {filteredAndSortedEntries.length === 1 ? 'entry' : 'entries'})
                        </span>
                        <span className={`text-lg font-bold ${filteredTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {filteredTotal >= 0 ? "+" : ""}{formatCurrency(filteredTotal)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Filters and Search */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search entries, products, or notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueTypes.map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(value: "date-desc" | "date-asc" | "amount-desc" | "amount-asc") => setSortBy(value)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Date (Newest)</SelectItem>
                      <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                      <SelectItem value="amount-desc">Amount (High)</SelectItem>
                      <SelectItem value="amount-asc">Amount (Low)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Entry List */}
                <div className="space-y-2">
                  {filteredAndSortedEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No entries match your filters
                    </p>
                  ) : (
                    filteredAndSortedEntries.map((entry) => {
                      const amount = parseFloat(entry.amount)
                      const price = parseFloat(entry.price)
                      const total = amount * price
                      const hasEditHistory = entry.editHistory && entry.editHistory.length > 0
                      
                      return (
                        <Card key={entry.id}>
                          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{entry.type.name}</span>
                                {entry.product && (
                                  <>
                                    <span className="text-sm text-muted-foreground">•</span>
                                    <span className="text-sm text-muted-foreground truncate">{entry.product.name}</span>
                                  </>
                                )}
                                {hasEditHistory && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewHistory(entry.editHistory)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <History className="mr-1 h-3 w-3" />
                                    Edited ({entry.editHistory!.length})
                                  </Button>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground block mt-1">
                                {formatDateTime(entry.timestamp)}
                              </span>
                              {entry.note && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{entry.note}</p>
                              )}
                              <div className="mt-1 text-sm text-muted-foreground">
                                Amount: {amount} × {formatCurrency(price)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 justify-between sm:justify-end">
                              <div className={`text-xl font-bold ${total >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {total >= 0 ? "+" : ""}{formatCurrency(total)}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditEntry(entry)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "metrics" && (
          <MetricsDashboard projectId={projectId} dateRange={dateRange} />
        )}
      </main>

      <CreateEntryDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={projectId}
        onSuccess={handleEntryCreated}
      />

      {editingEntry && (
        <EditEntryDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          projectId={projectId}
          entry={editingEntry}
          onSuccess={handleEntryUpdated}
        />
      )}

      <ShareProjectDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        projectId={projectId}
      />

      {/* Edit History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit History</DialogTitle>
            <DialogDescription>
              View the history of changes made to this entry
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {viewingHistory && viewingHistory.length > 0 ? (
              viewingHistory.map((edit, index) => (
                <div key={index} className="border-l-2 border-primary pl-4">
                  <div className="mb-2 text-sm font-medium">
                    Edit #{viewingHistory.length - index}
                  </div>
                  <div className="mb-2 text-xs text-muted-foreground">
                    {formatDateTime(edit.editedAt)}
                  </div>
                  <div className="space-y-1">
                    {edit.changes.map((change, changeIndex) => (
                      <div key={changeIndex} className="text-sm">
                        <span className="font-medium capitalize">{change.field}:</span>{" "}
                        <span className="text-muted-foreground">{String(change.oldValue)}</span>
                        {" → "}
                        <span className="text-foreground">{String(change.newValue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No edit history available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog open={showDeleteProjectDialog} onOpenChange={setShowDeleteProjectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
              All entries and associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Entry Confirmation Dialog */}
      <AlertDialog open={showDeleteEntryDialog} onOpenChange={setShowDeleteEntryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
