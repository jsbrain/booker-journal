'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, LogOut, Plus, Trash2, Edit2 } from 'lucide-react'
import {
  getProducts,
  createProduct,
  updateProductName,
  updateProductBuyingPrice,
  deleteProduct,
} from '@/lib/actions/products'
import { formatCurrency, formatDate } from '@/lib/utils/locale'
import { devLogError, getPublicErrorMessage } from '@/lib/utils/public-error'
import Link from 'next/link'
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
  getActiveSharedLinksForUser,
  deleteSharedLink,
} from '@/lib/actions/shared-links'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/locale'

type Product = {
  id: string
  key: string
  name: string
  defaultBuyingPrice: string | null
  createdAt: Date
  updatedAt: Date
}

type ActiveSharedLink = {
  id: string
  projectId: string
  projectName: string
  token: string
  expiresAt: Date
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
  encrypted: boolean
}

export default function AdminPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [activeLinks, setActiveLinks] = useState<ActiveSharedLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showEditPriceDialog, setShowEditPriceDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDeleteLinkDialog, setShowDeleteLinkDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [linkToDelete, setLinkToDelete] = useState<ActiveSharedLink | null>(
    null,
  )

  const [newProductKey, setNewProductKey] = useState('')
  const [newProductName, setNewProductName] = useState('')
  const [editProductName, setEditProductName] = useState('')
  const [editProductBuyingPrice, setEditProductBuyingPrice] = useState('')
  const [error, setError] = useState('')
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      loadProducts()
      loadActiveLinks()
    }
  }, [session])

  const loadProducts = async () => {
    try {
      const allProducts = await getProducts()
      setProducts(allProducts)
    } catch (error) {
      devLogError('Failed to load products:', error)
      setError(getPublicErrorMessage(error, 'Failed to load products'))
    } finally {
      setLoading(false)
    }
  }

  const loadActiveLinks = async () => {
    try {
      const links = await getActiveSharedLinksForUser()
      setActiveLinks(links)
    } catch (error) {
      devLogError('Failed to load shared links:', error)
      setError(getPublicErrorMessage(error, 'Failed to load shared links'))
    }
  }

  const handleCopySharedLink = async (token: string, linkId: string) => {
    const url = `${window.location.origin}/shared/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedLinkId(linkId)
    setTimeout(() => setCopiedLinkId(null), 1500)
  }

  const handleRevokeSharedLink = (link: ActiveSharedLink) => {
    setLinkToDelete(link)
    setShowDeleteLinkDialog(true)
  }

  const confirmRevokeSharedLink = async () => {
    if (!linkToDelete) return
    try {
      await deleteSharedLink(linkToDelete.id, linkToDelete.projectId)
      await loadActiveLinks()
    } catch (error) {
      devLogError('Failed to delete shared link:', error)
      setError(getPublicErrorMessage(error, 'Failed to delete shared link'))
    } finally {
      setShowDeleteLinkDialog(false)
      setLinkToDelete(null)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      await createProduct(newProductKey, newProductName)
      setNewProductKey('')
      setNewProductName('')
      setShowCreateDialog(false)
      loadProducts()
    } catch (err) {
      devLogError('Failed to create product:', err)
      setError(getPublicErrorMessage(err, 'Failed to create product'))
    }
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!editingProduct) return

    try {
      await updateProductName(editingProduct.id, editProductName)
      setShowEditDialog(false)
      setEditingProduct(null)
      setEditProductName('')
      loadProducts()
    } catch (err) {
      devLogError('Failed to update product:', err)
      setError(getPublicErrorMessage(err, 'Failed to update product'))
    }
  }

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product)
    setShowDeleteDialog(true)
  }

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return

    try {
      await deleteProduct(productToDelete.id)
      loadProducts()
    } catch (error) {
      devLogError('Failed to delete product:', error)
      setError(
        getPublicErrorMessage(
          error,
          'Failed to delete product. It may be in use by existing entries.',
        ),
      )
    }
    setShowDeleteDialog(false)
    setProductToDelete(null)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setEditProductName(product.name)
    setShowEditDialog(true)
  }

  const openEditPriceDialog = (product: Product) => {
    setEditingProduct(product)
    setEditProductBuyingPrice(product.defaultBuyingPrice || '')
    setShowEditPriceDialog(true)
  }

  const handleUpdateBuyingPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!editingProduct) return

    try {
      await updateProductBuyingPrice(
        editingProduct.id,
        parseFloat(editProductBuyingPrice),
      )
      setShowEditPriceDialog(false)
      setEditingProduct(null)
      setEditProductBuyingPrice('')
      loadProducts()
    } catch (err) {
      devLogError('Failed to update buying price:', err)
      setError(getPublicErrorMessage(err, 'Failed to update buying price'))
    }
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
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Product Management</h1>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        {error && <div className="mb-4 text-sm text-destructive">{error}</div>}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Products</h2>
            <p className="text-sm text-muted-foreground">
              Manage product types for journal entries
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Product
          </Button>
        </div>

        <div className="space-y-2">
          {products.map(product => (
            <Card key={product.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({product.key})
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Created {formatDate(product.createdAt)}</span>
                    <span>•</span>
                    <span>
                      Default buying price:{' '}
                      {product.defaultBuyingPrice
                        ? formatCurrency(parseFloat(product.defaultBuyingPrice))
                        : 'Not set'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(product)}>
                    <Edit2 className="mr-1 h-3 w-3" />
                    Name
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditPriceDialog(product)}>
                    <Edit2 className="mr-1 h-3 w-3" />
                    Price
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProduct(product)}
                    aria-label="Delete product"
                    title="Delete product">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Active Shared Links</h2>
            <p className="text-sm text-muted-foreground">
              All unexpired shared links across your projects
            </p>
          </div>

          {activeLinks.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                No active shared links.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {activeLinks.map(link => {
                const url = `/shared/${link.token}`
                return (
                  <Card key={link.id}>
                    <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/projects/${link.projectId}`}
                            className="truncate font-medium hover:underline">
                            {link.projectName}
                          </Link>
                          {link.encrypted ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                              Encrypted
                            </span>
                          ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                              Public
                            </span>
                          )}
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
                                {link.startDate
                                  ? formatDate(link.startDate)
                                  : '…'}
                                {' — '}
                                {link.endDate ? formatDate(link.endDate) : '…'}
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
                          onClick={() =>
                            handleCopySharedLink(link.token, link.id)
                          }>
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
                          onClick={() => handleRevokeSharedLink(link)}>
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
      </main>

      {/* Create Product Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-106.25">
          <form onSubmit={handleCreateProduct}>
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
                  onChange={e => setNewProductKey(e.target.value)}
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
                  onChange={e => setNewProductName(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Product</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-106.25">
          <form onSubmit={handleUpdateProduct}>
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
                  onChange={e => setEditProductName(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Buying Price Dialog */}
      <Dialog open={showEditPriceDialog} onOpenChange={setShowEditPriceDialog}>
        <DialogContent className="sm:max-w-106.25">
          <form onSubmit={handleUpdateBuyingPrice}>
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
                  onChange={e => setEditProductBuyingPrice(e.target.value)}
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
                onClick={() => setShowEditPriceDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Price</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation Dialog */}
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
              onClick={confirmDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Shared Link Confirmation Dialog */}
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
              onClick={confirmRevokeSharedLink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
