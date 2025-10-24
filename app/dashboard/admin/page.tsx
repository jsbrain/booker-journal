"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, LogOut, Plus, Trash2, Edit2 } from "lucide-react"
import { getProducts, createProduct, updateProductName, deleteProduct } from "@/lib/actions/products"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Product = {
  id: string
  key: string
  name: string
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  const [newProductKey, setNewProductKey] = useState("")
  const [newProductName, setNewProductName] = useState("")
  const [editProductName, setEditProductName] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
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
      console.error("Failed to load products:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    try {
      await createProduct(newProductKey, newProductName)
      setNewProductKey("")
      setNewProductName("")
      setShowCreateDialog(false)
      loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product")
    }
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!editingProduct) return
    
    try {
      await updateProductName(editingProduct.id, editProductName)
      setShowEditDialog(false)
      setEditingProduct(null)
      setEditProductName("")
      loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product")
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product? This may affect existing entries.")) {
      return
    }

    try {
      await deleteProduct(productId)
      loadProducts()
    } catch (error) {
      console.error("Failed to delete product:", error)
      alert("Failed to delete product. It may be in use by existing entries.")
    }
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setEditProductName(product.name)
    setShowEditDialog(true)
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
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-sm text-muted-foreground">({product.key})</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(product.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(product)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
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
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
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
                  onChange={(e) => setEditProductName(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
