"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, Package } from "lucide-react"
import { getInventoryPurchases, getGlobalInventory, deleteInventoryPurchase, getCurrentInventoryState } from "@/lib/actions/inventory"
import { CreateInventoryPurchaseDialog } from "./create-inventory-purchase-dialog"

interface InventoryListProps {
  projectId: string | null  // null means global inventory
}

type InventoryPurchase = {
  id: string
  projectId: string
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
  project?: {
    id: string
    name: string
  }
}

type InventoryState = {
  productId: string
  productName: string
  totalPurchased: number
  totalSold: number
  currentStock: number
  averageBuyingPrice: number
  totalCost: number
}

export function InventoryList({ projectId }: InventoryListProps) {
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([])
  const [inventoryState, setInventoryState] = useState<InventoryState[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    loadInventory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadInventory = async () => {
    setLoading(true)
    try {
      const [purchasesData, stateData] = await Promise.all([
        projectId 
          ? getInventoryPurchases(projectId)
          : getGlobalInventory(),
        getCurrentInventoryState(projectId)
      ])
      setPurchases(purchasesData)
      setInventoryState(stateData)
    } catch (error) {
      console.error("Failed to load inventory:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (purchaseId: string, purchaseProjectId: string) => {
    if (!confirm("Are you sure you want to delete this purchase?")) {
      return
    }

    try {
      await deleteInventoryPurchase(purchaseId, purchaseProjectId)
      loadInventory()
    } catch (error) {
      console.error("Failed to delete purchase:", error)
    }
  }

  const handleSuccess = () => {
    setShowCreateDialog(false)
    loadInventory()
  }

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(numValue)
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
      {/* Current Inventory State */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Inventory</CardTitle>
              <CardDescription>
                {projectId ? "Current stock levels for this project" : "Current stock levels across all projects"}
              </CardDescription>
            </div>
            {projectId && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Purchase
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {inventoryState.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Package className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No inventory yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inventoryState.map((item) => (
                <div key={item.productId} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <div className="font-medium">{item.productName}</div>
                    <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
                      <span>Purchased: {item.totalPurchased.toFixed(2)} units</span>
                      <span>Sold: {item.totalSold.toFixed(2)} units</span>
                      <span>Avg. price: {formatCurrency(item.averageBuyingPrice)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-medium ${
                      item.currentStock > 0 ? "text-green-600" : 
                      item.currentStock < 0 ? "text-red-600" : 
                      "text-muted-foreground"
                    }`}>
                      {item.currentStock.toFixed(2)} units
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Value: {formatCurrency(item.currentStock * item.averageBuyingPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>All inventory purchases</CardDescription>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="mb-4 text-sm text-muted-foreground">
                No purchases recorded yet
              </p>
              {projectId && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Purchase
                </Button>
              )}
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
                        {!projectId && purchase.project && (
                          <>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">
                              {purchase.project.name}
                            </span>
                          </>
                        )}
                      </div>
                      {purchase.note && (
                        <p className="text-sm text-muted-foreground">{purchase.note}</p>
                      )}
                      <div className="mt-1 text-sm text-muted-foreground">
                        Quantity: {parseFloat(purchase.quantity).toFixed(2)} × {formatCurrency(purchase.buyingPrice)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {formatCurrency(purchase.totalCost)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(purchase.id, purchase.projectId)}
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

      {projectId && (
        <CreateInventoryPurchaseDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          projectId={projectId}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
