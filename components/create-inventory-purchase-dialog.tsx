'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateTimePicker } from '@/components/date-time-picker'
import { createInventoryPurchase } from '@/lib/actions/inventory'
import { getProducts } from '@/lib/actions/products'
import { devLogError, getPublicErrorMessage } from '@/lib/utils/public-error'

interface CreateInventoryPurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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
  onSuccess,
}: CreateInventoryPurchaseDialogProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [buyingPrice, setBuyingPrice] = useState('')
  const [note, setNote] = useState('')
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      loadProducts()
      // Set default timestamp to current date/time
      setPurchaseDate(new Date())
    }
  }, [open])

  const loadProducts = async () => {
    try {
      const data = await getProducts()
      setProducts(data)
    } catch (error) {
      devLogError('Failed to load products:', error)
      setError(getPublicErrorMessage(error, 'Failed to load products'))
    }
  }

  const handleProductChange = (value: string) => {
    setProductId(value)
    const product = products.find(p => p.id === value)
    if (product?.defaultBuyingPrice) {
      setBuyingPrice(parseFloat(product.defaultBuyingPrice).toString())
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Convert datetime to ISO string
      const purchaseDateISO = purchaseDate
        ? purchaseDate.toISOString()
        : undefined

      await createInventoryPurchase(
        productId,
        parseFloat(quantity),
        parseFloat(buyingPrice),
        note || undefined,
        purchaseDateISO,
      )

      // Reset form
      setProductId('')
      setQuantity('')
      setBuyingPrice('')
      setNote('')
      setPurchaseDate(new Date())

      onSuccess()
    } catch (error) {
      devLogError('Failed to create purchase:', error)
      setError(getPublicErrorMessage(error, 'Failed to create purchase'))
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
            Record a global inventory purchase for cost tracking
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
                {products.map(product => (
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
              onChange={e => setQuantity(e.target.value)}
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
              onChange={e => setBuyingPrice(e.target.value)}
              placeholder="e.g., 10.50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date & Time</Label>
            <DateTimePicker
              date={purchaseDate}
              setDate={setPurchaseDate}
              placeholder="Select purchase date and time"
            />
            <p className="text-xs text-muted-foreground">
              When this purchase occurred (defaults to now)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add any notes about this purchase"
              rows={3}
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Purchase'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
