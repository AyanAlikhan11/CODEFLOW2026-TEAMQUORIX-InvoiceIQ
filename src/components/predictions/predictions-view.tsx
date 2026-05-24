'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  IndianRupee,
  Calendar,
  Target,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const predictionChartConfig: ChartConfig = {
  actual: { label: 'Actual Spending', color: '#8b5cf6' },
  predicted: { label: 'Predicted', color: '#14b8a6' },
  lower: { label: 'Lower Bound', color: '#14b8a6' },
  upper: { label: 'Upper Bound', color: '#14b8a6' },
}

// Simple linear regression
function linearRegression(
  data: { x: number; y: number }[]
): { slope: number; intercept: number } {
  const n = data.length
  if (n < 2) return { slope: 0, intercept: data[0]?.y || 0 }

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0
  for (const { x, y } of data) {
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  }

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

// Standard deviation
function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

export function PredictionsView() {
  const { invoices } = useAppStore()

  // Monthly aggregated data
  const monthlyData = useMemo(() => {
    const monthMap: Record<string, number> = {}
    invoices.forEach((inv) => {
      const d = new Date(inv.uploadedAt || inv.date || new Date())
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap[key] = (monthMap[key] || 0) + inv.amount
    })
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount], index) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
        }),
        amount: Math.round(amount * 100) / 100,
        x: index,
      }))
  }, [invoices])

  // Linear regression on monthly data
  const regression = useMemo(() => {
    if (monthlyData.length < 2) return null
    return linearRegression(monthlyData.map((d) => ({ x: d.x, y: d.amount })))
  }, [monthlyData])

  // Standard deviation for confidence interval
  const residualStdDev = useMemo(() => {
    if (!regression || monthlyData.length < 3) return 0
    const residuals = monthlyData.map(
      (d) => d.amount - (regression.slope * d.x + regression.intercept)
    )
    return stdDev(residuals)
  }, [monthlyData, regression])

  // Generate prediction data (3 months forward)
  const predictionData = useMemo(() => {
    if (!regression || monthlyData.length < 2) return []

    const lastMonth = monthlyData[monthlyData.length - 1]
    const lastX = lastMonth.x
    const lastDate = new Date(lastMonth.month + '-01')

    // Build combined data: historical + predicted
    const combined = monthlyData.map((d) => ({
      label: d.label,
      actual: d.amount,
      predicted: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
    }))

    // Add 3 prediction months
    for (let i = 1; i <= 3; i++) {
      const futureX = lastX + i
      const predValue = regression.slope * futureX + regression.intercept
      const futureDate = new Date(lastDate)
      futureDate.setMonth(futureDate.getMonth() + i)
      const label = futureDate.toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit',
      })

      // Confidence interval widens with distance
      const confidenceMultiplier = 1.2 + i * 0.4
      const interval = residualStdDev * confidenceMultiplier

      combined.push({
        label,
        actual: null,
        predicted: Math.round(predValue * 100) / 100,
        lower: Math.round(Math.max(0, predValue - interval) * 100) / 100,
        upper: Math.round((predValue + interval) * 100) / 100,
      })
    }

    return combined
  }, [monthlyData, regression, residualStdDev])

  // Next month prediction
  const nextMonthPrediction = useMemo(() => {
    if (!regression || monthlyData.length < 2) return null
    const lastX = monthlyData[monthlyData.length - 1].x
    const predValue = regression.slope * (lastX + 1) + regression.intercept
    const lastDate = new Date(
      monthlyData[monthlyData.length - 1].month + '-01'
    )
    lastDate.setMonth(lastDate.getMonth() + 1)
    const confidence = Math.max(40, Math.min(95, 95 - (residualStdDev / (monthlyData.reduce((s, d) => s + d.amount, 0) / monthlyData.length)) * 50))
    return {
      month: lastDate.toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      }),
      amount: Math.round(predValue * 100) / 100,
      confidence: Math.round(confidence),
    }
  }, [monthlyData, regression, residualStdDev])

  // 3-month forecast total
  const threeMonthForecast = useMemo(() => {
    if (!regression || monthlyData.length < 2) return null
    let total = 0
    const lastX = monthlyData[monthlyData.length - 1].x
    for (let i = 1; i <= 3; i++) {
      total += regression.slope * (lastX + i) + regression.intercept
    }
    return Math.round(total * 100) / 100
  }, [monthlyData, regression])

  // Trend direction
  const trendDirection = useMemo((): 'up' | 'down' | 'stable' => {
    if (!regression || monthlyData.length < 2) return 'stable'
    const avgSpend = monthlyData.reduce((s, d) => s + d.amount, 0) / monthlyData.length
    const monthlyChange = (regression.slope / avgSpend) * 100
    if (monthlyChange > 2) return 'up'
    if (monthlyChange < -2) return 'down'
    return 'stable'
  }, [monthlyData, regression])

  const trendPercentage = useMemo(() => {
    if (!regression || monthlyData.length < 2) return 0
    const avgSpend = monthlyData.reduce((s, d) => s + d.amount, 0) / monthlyData.length
    return Math.round(Math.abs((regression.slope / avgSpend) * 100) * 10) / 10
  }, [monthlyData, regression])

  // Seasonal pattern detection
  const seasonalPattern = useMemo((): string => {
    if (monthlyData.length < 3) return 'Insufficient data for seasonal analysis'
    const amounts = monthlyData.map((d) => d.amount)
    const maxIdx = amounts.indexOf(Math.max(...amounts))
    const minIdx = amounts.indexOf(Math.min(...amounts))
    const maxMonth = new Date(monthlyData[maxIdx].month + '-01').toLocaleDateString('en-IN', { month: 'long' })
    const minMonth = new Date(monthlyData[minIdx].month + '-01').toLocaleDateString('en-IN', { month: 'long' })
    return `Highest spending in ${maxMonth}, lowest in ${minMonth}`
  }, [monthlyData])

  // Category-level predictions
  const categoryPredictions = useMemo(() => {
    const catMonthMap: Record<string, Record<string, number>> = {}
    invoices.forEach((inv) => {
      const d = new Date(inv.uploadedAt || inv.date || new Date())
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!catMonthMap[inv.category]) catMonthMap[inv.category] = {}
      catMonthMap[inv.category][monthKey] =
        (catMonthMap[inv.category][monthKey] || 0) + inv.amount
    })

    const results: {
      category: string
      currentMonthly: number
      predicted: number
      changePercent: number
    }[] = []

    for (const [category, monthData] of Object.entries(catMonthMap)) {
      const amounts = Object.values(monthData).sort((a, b) => a - b)
      if (amounts.length < 2) continue

      const xData = amounts.map((_, i) => ({ x: i, y: amounts[i] }))
      const reg = linearRegression(xData)
      const currentMonthly = amounts[amounts.length - 1]
      const predicted = Math.max(0, reg.slope + currentMonthly)
      const changePercent =
        currentMonthly > 0
          ? Math.round(((predicted - currentMonthly) / currentMonthly) * 1000) / 10
          : 0

      results.push({
        category,
        currentMonthly: Math.round(currentMonthly * 100) / 100,
        predicted: Math.round(predicted * 100) / 100,
        changePercent,
      })
    }

    return results.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
  }, [invoices])

  // Recommendations based on predictions
  const recommendations = useMemo(() => {
    const recs: { icon: React.ElementType; text: string; type: 'warning' | 'info' | 'success' }[] = []

    if (trendDirection === 'up') {
      recs.push({
        icon: TrendingUp,
        text: `Your spending is trending upward by ~${trendPercentage}% per month. Consider reviewing discretionary expenses.`,
        type: 'warning',
      })
    } else if (trendDirection === 'down') {
      recs.push({
        icon: TrendingDown,
        text: `Great news! Your spending is trending downward by ~${trendPercentage}% per month. Keep up the good work!`,
        type: 'success',
      })
    } else {
      recs.push({
        icon: Minus,
        text: 'Your spending is relatively stable. This indicates consistent budget management.',
        type: 'info',
      })
    }

    if (nextMonthPrediction) {
      const avgMonthly =
        monthlyData.length > 0
          ? monthlyData.reduce((s, d) => s + d.amount, 0) / monthlyData.length
          : 0
      if (nextMonthPrediction.amount > avgMonthly * 1.2) {
        recs.push({
          icon: AlertTriangle,
          text: `Next month prediction (₹${nextMonthPrediction.amount.toFixed(2)}) is ${((nextMonthPrediction.amount / avgMonthly - 1) * 100).toFixed(0)}% above your average. Consider setting a budget alert.`,
          type: 'warning',
        })
      }
    }

    const topIncreasing = categoryPredictions.filter(
      (c) => c.changePercent > 10
    )
    if (topIncreasing.length > 0) {
      recs.push({
        icon: AlertTriangle,
        text: `${topIncreasing[0].category} spending is predicted to increase by ${topIncreasing[0].changePercent}%. Review recent purchases in this category.`,
        type: 'warning',
      })
    }

    if (categoryPredictions.length === 0 && invoices.length > 0) {
      recs.push({
        icon: Brain,
        text: 'Upload more invoices over multiple months for more accurate predictions.',
        type: 'info',
      })
    }

    return recs
  }, [trendDirection, trendPercentage, nextMonthPrediction, monthlyData, categoryPredictions, invoices])

  if (invoices.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6"
        >
          <Brain className="h-10 w-10 text-primary" />
        </motion.div>
        <h3 className="text-lg font-semibold mb-2">Need more data for predictions</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Upload at least 2 invoices over different months to enable AI spending predictions.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">AI Spending Predictions</h2>
          <p className="text-sm text-muted-foreground">
            Statistical analysis based on {invoices.length} invoices
          </p>
        </div>
      </div>

      {/* Prediction Chart */}
      {predictionData.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              Spending Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={predictionChartConfig} className="h-[350px] w-full">
              <AreaChart data={predictionData}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickFormatter={(v) => `₹${v}`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [
                        `₹${Number(value).toFixed(2)}`,
                        name === 'actual' ? 'Actual' : name === 'predicted' ? 'Predicted' : name === 'lower' ? 'Lower Bound' : 'Upper Bound',
                      ]}
                    />
                  }
                />
                {/* Confidence interval area */}
                {predictionData.some((d) => d.lower !== null) && (
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="#14b8a6"
                    fillOpacity={0.08}
                    strokeDasharray=""
                    connectNulls={false}
                  />
                )}
                {/* Historical line */}
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#actualGrad)"
                  connectNulls={false}
                  dot={{ r: 3, fill: '#8b5cf6' }}
                />
                {/* Predicted line */}
                {predictionData.some((d) => d.predicted !== null) && (
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    dot={{ r: 3, fill: '#14b8a6' }}
                    connectNulls={false}
                  />
                )}
              </AreaChart>
            </ChartContainer>
            <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-primary rounded" />
                Historical
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-teal-500 rounded" style={{ borderTop: '2px dashed #14b8a6', height: 0 }} />
                Predicted
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-2 bg-teal-500/20 rounded" />
                Confidence Interval
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prediction Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {nextMonthPrediction && (
          <Card className="stat-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-teal-500" />
              <span className="text-xs text-muted-foreground">Next Month</span>
            </div>
            <p className="text-xl font-bold">
              ₹{nextMonthPrediction.amount.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {nextMonthPrediction.confidence}% confidence
            </p>
          </Card>
        )}
        {threeMonthForecast !== null && (
          <Card className="stat-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">3-Month Forecast</span>
            </div>
            <p className="text-xl font-bold">
              ₹{threeMonthForecast.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total projected
            </p>
          </Card>
        )}
        <Card className="stat-card p-4">
          <div className="flex items-center gap-2 mb-2">
            {trendDirection === 'up' ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : trendDirection === 'down' ? (
              <TrendingDown className="h-4 w-4 text-emerald-500" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">Trend</span>
          </div>
          <p className="text-xl font-bold capitalize">{trendDirection}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ~{trendPercentage}% per month
          </p>
        </Card>
        <Card className="stat-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Seasonal</span>
          </div>
          <p className="text-sm font-medium mt-1">{seasonalPattern}</p>
        </Card>
      </div>

      {/* Category Predictions Table */}
      {categoryPredictions.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              Category-Level Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">
                      Category
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-3 pr-4">
                      Current Monthly
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-3 pr-4">
                      Predicted
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-3">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categoryPredictions.map((cat, i) => (
                    <motion.tr
                      key={cat.category}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-border/30 last:border-0"
                    >
                      <td className="py-3 pr-4 text-sm font-medium">
                        {cat.category}
                      </td>
                      <td className="py-3 pr-4 text-sm text-right text-muted-foreground">
                        ₹{cat.currentMonthly.toFixed(2)}
                      </td>
                      <td className="py-3 pr-4 text-sm text-right font-medium">
                        ₹{cat.predicted.toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <Badge
                          variant="secondary"
                          className={
                            cat.changePercent > 5
                              ? 'bg-red-500/10 text-red-500'
                              : cat.changePercent < -5
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-secondary'
                          }
                        >
                          {cat.changePercent > 0 ? (
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                          ) : cat.changePercent < 0 ? (
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                          ) : null}
                          {cat.changePercent > 0 ? '+' : ''}
                          {cat.changePercent}%
                        </Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-primary" />
            Prediction-Based Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  rec.type === 'warning'
                    ? 'bg-amber-500/5 border-amber-500/10'
                    : rec.type === 'success'
                    ? 'bg-emerald-500/5 border-emerald-500/10'
                    : 'bg-primary/5 border-primary/10'
                }`}
              >
                <rec.icon
                  className={`h-4 w-4 mt-0.5 shrink-0 ${
                    rec.type === 'warning'
                      ? 'text-amber-500'
                      : rec.type === 'success'
                      ? 'text-emerald-500'
                      : 'text-primary'
                  }`}
                />
                <p className="text-sm text-muted-foreground">{rec.text}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
