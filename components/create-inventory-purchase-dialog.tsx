"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createInventoryPurchase } from "@/lib/actions/inventory"
import { getProducts } from "@/lib/actions/products"

interface CreateInventoryPurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSuccess: () => void
}

type Product = {
  id: string
  key: string
  name: string
  defaultBuyingPrice: string | null
}

export function CreateInventoryPurchaseDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: CreateInventoryPurchaseDialogProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [buyingPrice, setBuyingPrice] = useState("")
  const [note, setNote] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      loadProducts()
    }
  }, [open])

  const loadProducts = async () => {
    try {
      const data = await getProducts()
      setProducts(data)
    } catch (error) {
      console.error("Failed to load products:", error)
    }
  }

  const handleProductChange = (value: string) => {
    setProductId(value)
    const product = products.find((p) => p.id === value)
    if (product?.defaultBuyingPrice) {
      setBuyingPrice(parseFloat(product.defaultBuyingPrice).toString())
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await createInventoryPurchase(
        projectId,
        productId,
        parseFloat(quantity),
        parseFloat(buyingPrice),
        note || undefined,
        purchaseDate
      )
      
      // Reset form
      setProductId("")
      setQuantity("")
      setBuyingPrice("")
      setNote("")
      setPurchaseDate(new Date().toISOString().split("T")[0])
      
      onSuccess()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create purchase")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Inventory Purchase</DialogTitle>
          <DialogDescription>
            Record a purchase of inventory/materials for cost tracking
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Select value={productId} onValueChange={handleProductChange}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g., 100"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="buyingPrice">Buying Price (per unit)</Label>
            <Input
              id="buyingPrice"
              type="number"
              step="0.01"
              value={buyingPrice}
              onChange={(e) => setBuyingPrice(e.target.value)}
              placeholder="e.g., 10.50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any notes about this purchase"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Purchase"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
