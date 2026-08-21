'use client'

import Link from 'next/link'
import { Check, Copy, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatDateTime } from '@/lib/utils/locale'
import type { ActiveSharedLink } from '@/components/admin/types'

type ActiveSharedLinksSectionProps = {
  links: ActiveSharedLink[]
  copiedLinkId: string | null
  onCopy: (token: string, linkId: string) => void
  onRevoke: (link: ActiveSharedLink) => void
}

export function ActiveSharedLinksSection({
  links,
  copiedLinkId,
  onCopy,
  onRevoke,
}: ActiveSharedLinksSectionProps) {
  return (
    <div className="mt-10">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Active Shared Links</h2>
        <p className="text-sm text-muted-foreground">
          All unexpired shared links across your projects
        </p>
      </div>

      {links.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No active shared links.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {links.map((link) => {
            const url = `/shared/${link.token}`
            return (
              <Card key={link.id}>
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/projects/${link.projectId}`}
                        className="truncate font-medium hover:underline"
                      >
                        {link.projectName}
                      </Link>
                      <span className="bg-muted px-2 py-0.5 text-xs">
                        Live encrypted · password protected
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span>Expires {formatDateTime(link.expiresAt)}</span>
                      <span>•</span>
                      <span>Created {formatDate(link.createdAt)}</span>
                      {(link.startDate || link.endDate) && (
                        <>
                          <span>•</span>
                          <span>
                            Range:{' '}
                            {link.startDate ? formatDate(link.startDate) : '…'}{' '}
                            — {link.endDate ? formatDate(link.endDate) : '…'}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="mt-2 truncate text-xs text-muted-foreground">
                      /shared/{link.token}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCopy(link.token, link.id)}
                    >
                      {copiedLinkId === link.id ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>

                    <Button variant="outline" size="sm" asChild>
                      <a href={url} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </a>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRevoke(link)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Revoke
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
