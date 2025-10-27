"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import type { DateRange } from "react-day-picker"
import { getProjectMetrics, getGlobalMetrics, getCurrentMonthRange, type ProjectMetrics } from "@/lib/actions/metrics"
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart } from "lucide-react"

interface MetricsDashboardProps {
  projectId: string | null  // null means global metrics
}

type DatePreset = "all" | "this-year" | "last-year" | "this-month" | "last-month" | "last-14-days" | "custom"

export function MetricsDashboard({ projectId }: MetricsDashboardProps) {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  useEffect(() => {
    // Set default to current month
    const loadDefaultDates = async () => {
      const { startDate: start, endDate: end } = await getCurrentMonthRange()
      setDateRange({
        from: new Date(start),
        to: new Date(end),
      })
    }
    loadDefaultDates()
  }, [projectId])

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      loadMetrics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, projectId])

  const loadMetrics = async () => {
    if (!dateRange?.from || !dateRange?.to) return
    
    setLoading(true)
    try {
      // Create a copy of the end date and set time to end of day
      const endOfDay = new Date(dateRange.to)
      endOfDay.setHours(23, 59, 59, 999)
      
      const data = projectId
        ? await getProjectMetrics(
            projectId,
            dateRange.from.toISOString(),
            endOfDay.toISOString()
          )
        : await getGlobalMetrics(
            dateRange.from.toISOString(),
            endOfDay.toISOString()
          )
      setMetrics(data)
    } catch (error) {
      console.error("Failed to load metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(value)
  }

  if (loading) {
    return (
      <div className="text-muted-foreground">Loading metrics...</div>
    )
  }

  if (!metrics) {
    return null
  }

  const profitMargin = metrics.revenue > 0 
    ? ((metrics.profit / metrics.revenue) * 100).toFixed(1)
    : "0.0"

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Period Selection</CardTitle>
          <CardDescription>Choose the date range for metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
        </CardContent>
      </Card>

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
            <p className="text-xs text-muted-foreground">
              Cost of goods sold
            </p>
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
            <div className={`text-2xl font-bold ${metrics.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
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
              {metrics.productBreakdown.map((product) => (
                <div key={product.productId} className="border-b pb-4 last:border-0 last:pb-0">
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
                      <div className={`font-medium ${product.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
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
