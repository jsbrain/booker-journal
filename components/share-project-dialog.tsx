"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { createSharedLink, getSharedLinks, deleteSharedLink } from "@/lib/actions/shared-links"
import { Copy, Trash2, Check } from "lucide-react"

interface ShareProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
}

type SharedLink = {
  id: number
  projectId: number
  token: string
  expiresAt: Date
  createdAt: Date
}

export function ShareProjectDialog({ open, onOpenChange, projectId }: ShareProjectDialogProps) {
  const [expiresInDays, setExpiresInDays] = useState("7")
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadSharedLinks()
    }
  }, [open, projectId])

  const loadSharedLinks = async () => {
    try {
      const links = await getSharedLinks(projectId)
      setSharedLinks(links)
    } catch (err) {
      setError("Failed to load shared links")
    }
  }

  const handleCreateLink = async () => {
    setError("")
    setLoading(true)

    try {
      const days = parseInt(expiresInDays)
      if (isNaN(days) || days < 1) {
        setError("Please enter a valid number of days")
        return
      }

      await createSharedLink(projectId, days)
      setExpiresInDays("7")
      await loadSharedLinks()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLink = async (linkId: number) => {
    try {
      await deleteSharedLink(linkId, projectId)
      await loadSharedLinks()
    } catch (err) {
      setError("Failed to delete link")
    }
  }

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/shared/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date))
  }

  const isExpired = (date: Date) => {
    return new Date(date) < new Date()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Create a read-only link to share this project journal
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="days">Expires in (days)</Label>
              <Input
                id="days"
                type="number"
                min="1"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreateLink} disabled={loading}>
                {loading ? "Creating..." : "Create Link"}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {sharedLinks.length > 0 && (
            <div className="space-y-2">
              <Label>Active Links</Label>
              {sharedLinks.map((link) => (
                <Card key={link.id} className={isExpired(link.expiresAt) ? "opacity-50" : ""}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {isExpired(link.expiresAt) ? "Expired" : "Active"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Expires: {formatDate(link.expiresAt)}
                      </div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground truncate">
                        {link.token.substring(0, 20)}...
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(link.token)}
                        disabled={isExpired(link.expiresAt)}
                      >
                        {copiedToken === link.token ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteLink(link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
