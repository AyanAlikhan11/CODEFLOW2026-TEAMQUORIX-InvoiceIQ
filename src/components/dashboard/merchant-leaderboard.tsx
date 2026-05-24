'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { MerchantAnalytics } from '@/types'

const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  color: 'var(--popover-foreground)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
}

const BAR_COLORS = ['#8b5cf6', '#7c3aed', '#6d28d9', '#a78bfa', '#8b5cf6', '#6d28d9']

export function MerchantLeaderboard() {
  const invoices = useAppStore((s) => s.invoices)
  const storeMerchants = useAppStore((s) => s.merchantAnalytics)

  const data: MerchantAnalytics[] = useMemo(() => {
    if (storeMerchants.length > 0) return storeMerchants

    const merchantMap: Record<string, { total: number; count: number; lastDate: string }> = {}

    invoices.forEach((inv) => {
      if (!merchantMap[inv.merchant]) {
        merchantMap[inv.merchant] = { total: 0, count: 0, lastDate: '' }
      }
      merchantMap[inv.merchant].total += inv.amount
      merchantMap[inv.merchant].count += 1
      if (inv.date && inv.date > merchantMap[inv.merchant].lastDate) {
        merchantMap[inv.merchant].lastDate = inv.date
      }
    })

    return Object.entries(merchantMap)
      .map(([merchant, { total, count, lastDate }]) => ({
        merchant,
        totalSpent: parseFloat(total.toFixed(2)),
        invoiceCount: count,
        avgAmount: count > 0 ? parseFloat((total / count).toFixed(2)) : 0,
        lastTransaction: lastDate,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 6)
  }, [invoices, storeMerchants])

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name:
          d.merchant.length > 14
            ? d.merchant.substring(0, 14) + '...'
            : d.merchant,
        amount: d.totalSpent,
        fullName: d.merchant,
      })),
    [data]
  )

  return (
    <Card className="glass-card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
          Merchant Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
              <defs>
                <linearGradient id="merchantGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, _name: string, props: { payload: { fullName: string } }) => [
                  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                  props.payload.fullName,
                ]}
              />
              <Bar
                dataKey="amount"
                radius={[0, 6, 6, 0]}
                barSize={22}
              >
                {chartData.map((_entry, index) => (
                  <Cell
                    key={`merchant-cell-${index}`}
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
