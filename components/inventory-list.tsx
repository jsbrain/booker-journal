"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Plus } from "lucide-react"
import { getInventoryPurchases, getGlobalInventory, deleteInventoryPurchase } from "@/lib/actions/inventory"
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

export function InventoryList({ projectId }: InventoryListProps) {
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    loadPurchases()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadPurchases = async () => {
    setLoading(true)
    try {
      const data = projectId 
        ? await getInventoryPurchases(projectId)
        : await getGlobalInventory()
      setPurchases(data)
    } catch (error) {
      console.error("Failed to load purchases:", error)
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
      loadPurchases()
    } catch (error) {
      console.error("Failed to delete purchase:", error)
    }
  }

  const handleSuccess = () => {
    setShowCreateDialog(false)
    loadPurchases()
  }

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(parseFloat(value))
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

  // Calculate totals by product
  const productTotals = purchases.reduce((acc, purchase) => {
    const productName = purchase.product.name
    if (!acc[productName]) {
      acc[productName] = {
        quantity: 0,
        totalCost: 0,
      }
    }
    acc[productName].quantity += parseFloat(purchase.quantity)
    acc[productName].totalCost += parseFloat(purchase.totalCost)
    return acc
  }, {} as Record<string, { quantity: number; totalCost: number }>)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventory Summary</CardTitle>
              <CardDescription>
                {projectId ? "Project inventory by product" : "Global inventory by product"}
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
          {Object.keys(productTotals).length === 0 ? (
            <p className="text-sm text-muted-foreground">No inventory purchases yet</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(productTotals).map(([productName, totals]) => {
                const avgPrice = totals.quantity > 0 ? totals.totalCost / totals.quantity : 0
                return (
                  <div key={productName} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{productName}</div>
                      <div className="text-sm text-muted-foreground">
                        Avg. price: {formatCurrency(avgPrice.toString())}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{totals.quantity.toFixed(2)} units</div>
                      <div className="text-sm text-muted-foreground">
                        Total: {formatCurrency(totals.totalCost.toString())}
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
