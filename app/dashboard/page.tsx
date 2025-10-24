"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Plus, FolderOpen, Settings, TrendingUp, Package } from "lucide-react"
import { getProjects } from "@/lib/actions/projects"
import { CreateProjectDialog } from "@/components/create-project-dialog"
import { MetricsDashboard } from "@/components/metrics-dashboard"
import { InventoryList } from "@/components/inventory-list"
import Link from "next/link"

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
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<"projects" | "metrics" | "inventory">("projects")

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      loadProjects()
    }
  }, [session])

  const loadProjects = async () => {
    try {
      const data = await getProjects()
      setProjects(data)
    } catch (error) {
      console.error("Failed to load projects:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const handleProjectCreated = () => {
    setShowCreateDialog(false)
    loadProjects()
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
          <h1 className="text-xl font-bold">Booker Journal</h1>
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
        <div className="mb-6 flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "projects"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderOpen className="mr-2 inline h-4 w-4" />
            Projects
          </button>
          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "metrics"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="mr-2 inline h-4 w-4" />
            Global Metrics
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "inventory"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="mr-2 inline h-4 w-4" />
            Global Inventory
          </button>
        </div>

        {activeTab === "projects" && (
          <>
            <div className="mb-6 flex items-center justify-between">
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
                  <h3 className="mb-2 text-lg font-semibold">No projects yet</h3>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                    <Card className="cursor-pointer transition-colors hover:bg-accent">
                      <CardHeader>
                        <CardTitle>{project.name}</CardTitle>
                        <CardDescription>
                          Created {new Date(project.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">
                          {project.entries.length > 0
                            ? `Last entry: ${new Date(project.entries[0].timestamp).toLocaleDateString()}`
                            : "No entries yet"}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "metrics" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Global Metrics</h2>
              <p className="text-sm text-muted-foreground">
                Metrics across all your projects
              </p>
            </div>
            <MetricsDashboard projectId={null} />
          </div>
        )}

        {activeTab === "inventory" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Global Inventory</h2>
              <p className="text-sm text-muted-foreground">
                Inventory across all your projects
              </p>
            </div>
            <InventoryList projectId={null} />
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
