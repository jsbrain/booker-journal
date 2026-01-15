'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { DateRange } from 'react-day-picker'
import {
  getProjectMetrics,
  getGlobalMetrics,
  type ProjectMetrics,
} from '@/lib/actions/metrics'
import { formatCurrency } from '@/lib/utils/locale'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
} from 'lucide-react'
import { devLogError, getPublicErrorMessage } from '@/lib/utils/public-error'

interface MetricsDashboardProps {
  projectId: string | null // null means global metrics
  dateRange: DateRange | undefined
}

export function MetricsDashboard({
  projectId,
  dateRange,
}: MetricsDashboardProps) {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      loadMetrics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, projectId])

  const loadMetrics = async () => {
    if (!dateRange?.from || !dateRange?.to) return

    setLoading(true)
    setErrorMessage('')
    try {
      // Create a copy of the end date and set time to end of day
      const endOfDay = new Date(dateRange.to)
      endOfDay.setHours(23, 59, 59, 999)

      const data = projectId
        ? await getProjectMetrics(
            projectId,
            dateRange.from.toISOString(),
            endOfDay.toISOString(),
          )
        : await getGlobalMetrics(
            dateRange.from.toISOString(),
            endOfDay.toISOString(),
          )
      setMetrics(data)
    } catch (error) {
      devLogError('Failed to load metrics:', error)
      setErrorMessage(getPublicErrorMessage(error, 'Failed to load metrics'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-7 w-32 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-40 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-56 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-10 animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!metrics) {
    if (errorMessage) {
      return <div className="text-sm text-destructive">{errorMessage}</div>
    }
    return null
  }

  const profitMargin =
    metrics.revenue > 0
      ? ((metrics.profit / metrics.revenue) * 100).toFixed(1)
      : '0.0'

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.revenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total sales in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(metrics.cost)}
            </div>
            <p className="text-xs text-muted-foreground">Cost of goods sold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit</CardTitle>
            {metrics.profit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                metrics.profit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
              {formatCurrency(metrics.profit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Profit margin: {profitMargin}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEntries}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalPurchases} purchases made
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Breakdown */}
      {metrics.productBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Product Breakdown</CardTitle>
            <CardDescription>Detailed metrics by product</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.productBreakdown.map(product => (
                <div
                  key={product.productId}
                  className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-medium">{product.productName}</h4>
                    <span className="text-sm text-muted-foreground">
                      {product.quantitySold.toFixed(2)} units sold
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Revenue</div>
                      <div className="font-medium text-green-600">
                        {formatCurrency(product.revenue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cost</div>
                      <div className="font-medium text-orange-600">
                        {formatCurrency(product.cost)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Profit</div>
                      <div
                        className={`font-medium ${
                          product.profit >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                        {formatCurrency(product.profit)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
