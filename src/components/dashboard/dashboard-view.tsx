'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  Receipt,
  TrendingUp,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Utensils,
  Car,
  Heart,
  Zap,
  GraduationCap,
  MoreHorizontal,
  Sparkles
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts'

const categoryConfig: Record<string, { color: string; icon: React.ReactNode; bg: string }> = {
  Food: { color: '#f97316', icon: <Utensils className="h-4 w-4" />, bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  Shopping: { color: '#8b5cf6', icon: <ShoppingCart className="h-4 w-4" />, bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  Travel: { color: '#06b6d4', icon: <Car className="h-4 w-4" />, bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  Medical: { color: '#ef4444', icon: <Heart className="h-4 w-4" />, bg: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  Utilities: { color: '#eab308', icon: <Zap className="h-4 w-4" />, bg: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  Entertainment: { color: '#ec4899', icon: <Sparkles className="h-4 w-4" />, bg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  Office: { color: '#6366f1', icon: <Receipt className="h-4 w-4" />, bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  Education: { color: '#14b8a6', icon: <GraduationCap className="h-4 w-4" />, bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
  Subscription: { color: '#a855f7', icon: <MoreHorizontal className="h-4 w-4" />, bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  Other: { color: '#6b7280', icon: <Receipt className="h-4 w-4" />, bg: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

export function DashboardView() {
  const { invoices } = useAppStore()

  const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const totalTax = invoices.reduce((sum, inv) => sum + inv.tax, 0)
  const avgInvoice = invoices.length > 0 ? totalSpent / invoices.length : 0

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {}
  invoices.forEach(inv => {
    categoryBreakdown[inv.category] = (categoryBreakdown[inv.category] || 0) + inv.amount
  })

  const pieData = Object.entries(categoryBreakdown).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2)),
    color: categoryConfig[name]?.color || '#6b7280',
  }))

  // Merchant analysis
  const merchantBreakdown: Record<string, number> = {}
  invoices.forEach(inv => {
    merchantBreakdown[inv.merchant] = (merchantBreakdown[inv.merchant] || 0) + inv.amount
  })

  const barData = Object.entries(merchantBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, amount]) => ({
      name: name.length > 12 ? name.substring(0, 12) + '...' : name,
      amount: parseFloat(amount.toFixed(2)),
    }))

  // Monthly trend
  const monthlyData: Record<string, number> = {}
  invoices.forEach(inv => {
    if (inv.date) {
      const month = inv.date.substring(0, 7)
      monthlyData[month] = (monthlyData[month] || 0) + inv.amount
    }
  })

  const trendData = Object.entries(monthlyData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, amount]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      amount: parseFloat(amount.toFixed(2)),
    }))

  if (invoices.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
        >
          <Receipt className="h-10 w-10 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">No Invoices Yet</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Upload your first invoice to unlock powerful AI-driven financial insights, expense tracking, and smart categorization.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => useAppStore.getState().setCurrentView('upload')}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          Upload Your First Invoice
        </motion.button>
      </motion.div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Spent', value: `$${totalSpent.toFixed(2)}`, change: '+12.5%', up: true, icon: <DollarSign className="h-5 w-5" />, color: 'from-violet-500/20 to-purple-500/20' },
          { title: 'Total Invoices', value: invoices.length.toString(), change: '+3', up: true, icon: <Receipt className="h-5 w-5" />, color: 'from-emerald-500/20 to-teal-500/20' },
          { title: 'Avg. Invoice', value: `$${avgInvoice.toFixed(2)}`, change: '-2.3%', up: false, icon: <TrendingUp className="h-5 w-5" />, color: 'from-amber-500/20 to-orange-500/20' },
          { title: 'Tax Paid', value: `$${totalTax.toFixed(2)}`, change: '+5.1%', up: true, icon: <PiggyBank className="h-5 w-5" />, color: 'from-rose-500/20 to-pink-500/20' },
        ].map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="card-hover overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.up ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" /> : <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />}
                      <span className={`text-xs font-medium ${stat.up ? 'text-emerald-500' : 'text-rose-500'}`}>{stat.change}</span>
                      <span className="text-xs text-muted-foreground ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-foreground`}>
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Spending Trend */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Spending Trend</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {trendData.length > 1 ? (
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.55 0.2 280)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="oklch(0.55 0.2 280)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" tick={{ fill: 'var(--muted-foreground)' }} />
                      <YAxis className="text-xs" tick={{ fill: 'var(--muted-foreground)' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--popover)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Area type="monotone" dataKey="amount" stroke="oklch(0.55 0.2 280)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAmount)" />
                    </AreaChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Upload more invoices to see trends over time
                    </div>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Pie */}
        <motion.div variants={item}>
          <Card className="card-hover h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">By Category</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                {pieData.map((pieItem) => (
                  <div key={pieItem.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pieItem.color }} />
                      <span className="text-muted-foreground">{pieItem.name}</span>
                    </div>
                    <span className="font-medium">${pieItem.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Merchant Bar Chart */}
        <motion.div variants={item}>
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Top Merchants</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                    />
                    <Bar dataKey="amount" fill="oklch(0.55 0.2 280)" radius={[0, 6, 6, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Invoices */}
        <motion.div variants={item}>
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {invoices.slice(0, 5).map((inv, index) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${categoryConfig[inv.category]?.bg || 'bg-gray-500/10 text-gray-500'}`}>
                        {categoryConfig[inv.category]?.icon || <Receipt className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{inv.merchant}</p>
                        <p className="text-xs text-muted-foreground">{inv.date || 'No date'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${inv.amount.toFixed(2)}</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{inv.category}</Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
