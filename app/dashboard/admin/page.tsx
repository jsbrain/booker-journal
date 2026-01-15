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

type Product = {
  id: string
  key: string
  name: string
  defaultBuyingPrice: string | null
  createdAt: Date
  updatedAt: Date
}

export default function AdminPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showEditPriceDialog, setShowEditPriceDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  const [newProductKey, setNewProductKey] = useState('')
  const [newProductName, setNewProductName] = useState('')
  const [editProductName, setEditProductName] = useState('')
  const [editProductBuyingPrice, setEditProductBuyingPrice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      loadProducts()
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
      </main>

      {/* Create Product Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px]">
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
        <DialogContent className="sm:max-w-[425px]">
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
        <DialogContent className="sm:max-w-[425px]">
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
    </div>
  )
}
