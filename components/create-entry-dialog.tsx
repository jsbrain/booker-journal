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

interface CreateEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  onSuccess: () => void
}

type EntryType = {
  id: number
  key: string
  name: string
}

export function CreateEntryDialog({ open, onOpenChange, projectId, onSuccess }: CreateEntryDialogProps) {
  const [amount, setAmount] = useState("")
  const [price, setPrice] = useState("")
  const [typeId, setTypeId] = useState("")
  const [note, setNote] = useState("")
  const [entryTypes, setEntryTypes] = useState<EntryType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      loadEntryTypes()
    }
  }, [open])

  const loadEntryTypes = async () => {
    try {
      const types = await getEntryTypes()
      setEntryTypes(types)
      if (types.length > 0) {
        setTypeId(types[0].id.toString())
      }
    } catch {
      setError("Failed to load entry types")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const amountNum = parseFloat(amount)
      const priceNum = parseFloat(price)
      const typeIdNum = parseInt(typeId)

      if (isNaN(amountNum) || isNaN(priceNum) || isNaN(typeIdNum)) {
        setError("Please enter valid numbers")
        return
      }

      await createEntry(projectId, amountNum, priceNum, typeIdNum, note || undefined)
      
      // Reset form
      setAmount("")
      setPrice("")
      setNote("")
      if (entryTypes.length > 0) {
        setTypeId(entryTypes[0].id.toString())
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
              <Select value={typeId} onValueChange={setTypeId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {entryTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
