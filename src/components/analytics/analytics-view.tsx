'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import type { Invoice } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Store,
  Receipt,
  Percent,
  Hash,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'

type DateRange = '7d' | '30d' | '3m' | 'all'

const CHART_COLORS = [
  '#8b5cf6',
  '#14b8a6',
  '#f59e0b',
  '#ec4899',
  '#3b82f6',
  '#10b981',
  '#f97316',
  '#06b6d4',
  '#a855f7',
  '#ef4444',
  '#84cc16',
  '#e11d48',
  '#6366f1',
  '#d946ef',
  '#0ea5e9',
]

const categoryChartConfig: ChartConfig = {
  amount: { label: 'Amount', color: '#8b5cf6' },
}

const spendingChartConfig: ChartConfig = {
  amount: { label: 'Spending', color: '#8b5cf6' },
}

const gstChartConfig: ChartConfig = {
  gst: { label: 'GST Amount', color: '#14b8a6' },
  cgst: { label: 'CGST', color: '#8b5cf6' },
  sgst: { label: 'SGST', color: '#f59e0b' },
  igst: { label: 'IGST', color: '#ec4899' },
}

const dayChartConfig: ChartConfig = {
  amount: { label: 'Spending', color: '#8b5cf6' },
}

const budgetChartConfig: ChartConfig = {
  budget: { label: 'Budget', color: '#14b8a6' },
  spent: { label: 'Spent', color: '#8b5cf6' },
}

export function AnalyticsView() {
  const { invoices } = useAppStore()
  const [dateRange, setDateRange] = useState<DateRange>('all')

  const filteredInvoices = useMemo(() => {
    if (dateRange === 'all') return invoices
    const now = new Date()
    const ranges: Record<DateRange, number> = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '3m': 90 * 24 * 60 * 60 * 1000,
      all: Infinity,
    }
    const cutoff = new Date(now.getTime() - ranges[dateRange])
    return invoices.filter((inv) => {
      const d = new Date(inv.uploadedAt || inv.date || now)
      return d >= cutoff
    })
  }, [invoices, dateRange])

  // Metric Cards
  const totalSpent = useMemo(
    () => filteredInvoices.reduce((s, i) => s + i.amount, 0),
    [filteredInvoices]
  )
  const avgInvoice = useMemo(
    () => (filteredInvoices.length > 0 ? totalSpent / filteredInvoices.length : 0),
    [filteredInvoices, totalSpent]
  )
  const totalTax = useMemo(
    () => filteredInvoices.reduce((s, i) => s + i.tax, 0),
    [filteredInvoices]
  )
  const taxRate = useMemo(
    () => (totalSpent > 0 ? (totalTax / totalSpent) * 100 : 0),
    [totalSpent, totalTax]
  )
  const categoriesUsed = useMemo(
    () => new Set(filteredInvoices.map((i) => i.category)).size,
    [filteredInvoices]
  )

  // Monthly Spending Trend
  const monthlySpending = useMemo(() => {
    const monthMap: Record<string, number> = {}
    filteredInvoices.forEach((inv) => {
      const d = new Date(inv.uploadedAt || inv.date || new Date())
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap[key] = (monthMap[key] || 0) + inv.amount
    })
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
        }),
        amount: Math.round(amount * 100) / 100,
      }))
  }, [filteredInvoices])

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    const countMap: Record<string, number> = {}
    filteredInvoices.forEach((inv) => {
      map[inv.category] = (map[inv.category] || 0) + inv.amount
      countMap[inv.category] = (countMap[inv.category] || 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount], index) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        count: countMap[category],
        percentage:
          totalSpent > 0
            ? Math.round((amount / totalSpent) * 1000) / 10
            : 0,
        trend:
          index < 3
            ? 'up'
            : index < 6
            ? 'stable'
            : ('down' as 'up' | 'down' | 'stable'),
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
  }, [filteredInvoices, totalSpent])

  // Top Merchants
  const topMerchants = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {}
    filteredInvoices.forEach((inv) => {
      if (!map[inv.merchant]) map[inv.merchant] = { total: 0, count: 0 }
      map[inv.merchant].total += inv.amount
      map[inv.merchant].count++
    })
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([merchant, data]) => ({
        merchant,
        count: data.count,
        total: Math.round(data.total * 100) / 100,
        avg: Math.round((data.total / data.count) * 100) / 100,
      }))
  }, [filteredInvoices])

  // GST Analytics
  const gstAnalytics = useMemo(() => {
    const totalGST = filteredInvoices.reduce((s, i) => s + i.gstAmount, 0)
    const gstByCategory: Record<string, number> = {}
    const monthlyGST: Record<string, number> = {}
    filteredInvoices.forEach((inv) => {
      if (inv.gstAmount > 0) {
        gstByCategory[inv.category] =
          (gstByCategory[inv.category] || 0) + inv.gstAmount
        const d = new Date(inv.uploadedAt || inv.date || new Date())
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthlyGST[key] = (monthlyGST[key] || 0) + inv.gstAmount
      }
    })
    const gstMonthlyData = Object.entries(monthlyGST)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, gst]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
        }),
        gst: Math.round(gst * 100) / 100,
        cgst: Math.round((gst * 0.5) * 100) / 100,
        sgst: Math.round((gst * 0.5) * 100) / 100,
        igst: 0,
      }))

    const gstCategoryData = Object.entries(gstByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        fill:
          CHART_COLORS[
            categoryBreakdown.findIndex((c) => c.category === category) %
              CHART_COLORS.length
          ],
      }))

    return {
      totalGST: Math.round(totalGST * 100) / 100,
      cgst: Math.round(totalGST * 0.5 * 100) / 100,
      sgst: Math.round(totalGST * 0.5 * 100) / 100,
      igst: 0,
      monthlyGST: gstMonthlyData,
      gstByCategory: gstCategoryData,
    }
  }, [filteredInvoices, categoryBreakdown])

  // Day of Week Spending
  const dayOfWeekSpending = useMemo(() => {
    const days = [
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ]
    const map: Record<string, number> = {}
    days.forEach((d) => (map[d] = 0))
    filteredInvoices.forEach((inv) => {
      const d = new Date(inv.uploadedAt || inv.date || new Date())
      const day = days[d.getDay()]
      map[day] = (map[day] || 0) + inv.amount
    })
    return days.map((day) => ({
      day,
      amount: Math.round(map[day] * 100) / 100,
    }))
  }, [filteredInvoices])

  if (invoices.length === 0) {
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
          <BarChart3 className="h-10 w-10 text-primary" />
        </motion.div>
        <h3 className="text-lg font-semibold mb-2">No analytics data yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload some invoices to see your spending analytics.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { key: '7d', label: 'Last 7 days' },
          { key: '30d', label: 'Last 30 days' },
          { key: '3m', label: 'Last 3 months' },
          { key: 'all', label: 'All time' },
        ] as const).map(({ key, label }) => (
          <Button
            key={key}
            variant={dateRange === key ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setDateRange(key)}
            className="h-8 text-xs"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Spent"
          value={`₹${totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<IndianRupee className="h-4 w-4" />}
          color="text-emerald-500"
        />
        <MetricCard
          title="Avg Invoice"
          value={`₹${avgInvoice.toFixed(2)}`}
          icon={<Receipt className="h-4 w-4" />}
          color="text-primary"
        />
        <MetricCard
          title="Tax Rate"
          value={`${taxRate.toFixed(1)}%`}
          icon={<Percent className="h-4 w-4" />}
          color="text-amber-500"
        />
        <MetricCard
          title="Categories"
          value={String(categoriesUsed)}
          icon={<Hash className="h-4 w-4" />}
          color="text-cyan-500"
        />
      </div>

      {/* Monthly Spending Trend */}
      {monthlySpending.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              Monthly Spending Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={spendingChartConfig} className="h-[300px] w-full">
              <AreaChart data={monthlySpending}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
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
                      formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Spending']}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#spendGrad)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown + Top Merchants */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Category Breakdown (3/5) */}
        <Card className="glass-card lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Pie Chart */}
              <div className="w-full md:w-[200px] shrink-0">
                <ChartContainer config={categoryChartConfig} className="h-[200px]">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Amount']}
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
              </div>

              {/* Table */}
              <div className="flex-1 w-full space-y-2 max-h-64 overflow-y-auto">
                {categoryBreakdown.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.fill }}
                      />
                      <span className="text-sm font-medium">
                        {cat.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({cat.count})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {cat.percentage}%
                      </span>
                      {cat.trend === 'up' ? (
                        <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                      ) : cat.trend === 'down' ? (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      ) : (
                        <Minus className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium w-20 text-right">
                        ₹{cat.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Merchants (2/5) */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-5 w-5 text-primary" />
              Top 10 Merchants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
              {topMerchants.map((m, i) => (
                <div
                  key={m.merchant}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.merchant}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.count} invoice{m.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">
                      ₹{m.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      avg ₹{m.avg.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GST Analysis */}
      {gstAnalytics.totalGST > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            GST Analysis
          </h3>

          {/* GST Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Total GST</p>
                <p className="text-lg font-bold text-teal-500">
                  ₹{gstAnalytics.totalGST.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">CGST</p>
                <p className="text-lg font-bold text-primary">
                  ₹{gstAnalytics.cgst.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">SGST</p>
                <p className="text-lg font-bold text-amber-500">
                  ₹{gstAnalytics.sgst.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">IGST</p>
                <p className="text-lg font-bold text-pink-500">
                  ₹{gstAnalytics.igst.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly GST Chart */}
          {gstAnalytics.monthlyGST.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Monthly GST</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={gstChartConfig} className="h-[250px] w-full">
                  <BarChart data={gstAnalytics.monthlyGST}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="month"
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
                          formatter={(value) => [`₹${Number(value).toFixed(2)}`]}
                        />
                      }
                    />
                    <Bar dataKey="cgst" stackId="gst" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="sgst" stackId="gst" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* GST by Category */}
          {gstAnalytics.gstByCategory.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">GST by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={gstChartConfig} className="h-[250px] w-full">
                  <BarChart
                    data={gstAnalytics.gstByCategory}
                    layout="vertical"
                    margin={{ left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      type="number"
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border)' }}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border)' }}
                      width={75}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'GST']}
                        />
                      }
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {gstAnalytics.gstByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Day of Week Spending */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-primary" />
            Spending by Day of Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={dayChartConfig} className="h-[200px] w-full">
            <BarChart data={dayOfWeekSpending}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="day"
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
                    formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Spending']}
                  />
                }
              />
              <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card className="stat-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`${color}`}>{icon}</div>
        <span className="text-xs text-muted-foreground">{title}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  )
}
