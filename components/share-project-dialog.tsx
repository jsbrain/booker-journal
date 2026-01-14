'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRangePicker } from '@/components/date-range-picker'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  createSharedLink,
  getSharedLinks,
  deleteSharedLink,
} from '@/lib/actions/shared-links'
import { formatDateTime, formatDate } from '@/lib/utils/locale'
import { Copy, Trash2, Check } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

interface ShareProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

type SharedLink = {
  id: string
  projectId: string
  token: string
  expiresAt: Date
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
}

export function ShareProjectDialog({
  open,
  onOpenChange,
  projectId,
}: ShareProjectDialogProps) {
  const [expiresValue, setExpiresValue] = useState('7')
  const [expiresUnit, setExpiresUnit] = useState<'days' | 'hours'>('days')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null)

  const toStartOfDayIso = (date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }

  const toEndOfDayIso = (date: Date) => {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d.toISOString()
  }

  useEffect(() => {
    if (open) {
      loadSharedLinks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId])

  const loadSharedLinks = async () => {
    try {
      const links = await getSharedLinks(projectId)
      setSharedLinks(links)
    } catch {
      setError('Failed to load shared links')
    }
  }

  const handleCreateLink = async () => {
    setError('')
    setLoading(true)

    try {
      const value = parseInt(expiresValue)
      if (isNaN(value) || value < 1) {
        setError(`Please enter a valid number of ${expiresUnit}`)
        return
      }

      const expiresInDays = expiresUnit === 'days' ? value : undefined
      const expiresInHours = expiresUnit === 'hours' ? value : undefined
      const startDate = dateRange?.from
        ? toStartOfDayIso(dateRange.from)
        : undefined
      const endDate = dateRange?.to ? toEndOfDayIso(dateRange.to) : undefined

      await createSharedLink(
        projectId,
        expiresInDays,
        expiresInHours,
        startDate,
        endDate,
      )
      setExpiresValue('7')
      setExpiresUnit('days')
      setDateRange(undefined)
      await loadSharedLinks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLink = (linkId: string) => {
    setLinkToDelete(linkId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteLink = async () => {
    if (!linkToDelete) return

    try {
      await deleteSharedLink(linkToDelete, projectId)
      await loadSharedLinks()
    } catch {
      setError('Failed to delete link')
    }
    setShowDeleteDialog(false)
    setLinkToDelete(null)
  }

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/shared/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
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
              <Label htmlFor="expires">Expires in</Label>
              <div className="flex gap-2">
                <Input
                  id="expires"
                  type="number"
                  min="1"
                  value={expiresValue}
                  onChange={e => setExpiresValue(e.target.value)}
                  className="flex-1"
                />
                <Select
                  value={expiresUnit}
                  onValueChange={value =>
                    setExpiresUnit(value as 'days' | 'hours')
                  }>
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label>Date Range (Optional)</Label>
            <div className="mt-2">
              <DateRangePicker
                dateRange={dateRange}
                setDateRange={setDateRange}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Filter entries shown in the shared link to this date range
            </p>
          </div>

          <Button
            onClick={handleCreateLink}
            disabled={loading}
            className="w-full">
            {loading ? 'Creating...' : 'Create Link'}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {sharedLinks.length > 0 && (
            <div className="space-y-2">
              <Label>Active Links</Label>
              {sharedLinks.map(link => (
                <Card
                  key={link.id}
                  className={isExpired(link.expiresAt) ? 'opacity-50' : ''}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {isExpired(link.expiresAt) ? 'Expired' : 'Active'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Expires: {formatDateTime(link.expiresAt)}
                      </div>
                      {link.startDate && link.endDate && (
                        <div className="text-xs text-muted-foreground">
                          Range: {formatDate(link.startDate)} -{' '}
                          {formatDate(link.endDate)}
                        </div>
                      )}
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
                        aria-label={
                          copiedToken === link.token
                            ? 'Copied link'
                            : 'Copy share link'
                        }
                        title={
                          copiedToken === link.token
                            ? 'Copied'
                            : 'Copy share link'
                        }>
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
                        aria-label="Delete share link"
                        title="Delete share link">
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

      {/* Delete Link Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shared Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shared link? Anyone with this
              link will no longer be able to access the project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
