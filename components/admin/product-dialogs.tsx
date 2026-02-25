'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ProductDialogsProps = {
  error: string
  showCreateDialog: boolean
  setShowCreateDialog: (open: boolean) => void
  showEditDialog: boolean
  setShowEditDialog: (open: boolean) => void
  showEditPriceDialog: boolean
  setShowEditPriceDialog: (open: boolean) => void
  newProductKey: string
  setNewProductKey: (value: string) => void
  newProductName: string
  setNewProductName: (value: string) => void
  editProductName: string
  setEditProductName: (value: string) => void
  editProductBuyingPrice: string
  setEditProductBuyingPrice: (value: string) => void
  onCreateProduct: (e: React.FormEvent) => void
  onUpdateProduct: (e: React.FormEvent) => void
  onUpdateBuyingPrice: (e: React.FormEvent) => void
}

export function ProductDialogs({
  error,
  showCreateDialog,
  setShowCreateDialog,
  showEditDialog,
  setShowEditDialog,
  showEditPriceDialog,
  setShowEditPriceDialog,
  newProductKey,
  setNewProductKey,
  newProductName,
  setNewProductName,
  editProductName,
  setEditProductName,
  editProductBuyingPrice,
  setEditProductBuyingPrice,
  onCreateProduct,
  onUpdateProduct,
  onUpdateBuyingPrice,
}: ProductDialogsProps) {
  return (
    <>
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-106.25">
          <form onSubmit={onCreateProduct}>
            <DialogHeader>
              <DialogTitle>Create Product</DialogTitle>
              <DialogDescription>
                Add a new product type for journal entries
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="key">Key (internal identifier)</Label>
                <Input
                  id="key"
                  placeholder="e.g., custom_product"
                  value={newProductKey}
                  onChange={(e) => setNewProductKey(e.target.value)}
                  pattern="^[a-z_]+$"
                  title="Only lowercase letters and underscores"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use lowercase letters and underscores only
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Custom Product"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Product</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-106.25">
          <form onSubmit={onUpdateProduct}>
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update the display name for this product
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Display Name</Label>
                <Input
                  id="edit-name"
                  placeholder="e.g., Custom Product"
                  value={editProductName}
                  onChange={(e) => setEditProductName(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditPriceDialog} onOpenChange={setShowEditPriceDialog}>
        <DialogContent className="sm:max-w-106.25">
          <form onSubmit={onUpdateBuyingPrice}>
            <DialogHeader>
              <DialogTitle>Edit Default Buying Price</DialogTitle>
              <DialogDescription>
                Set the default buying price for this product (used as default
                in inventory purchases)
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Default Buying Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 10.50"
                  value={editProductBuyingPrice}
                  onChange={(e) => setEditProductBuyingPrice(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This price will be used as the default when adding inventory
                  purchases
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditPriceDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Price</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
