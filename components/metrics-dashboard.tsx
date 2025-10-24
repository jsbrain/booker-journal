"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { getProjectMetrics, getGlobalMetrics, getCurrentMonthRange, type ProjectMetrics } from "@/lib/actions/metrics"
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart } from "lucide-react"

interface MetricsDashboardProps {
  projectId: string | null  // null means global metrics
}

type DatePreset = "all" | "this-year" | "last-year" | "this-month" | "last-month" | "last-14-days" | "custom"

export function MetricsDashboard({ projectId }: MetricsDashboardProps) {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [preset, setPreset] = useState<DatePreset>("all")

  useEffect(() => {
    // Set default to all time for global view, current month for project view
    if (projectId) {
      setPreset("this-month")
      loadDefaultDates()
    } else {
      setPreset("all")
      setAllTimeDates()
    }
  }, [projectId])

  const loadDefaultDates = async () => {
    const { startDate: start, endDate: end } = await getCurrentMonthRange()
    setStartDate(new Date(start).toISOString().split("T")[0])
    setEndDate(new Date(end).toISOString().split("T")[0])
  }

  const setAllTimeDates = () => {
    // Set to a very early date and today
    setStartDate("2020-01-01")
    setEndDate(new Date().toISOString().split("T")[0])
  }

  const applyPreset = (presetValue: DatePreset) => {
    setPreset(presetValue)
    const now = new Date()
    
    switch (presetValue) {
      case "all":
        setStartDate("2020-01-01")
        setEndDate(now.toISOString().split("T")[0])
        break
      case "this-year":
        setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0])
        setEndDate(now.toISOString().split("T")[0])
        break
      case "last-year":
        setStartDate(new Date(now.getFullYear() - 1, 0, 1).toISOString().split("T")[0])
        setEndDate(new Date(now.getFullYear() - 1, 11, 31).toISOString().split("T")[0])
        break
      case "this-month":
        setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0])
        setEndDate(now.toISOString().split("T")[0])
        break
      case "last-month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        setStartDate(lastMonth.toISOString().split("T")[0])
        setEndDate(lastMonthEnd.toISOString().split("T")[0])
        break
      case "last-14-days":
        const fourteenDaysAgo = new Date(now)
        fourteenDaysAgo.setDate(now.getDate() - 14)
        setStartDate(fourteenDaysAgo.toISOString().split("T")[0])
        setEndDate(now.toISOString().split("T")[0])
        break
      case "custom":
        // Don't change dates, let user pick
        break
    }
  }

  useEffect(() => {
    if (startDate && endDate) {
      loadMetrics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, projectId])

  const loadMetrics = async () => {
    if (!startDate || !endDate) return
    
    setLoading(true)
    try {
      const data = projectId
        ? await getProjectMetrics(
            projectId,
            new Date(startDate).toISOString(),
            new Date(endDate + "T23:59:59").toISOString()
          )
        : await getGlobalMetrics(
            new Date(startDate).toISOString(),
            new Date(endDate + "T23:59:59").toISOString()
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
          <div className="space-y-4">
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={preset === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset("all")}
              >
                All Time
              </Button>
              <Button
                variant={preset === "this-year" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset("this-year")}
              >
                This Year
              </Button>
              <Button
                variant={preset === "last-year" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset("last-year")}
              >
                Last Year
              </Button>
              <Button
                variant={preset === "this-month" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset("this-month")}
              >
                This Month
              </Button>
              <Button
                variant={preset === "last-month" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset("last-month")}
              >
                Last Month
              </Button>
              <Button
                variant={preset === "last-14-days" ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset("last-14-days")}
              >
                Last 14 Days
              </Button>
              <Button
                variant={preset === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreset("custom")}
              >
                Custom
              </Button>
            </div>
            
            {/* Date inputs */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setPreset("custom")
                  }}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setPreset("custom")
                  }}
                />
              </div>
            </div>
          </div>
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
