"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Plus } from "lucide-react"
import { getInventoryPurchases, deleteInventoryPurchase, getCurrentInventory } from "@/lib/actions/inventory"
import { CreateInventoryPurchaseDialog } from "./create-inventory-purchase-dialog"

type InventoryPurchase = {
  id: string
  userId: string
  productId: string
  quantity: string
  buyingPrice: string
  totalCost: string
  note: string | null
  purchaseDate: Date
  product: {
    id: string
    key: string
    name: string
  }
}

type InventorySummary = {
  productId: string
  productName: string
  totalPurchased: number
  totalSold: number
  currentStock: number
  averageBuyingPrice: number
  totalCost: number
}

export function InventoryList() {
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([])
  const [inventorySummary, setInventorySummary] = useState<InventorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    loadInventoryData()
  }, [])

  const loadInventoryData = async () => {
    setLoading(true)
    try {
      // Load both purchase history and current inventory summary
      const [purchasesData, summaryData] = await Promise.all([
        getInventoryPurchases(),
        getCurrentInventory(),
      ])
      setPurchases(purchasesData)
      setInventorySummary(summaryData)
    } catch (error) {
      console.error("Failed to load inventory:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (purchaseId: string) => {
    if (!confirm("Are you sure you want to delete this purchase?")) {
      return
    }

    try {
      await deleteInventoryPurchase(purchaseId)
      loadInventoryData()
    } catch (error) {
      console.error("Failed to delete purchase:", error)
    }
  }

  const handleSuccess = () => {
    setShowCreateDialog(false)
    loadInventoryData()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading inventory...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventory Summary</CardTitle>
              <CardDescription>
                Global inventory levels across all customers
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Purchase
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {inventorySummary.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inventory data available</p>
          ) : (
            <div className="space-y-4">
              {inventorySummary.map((item) => {
                const currentValue = item.currentStock * item.averageBuyingPrice
                return (
                  <div key={item.productId} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-muted-foreground">
                        Avg. buying price: {formatCurrency(item.averageBuyingPrice)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Purchased: {item.totalPurchased.toFixed(2)} units • Sold: {item.totalSold.toFixed(2)} units
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-medium ${item.currentStock < 0 ? "text-red-600" : "text-green-600"}`}>
                        {item.currentStock.toFixed(2)} units
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Value: {formatCurrency(currentValue)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>All global inventory purchases</CardDescription>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="mb-4 text-sm text-muted-foreground">
                No purchases recorded yet
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Purchase
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {purchases.map((purchase) => (
                <Card key={purchase.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{purchase.product.name}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(purchase.purchaseDate)}
                        </span>
                      </div>
                      {purchase.note && (
                        <p className="text-sm text-muted-foreground">{purchase.note}</p>
                      )}
                      <div className="mt-1 text-sm text-muted-foreground">
                        Quantity: {parseFloat(purchase.quantity).toFixed(2)} × {formatCurrency(parseFloat(purchase.buyingPrice))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {formatCurrency(parseFloat(purchase.totalCost))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(purchase.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateInventoryPurchaseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
