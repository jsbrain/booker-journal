'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateEntry } from '@/lib/actions/entries'
import { getEntryTypes } from '@/lib/actions/entry-types'
import { getProducts } from '@/lib/actions/products'
import { devLogError, getPublicErrorMessage } from '@/lib/utils/public-error'
import { normalizeEntryPrice } from '@/lib/domain/entries'

interface EditEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  entry: {
    id: string
    amount: string
    price: string
    typeId: string
    productId: string | null
    note: string | null
    type: {
      key: string
    }
  }
  onSuccess: () => void
}

type EntryType = {
  id: string
  key: string
  name: string
}

type Product = {
  id: string
  key: string
  name: string
}

export function EditEntryDialog({
  open,
  onOpenChange,
  projectId,
  entry,
  onSuccess,
}: EditEntryDialogProps) {
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')
  const [typeId, setTypeId] = useState('')
  const [productId, setProductId] = useState('')
  const [note, setNote] = useState('')
  const [entryTypes, setEntryTypes] = useState<EntryType[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedTypeKey, setSelectedTypeKey] = useState('')

  useEffect(() => {
    if (open) {
      loadData()
      setAmount(entry.amount)
      setPrice(
        entry.type.key === 'sale' || entry.type.key === 'payment'
          ? Math.abs(parseFloat(entry.price)).toString()
          : entry.price,
      )
      setTypeId(entry.typeId)
      setProductId(entry.productId || '')
      setNote(entry.note || '')
      setSelectedTypeKey(entry.type.key)
    }
  }, [open, entry])

  const loadData = async () => {
    try {
      const [types, prods] = await Promise.all([getEntryTypes(), getProducts()])
      setEntryTypes(types)
      setProducts(prods)
    } catch {
      setError('Failed to load data')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amountNum = parseFloat(amount)
      const rawPrice = parseFloat(price)

      if (!Number.isFinite(amountNum) || !Number.isFinite(rawPrice)) {
        setError('Please enter valid numbers')
        return
      }

      if (amountNum <= 0) {
        setError('Amount must be greater than 0')
        return
      }

      if (
        (selectedTypeKey === 'sale' || selectedTypeKey === 'payment') &&
        rawPrice <= 0
      ) {
        setError('Price must be greater than 0 for sales and payments')
        return
      }

      if (selectedTypeKey === 'sale' && !productId) {
        setError('Select a product for the sale')
        return
      }

      const priceNum = normalizeEntryPrice(selectedTypeKey, rawPrice)

      await updateEntry(entry.id, projectId, {
        amount: amountNum,
        price: priceNum,
        typeId,
        productId: selectedTypeKey === 'sale' ? productId : null,
        note,
      })

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      devLogError('Failed to update entry:', err)
      setError(getPublicErrorMessage(err, 'Failed to update entry'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Journal Entry</DialogTitle>
            <DialogDescription>
              Make changes to the journal entry
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={typeId}
                onValueChange={(value) => {
                  setTypeId(value)
                  const type = entryTypes.find((t) => t.id === value)
                  if (type) {
                    setSelectedTypeKey(type.key)
                  }
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {entryTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTypeKey === 'sale' && (
              <div className="grid gap-2">
                <Label htmlFor="edit-product">Product</Label>
                <Select value={productId} onValueChange={setProductId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Product is only required for sale type entries
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-amount">Amount/Quantity</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g., 5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-price">
                {selectedTypeKey === 'adjustment'
                  ? 'Signed Value per Unit (€)'
                  : 'Price per Unit (€)'}
              </Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min={
                  selectedTypeKey === 'sale' || selectedTypeKey === 'payment'
                    ? '0.01'
                    : undefined
                }
                placeholder={
                  selectedTypeKey === 'adjustment' ? 'e.g., -20' : 'e.g., 20'
                }
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                {selectedTypeKey === 'sale'
                  ? 'Enter a positive price. The sale is recorded as money the customer owes.'
                  : selectedTypeKey === 'payment'
                    ? 'Enter a positive payment amount. It reduces what the customer owes.'
                    : 'Use a negative value to increase the amount owed, or a positive value to reduce it.'}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-note">Note (optional)</Label>
              <Textarea
                id="edit-note"
                placeholder="Add a note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
