'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { CategoryAnalytics } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f97316',
  Shopping: '#8b5cf6',
  Travel: '#06b6d4',
  Medical: '#ef4444',
  Utilities: '#eab308',
  Entertainment: '#ec4899',
  Office: '#6366f1',
  Education: '#14b8a6',
  Subscription: '#a855f7',
  Other: '#6b7280',
  Rent: '#0ea5e9',
  Insurance: '#f43f5e',
  Transport: '#22c55e',
  Groceries: '#84cc16',
  Dining: '#fb923c',
}

const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  color: 'var(--popover-foreground)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
}

export function CategoryBreakdown() {
  const invoices = useAppStore((s) => s.invoices)
  const storeCategories = useAppStore((s) => s.categoryAnalytics)

  const data: (CategoryAnalytics & { color: string })[] = useMemo(() => {
    if (storeCategories.length > 0) {
      return storeCategories.map((c) => ({
        ...c,
        color: CATEGORY_COLORS[c.category] || '#6b7280',
      }))
    }

    const catMap: Record<string, { amount: number; count: number }> = {}
    const total = invoices.reduce((s, inv) => s + inv.amount, 0)

    invoices.forEach((inv) => {
      if (!catMap[inv.category]) {
        catMap[inv.category] = { amount: 0, count: 0 }
      }
      catMap[inv.category].amount += inv.amount
      catMap[inv.category].count += 1
    })

    return Object.entries(catMap)
      .map(([category, { amount, count }]) => ({
        category,
        amount: parseFloat(amount.toFixed(2)),
        count,
        percentage: total > 0 ? parseFloat(((amount / total) * 100).toFixed(1)) : 0,
        trend: 'stable' as const,
        color: CATEGORY_COLORS[category] || '#6b7280',
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [invoices, storeCategories])

  const totalAmount = data.reduce((s, d) => s + d.amount, 0)

  return (
    <Card className="glass-card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ec4899]" />
          Category Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="amount"
                nameKey="category"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cat-cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [
                  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                  'Amount',
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-2 mt-2 max-h-40 overflow-y-auto pr-1">
          {data.map((item) => (
            <div
              key={item.category}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground truncate">
                  {item.category}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-muted-foreground text-xs">
                  {totalAmount > 0
                    ? ((item.amount / totalAmount) * 100).toFixed(1)
                    : 0}
                  %
                </span>
                <span className="font-medium">
                  ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
