"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession, signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, LogOut, Plus, Share2, Trash2, Edit2, History } from "lucide-react"
import { getProject, deleteProject } from "@/lib/actions/projects"
import { getEntries, getProjectBalance, deleteEntry } from "@/lib/actions/entries"
import { CreateEntryDialog } from "@/components/create-entry-dialog"
import { EditEntryDialog } from "@/components/edit-entry-dialog"
import { ShareProjectDialog } from "@/components/share-project-dialog"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { EditHistoryEntry } from "@/lib/db/schema"

type Entry = {
  id: string
  projectId: string
  amount: string
  price: string
  productId: string
  note: string | null
  timestamp: Date
  createdAt: Date
  updatedAt: Date
  editHistory: EditHistoryEntry[] | null
  product: {
    id: string
    key: string
    name: string
  }
}

type Project = {
  id: string
  name: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export default function ProjectDetailPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const params = useParams()
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

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      loadProjectData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, projectId])

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

  const handleDeleteProject = async () => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return
    }

    try {
      await deleteProject(projectId)
      router.push("/dashboard")
    } catch (error) {
      console.error("Failed to delete project:", error)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) {
      return
    }

    try {
      await deleteEntry(entryId, projectId)
      loadProjectData()
    } catch (error) {
      console.error("Failed to delete entry:", error)
    }
  }

  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry)
    setShowEditDialog(true)
  }

  const handleViewHistory = (history: EditHistoryEntry[] | null) => {
    setViewingHistory(history)
    setShowHistoryDialog(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(value)
  }

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date))
  }

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
            <h1 className="text-xl font-bold">Booker Journal</h1>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{project.name}</h2>
            <p className="text-sm text-muted-foreground">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowShareDialog(true)} variant="outline">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button onClick={handleDeleteProject} variant="outline">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Balance</CardTitle>
              <CardDescription>Total of all entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(balance)}
              </div>
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
                      ? new Date(entries[0].timestamp).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex items-center justify-between">
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
          <div className="space-y-2">
            {entries.map((entry) => {
              const amount = parseFloat(entry.amount)
              const price = parseFloat(entry.price)
              const total = amount * price
              const hasEditHistory = entry.editHistory && entry.editHistory.length > 0
              
              return (
                <Card key={entry.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.product.name}</span>
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
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(entry.timestamp)}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-sm text-muted-foreground">{entry.note}</p>
                      )}
                      <div className="mt-1 text-sm text-muted-foreground">
                        Amount: {amount} × {formatCurrency(price)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-xl font-bold ${total >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {total >= 0 ? "+" : ""}{formatCurrency(total)}
                      </div>
                      <div className="flex gap-1">
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
            })}
          </div>
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
                    {new Date(edit.editedAt).toLocaleString()}
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
    </div>
  )
}
