"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, User } from "lucide-react"

export default function DashboardPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  if (isPending) {
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
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Welcome Back!
              </CardTitle>
              <CardDescription>You're logged in to your dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Name:</span>
                  <p className="text-sm text-muted-foreground">
                    {session.user?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Email:</span>
                  <p className="text-sm text-muted-foreground">
                    {session.user?.email || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Your activity overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Sessions</span>
                  <span className="text-2xl font-bold">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Login</span>
                  <span className="text-sm text-muted-foreground">Today</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                View Profile
              </Button>
              <Button className="w-full" variant="outline">
                Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
