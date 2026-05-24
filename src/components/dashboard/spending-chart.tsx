'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { MonthlySpending } from '@/types'

const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  color: 'var(--popover-foreground)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
}

export function SpendingChart() {
  const invoices = useAppStore((s) => s.invoices)
  const storeMonthly = useAppStore((s) => s.monthlySpending)

  const data: MonthlySpending[] = useMemo(() => {
    if (storeMonthly.length > 0) return storeMonthly

    const monthlyMap: Record<string, number> = {}
    invoices.forEach((inv) => {
      if (inv.date) {
        const month = inv.date.substring(0, 7)
        monthlyMap[month] = (monthlyMap[month] || 0) + inv.amount
      }
    })

    return Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
        amount: parseFloat(amount.toFixed(2)),
        budget: 0,
        predicted: 0,
      }))
  }, [invoices, storeMonthly])

  const avgSpend =
    data.length > 0
      ? data.reduce((s, d) => s + d.amount, 0) / data.length
      : 0

  return (
    <Card className="glass-card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
          Spending Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            {data.length > 0 ? (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [
                    `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                    'Spending',
                  ]}
                />
                {avgSpend > 0 && (
                  <ReferenceLine
                    y={avgSpend}
                    stroke="#06b6d4"
                    strokeDasharray="6 4"
                    strokeOpacity={0.6}
                    label={{
                      value: `Avg ₹${avgSpend.toFixed(0)}`,
                      position: 'right',
                      fill: '#06b6d4',
                      fontSize: 11,
                    }}
                  />
                )}
                {data.some((d) => d.budget > 0) && (
                  <ReferenceLine
                    y={data[0].budget}
                    stroke="#f97316"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fill="url(#spendGradient)"
                />
              </AreaChart>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No data yet
              </div>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
