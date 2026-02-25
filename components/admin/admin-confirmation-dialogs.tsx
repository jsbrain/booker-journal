'use client'

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
import type { ActiveSharedLink, Product } from '@/components/admin/types'

type AdminConfirmationDialogsProps = {
  showDeleteDialog: boolean
  setShowDeleteDialog: (open: boolean) => void
  productToDelete: Product | null
  onConfirmDeleteProduct: () => void
  showDeleteLinkDialog: boolean
  setShowDeleteLinkDialog: (open: boolean) => void
  linkToDelete: ActiveSharedLink | null
  onConfirmRevokeLink: () => void
}

export function AdminConfirmationDialogs({
  showDeleteDialog,
  setShowDeleteDialog,
  productToDelete,
  onConfirmDeleteProduct,
  showDeleteLinkDialog,
  setShowDeleteLinkDialog,
  linkToDelete,
  onConfirmRevokeLink,
}: AdminConfirmationDialogsProps) {
  return (
    <>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{productToDelete?.name}
              &quot;? This may affect existing entries and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showDeleteLinkDialog}
        onOpenChange={setShowDeleteLinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Shared Link</AlertDialogTitle>
            <AlertDialogDescription>
              Revoke this shared link for &quot;{linkToDelete?.projectName}
              &quot;? Anyone with the URL will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmRevokeLink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
