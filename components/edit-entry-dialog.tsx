"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateEntry } from "@/lib/actions/entries"
import { getEntryTypes } from "@/lib/actions/entry-types"
import { getProducts } from "@/lib/actions/products"

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

export function EditEntryDialog({ open, onOpenChange, projectId, entry, onSuccess }: EditEntryDialogProps) {
  const [amount, setAmount] = useState("")
  const [price, setPrice] = useState("")
  const [typeId, setTypeId] = useState("")
  const [productId, setProductId] = useState("")
  const [note, setNote] = useState("")
  const [entryTypes, setEntryTypes] = useState<EntryType[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedTypeKey, setSelectedTypeKey] = useState("")

  useEffect(() => {
    if (open) {
      loadData()
      setAmount(entry.amount)
      setPrice(entry.price)
      setTypeId(entry.typeId)
      setProductId(entry.productId || "")
      setNote(entry.note || "")
      setSelectedTypeKey(entry.type.key)
    }
  }, [open, entry])

  const loadData = async () => {
    try {
      const [types, prods] = await Promise.all([
        getEntryTypes(),
        getProducts(),
      ])
      setEntryTypes(types)
      setProducts(prods)
    } catch {
      setError("Failed to load data")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const amountNum = parseFloat(amount)
      const priceNum = parseFloat(price)

      if (isNaN(amountNum) || isNaN(priceNum)) {
        setError("Please enter valid numbers")
        return
      }

      await updateEntry(entry.id, projectId, {
        amount: amountNum,
        price: priceNum,
        typeId,
        productId: selectedTypeKey === "sale" ? productId : undefined,
        note: note || undefined,
      })
      
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update entry")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
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
                  const type = entryTypes.find(t => t.id === value)
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
            {selectedTypeKey === "sale" && (
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
                placeholder="e.g., 5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-price">Price (€)</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                placeholder="e.g., -20"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Negative for expenses/debt, positive for payments/income
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-note">Note (optional)</Label>
              <Input
                id="edit-note"
                placeholder="Add a note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
