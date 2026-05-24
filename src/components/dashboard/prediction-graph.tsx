'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import type { SpendingPrediction } from '@/types'

const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  color: 'var(--popover-foreground)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
}

export function PredictionGraph() {
  const invoices = useAppStore((s) => s.invoices)
  const storePredictions = useAppStore((s) => s.predictions)

  const data: SpendingPrediction[] = useMemo(() => {
    if (storePredictions.length > 0) return storePredictions

    if (invoices.length < 2) return []

    // Build monthly spending data
    const monthlyMap: Record<string, number> = {}
    invoices.forEach((inv) => {
      if (inv.date) {
        const month = inv.date.substring(0, 7)
        monthlyMap[month] = (monthlyMap[month] || 0) + inv.amount
      }
    })

    const sorted = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))

    if (sorted.length < 2) return []

    // Simple linear regression for prediction
    const n = sorted.length
    const xValues = sorted.map((_, i) => i)
    const yValues = sorted.map(([, v]) => v)
    const xMean = xValues.reduce((s, x) => s + x, 0) / n
    const yMean = yValues.reduce((s, y) => s + y, 0) / n

    let numerator = 0
    let denominator = 0
    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean)
      denominator += (xValues[i] - xMean) ** 2
    }

    const slope = denominator !== 0 ? numerator / denominator : 0
    const intercept = yMean - slope * xMean

    // Calculate standard error for confidence interval
    let ssRes = 0
    for (let i = 0; i < n; i++) {
      const predicted = slope * xValues[i] + intercept
      ssRes += (yValues[i] - predicted) ** 2
    }
    const stdError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : yMean * 0.2

    // Generate future predictions (3 months ahead)
    const lastMonth = new Date(sorted[sorted.length - 1][0] + '-01')
    const predictions: SpendingPrediction[] = []

    for (let i = 0; i < 3; i++) {
      const futureDate = new Date(lastMonth)
      futureDate.setMonth(futureDate.getMonth() + i + 1)
      const futureX = n + i
      const predicted = Math.max(0, slope * futureX + intercept)
      const margin = stdError * (1 + 0.3 * i)

      predictions.push({
        month: futureDate.toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
        predicted: parseFloat(predicted.toFixed(2)),
        lower: parseFloat(Math.max(0, predicted - margin).toFixed(2)),
        upper: parseFloat((predicted + margin).toFixed(2)),
        confidence: parseFloat(Math.max(40, 95 - i * 15).toFixed(0)),
      })
    }

    return predictions
  }, [invoices, storePredictions])

  // Build chart data combining actual and predictions
  const chartData = useMemo(() => {
    const monthlyMap: Record<string, number> = {}
    invoices.forEach((inv) => {
      if (inv.date) {
        const month = inv.date.substring(0, 7)
        monthlyMap[month] = (monthlyMap[month] || 0) + inv.amount
      }
    })

    const actual = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
        actual: parseFloat(amount.toFixed(2)),
        predicted: 0,
        upper: 0,
        lower: 0,
      }))

    const predicted = data.map((d) => ({
      month: d.month,
      actual: 0,
      predicted: d.predicted,
      upper: d.upper,
      lower: d.lower,
    }))

    return [...actual, ...predicted]
  }, [invoices, data])

  if (chartData.length < 2) {
    return (
      <Card className="glass-card-hover h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ec4899]" />
            Spending Prediction
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center h-52 text-muted-foreground text-sm">
            Need at least 2 months of data for predictions
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ec4899]" />
          Spending Prediction
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Legend */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#8b5cf6] rounded" />
            <span className="text-[10px] text-muted-foreground">Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#06b6d4] rounded border-b border-dashed border-[#06b6d4]" />
            <span className="text-[10px] text-muted-foreground">Predicted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-[#06b6d4]/20 rounded-sm" />
            <span className="text-[10px] text-muted-foreground">Confidence</span>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
              />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [
                  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                  name === 'actual' ? 'Actual Spending' : name === 'predicted' ? 'Predicted' : '',
                ]}
              />
              {/* Confidence interval area */}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="url(#confidenceGrad)"
                fillOpacity={1}
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="var(--background)"
                fillOpacity={1}
              />
              {/* Actual spending line */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#8b5cf6' }}
                connectNulls={false}
              />
              {/* Predicted line */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#06b6d4' }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
