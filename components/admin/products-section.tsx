'use client'

import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils/locale'
import type { Product } from '@/components/admin/types'

type ProductsSectionProps = {
  products: Product[]
  onCreate: () => void
  onEditName: (product: Product) => void
  onEditPrice: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ProductsSection({
  products,
  onCreate,
  onEditName,
  onEditPrice,
  onDelete,
}: ProductsSectionProps) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-sm text-muted-foreground">
            Manage product types for journal entries
          </p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Product
        </Button>
      </div>

      <div className="space-y-2">
        {products.length === 0 && (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              No products yet. Create one before recording sales or inventory.
            </CardContent>
          </Card>
        )}
        {products.map((product) => (
          <Card key={product.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{product.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({product.key})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>Created {formatDate(product.createdAt)}</span>
                  <span>•</span>
                  <span>
                    Default buying price:{' '}
                    {product.defaultBuyingPrice
                      ? formatCurrency(parseFloat(product.defaultBuyingPrice))
                      : 'Not set'}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditName(product)}
                >
                  <Edit2 className="mr-1 h-3 w-3" />
                  Name
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditPrice(product)}
                >
                  <Edit2 className="mr-1 h-3 w-3" />
                  Price
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(product)}
                  aria-label="Delete product"
                  title="Delete product"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
