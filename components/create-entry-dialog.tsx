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
import { createEntry } from "@/lib/actions/entries"
import { getEntryTypes } from "@/lib/actions/entry-types"
import { getProducts } from "@/lib/actions/products"

interface CreateEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
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

export function CreateEntryDialog({ open, onOpenChange, projectId, onSuccess }: CreateEntryDialogProps) {
  const [amount, setAmount] = useState("")
  const [price, setPrice] = useState("")
  const [typeId, setTypeId] = useState("")
  const [productId, setProductId] = useState("")
  const [note, setNote] = useState("")
  const [timestamp, setTimestamp] = useState("")
  const [entryTypes, setEntryTypes] = useState<EntryType[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedTypeKey, setSelectedTypeKey] = useState("")

  useEffect(() => {
    if (open) {
      loadData()
      // Set default timestamp to current date/time
      const now = new Date()
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      setTimestamp(localDateTime)
    }
  }, [open])

  const loadData = async () => {
    try {
      const [types, prods] = await Promise.all([
        getEntryTypes(),
        getProducts(),
      ])
      setEntryTypes(types)
      setProducts(prods)
      if (types.length > 0) {
        setTypeId(types[0].id)
        setSelectedTypeKey(types[0].key)
      }
      if (prods.length > 0) {
        setProductId(prods[0].id)
      }
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

      // Convert local datetime to ISO string
      const timestampISO = timestamp ? new Date(timestamp).toISOString() : undefined

      await createEntry(
        projectId, 
        amountNum, 
        priceNum, 
        typeId, 
        selectedTypeKey === "purchase" ? productId : undefined,
        note || undefined, 
        timestampISO
      )
      
      // Reset form
      setAmount("")
      setPrice("")
      setNote("")
      const now = new Date()
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      setTimestamp(localDateTime)
      if (entryTypes.length > 0) {
        setTypeId(entryTypes[0].id)
        setSelectedTypeKey(entryTypes[0].key)
      }
      if (products.length > 0) {
        setProductId(products[0].id)
      }
      
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create entry")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Journal Entry</DialogTitle>
            <DialogDescription>
              Add a new entry to the project journal
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
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
            {selectedTypeKey === "purchase" && (
              <div className="grid gap-2">
                <Label htmlFor="product">Product</Label>
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
                  Product is only used for purchase type entries
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount/Quantity</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="e.g., 5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price (€)</Label>
              <Input
                id="price"
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
              <Label htmlFor="timestamp">Date & Time</Label>
              <Input
                id="timestamp"
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                When this transaction occurred (defaults to now)
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
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
              {loading ? "Creating..." : "Create Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
