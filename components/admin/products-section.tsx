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
      <div className="mb-6 flex items-center justify-between">
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
        {products.map((product) => (
          <Card key={product.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{product.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({product.key})
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
              <div className="flex gap-2">
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
