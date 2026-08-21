'use client'

import { UserCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/locale'
import type { PendingUser } from '@/components/admin/types'

type UserApprovalsSectionProps = {
  users: PendingUser[]
  approvingUserId: string | null
  onApprove: (userId: string) => void
}

export function UserApprovalsSection({
  users,
  approvingUserId,
  onApprove,
}: UserApprovalsSectionProps) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">User Approvals</h2>
        <p className="text-sm text-muted-foreground">
          New users cannot sign in or access project data until you approve
          them.
        </p>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No users are awaiting approval.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((pendingUser) => (
            <Card key={pendingUser.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate font-medium">{pendingUser.name}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {pendingUser.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Registered {formatDateTime(pendingUser.createdAt)}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => onApprove(pendingUser.id)}
                  disabled={approvingUserId === pendingUser.id}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  {approvingUserId === pendingUser.id
                    ? 'Approving...'
                    : 'Approve'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
