'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus, Info, Search } from 'lucide-react'
import {
  getInventoryPurchases,
  deleteInventoryPurchase,
  getCurrentInventory,
} from '@/lib/actions/inventory'
import { CreateInventoryPurchaseDialog } from './create-inventory-purchase-dialog'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils/locale'

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
  averageSellingPrice: number
  totalCost: number
  totalRevenue: number
}

export function InventoryList() {
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([])
  const [inventorySummary, setInventorySummary] = useState<InventorySummary[]>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null)

  // Filter and sort states for purchase history
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<
    'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
  >('date-desc')
  const [productFilter, setProductFilter] = useState<string>('all')

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
      console.error('Failed to load inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (purchaseId: string) => {
    setPurchaseToDelete(purchaseId)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!purchaseToDelete) return

    try {
      await deleteInventoryPurchase(purchaseToDelete)
      loadInventoryData()
    } catch (error) {
      console.error('Failed to delete purchase:', error)
    }
    setShowDeleteDialog(false)
    setPurchaseToDelete(null)
  }

  const handleSuccess = () => {
    setShowCreateDialog(false)
    loadInventoryData()
  }

  // Get unique products for filter
  const uniqueProducts = useMemo(() => {
    const products = new Set<string>()
    purchases.forEach(p => products.add(p.product.name))
    return Array.from(products).sort()
  }, [purchases])

  // Filter and sort purchases
  const filteredAndSortedPurchases = useMemo(() => {
    let filtered = purchases

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        p =>
          p.product.name.toLowerCase().includes(query) ||
          (p.note && p.note.toLowerCase().includes(query)),
      )
    }

    // Apply product filter
    if (productFilter !== 'all') {
      filtered = filtered.filter(p => p.product.name === productFilter)
    }

    // Apply sorting
    const sorted = [...filtered]
    switch (sortBy) {
      case 'date-desc':
        sorted.sort(
          (a, b) =>
            new Date(b.purchaseDate).getTime() -
            new Date(a.purchaseDate).getTime(),
        )
        break
      case 'date-asc':
        sorted.sort(
          (a, b) =>
            new Date(a.purchaseDate).getTime() -
            new Date(b.purchaseDate).getTime(),
        )
        break
      case 'amount-desc':
        sorted.sort((a, b) => parseFloat(b.totalCost) - parseFloat(a.totalCost))
        break
      case 'amount-asc':
        sorted.sort((a, b) => parseFloat(a.totalCost) - parseFloat(b.totalCost))
        break
    }

    return sorted
  }, [purchases, searchQuery, productFilter, sortBy])

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
            <p className="text-sm text-muted-foreground">
              No inventory data available
            </p>
          ) : (
            <div className="space-y-4">
              {inventorySummary.map(item => {
                const currentValue = item.currentStock * item.averageBuyingPrice
                const possibleValue =
                  item.currentStock * item.averageSellingPrice
                return (
                  <div
                    key={item.productId}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 last:border-0 last:pb-0 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {item.productName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg. buying price:{' '}
                        {formatCurrency(item.averageBuyingPrice)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg. selling price:{' '}
                        {formatCurrency(item.averageSellingPrice)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Purchased: {formatNumber(item.totalPurchased)} units •
                        Sold: {formatNumber(item.totalSold)} units
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`text-lg font-medium ${
                          item.currentStock < 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}>
                        {formatNumber(item.currentStock)} units
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span
                          title="Calculated as current stock × average buying price (average cost method)"
                          className="inline-flex">
                          <Info className="h-3 w-3 text-muted-foreground mr-1" />
                        </span>
                        Buying value: {formatCurrency(currentValue)}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span
                          title="Estimated as current stock × average selling price"
                          className="inline-flex">
                          <Info className="h-3 w-3 text-muted-foreground mr-1" />
                        </span>
                        Apx. selling value: {formatCurrency(possibleValue)}{' '}
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
            <div className="space-y-4">
              {/* Filters and Search */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search products or notes..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {uniqueProducts.map(product => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sortBy}
                  onValueChange={(
                    value:
                      | 'date-desc'
                      | 'date-asc'
                      | 'amount-desc'
                      | 'amount-asc',
                  ) => setSortBy(value)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (Newest)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                    <SelectItem value="amount-desc">Amount (High)</SelectItem>
                    <SelectItem value="amount-asc">Amount (Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Purchase List */}
              <div className="space-y-2">
                {filteredAndSortedPurchases.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No purchases match your filters
                  </p>
                ) : (
                  filteredAndSortedPurchases.map(purchase => (
                    <Card key={purchase.id}>
                      <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium truncate">
                              {purchase.product.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              •
                            </span>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDate(purchase.purchaseDate)}
                            </span>
                          </div>
                          {purchase.note && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {purchase.note}
                            </p>
                          )}
                          <div className="mt-1 text-sm text-muted-foreground">
                            Quantity:{' '}
                            {formatNumber(parseFloat(purchase.quantity))} ×{' '}
                            {formatCurrency(parseFloat(purchase.buyingPrice))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 justify-between sm:justify-end">
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {formatCurrency(parseFloat(purchase.totalCost))}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(purchase.id)}
                            aria-label="Delete purchase"
                            title="Delete purchase">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateInventoryPurchaseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Purchase</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this inventory purchase? This
              action cannot be undone and will affect your inventory
              calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
