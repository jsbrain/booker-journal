'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, LogOut } from 'lucide-react'
import {
  getProducts,
  createProduct,
  updateProductName,
  updateProductBuyingPrice,
  deleteProduct,
} from '@/lib/actions/products'
import { devLogError, getPublicErrorMessage } from '@/lib/utils/public-error'
import Link from 'next/link'

import {
  getActiveSharedLinksForUser,
  deleteSharedLink,
} from '@/lib/actions/shared-links'
import { ProductsSection } from '@/components/admin/products-section'
import { ActiveSharedLinksSection } from '@/components/admin/active-shared-links-section'
import { ProductDialogs } from '@/components/admin/product-dialogs'
import { AdminConfirmationDialogs } from '@/components/admin/admin-confirmation-dialogs'
import type { Product, ActiveSharedLink } from '@/components/admin/types'

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
        <ProductsSection
          products={products}
          onCreate={() => setShowCreateDialog(true)}
          onEditName={openEditDialog}
          onEditPrice={openEditPriceDialog}
          onDelete={handleDeleteProduct}
        />

        <ActiveSharedLinksSection
          links={activeLinks}
          copiedLinkId={copiedLinkId}
          onCopy={handleCopySharedLink}
          onRevoke={handleRevokeSharedLink}
        />
      </main>

      <ProductDialogs
        error={error}
        showCreateDialog={showCreateDialog}
        setShowCreateDialog={setShowCreateDialog}
        showEditDialog={showEditDialog}
        setShowEditDialog={setShowEditDialog}
        showEditPriceDialog={showEditPriceDialog}
        setShowEditPriceDialog={setShowEditPriceDialog}
        newProductKey={newProductKey}
        setNewProductKey={setNewProductKey}
        newProductName={newProductName}
        setNewProductName={setNewProductName}
        editProductName={editProductName}
        setEditProductName={setEditProductName}
        editProductBuyingPrice={editProductBuyingPrice}
        setEditProductBuyingPrice={setEditProductBuyingPrice}
        onCreateProduct={handleCreateProduct}
        onUpdateProduct={handleUpdateProduct}
        onUpdateBuyingPrice={handleUpdateBuyingPrice}
      />

      <AdminConfirmationDialogs
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        productToDelete={productToDelete}
        onConfirmDeleteProduct={confirmDeleteProduct}
        showDeleteLinkDialog={showDeleteLinkDialog}
        setShowDeleteLinkDialog={setShowDeleteLinkDialog}
        linkToDelete={linkToDelete}
        onConfirmRevokeLink={confirmRevokeSharedLink}
      />
    </div>
  )
}
