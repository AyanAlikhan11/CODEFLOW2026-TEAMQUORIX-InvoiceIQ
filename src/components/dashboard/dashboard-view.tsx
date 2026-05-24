'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  IndianRupee,
  Receipt,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { SpendingChart } from './spending-chart'
import { CategoryBreakdown } from './category-breakdown'
import { MerchantLeaderboard } from './merchant-leaderboard'
import { HealthScore } from './health-score'
import { AIInsightsPanel } from './ai-insights-panel'
import { FraudAlertsPanel } from './fraud-alerts'
import { GSTAnalytics } from './gst-analytics'
import { PredictionGraph } from './prediction-graph'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export function DashboardView() {
  const invoices = useAppStore((s) => s.invoices)
  const fraudAlerts = useAppStore((s) => s.fraudAlerts)

  const stats = useMemo(() => {
    const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const totalTax = invoices.reduce((sum, inv) => sum + inv.tax, 0)
    const totalGST = invoices.reduce((sum, inv) => sum + inv.gstAmount, 0)
    const alertCount = fraudAlerts.filter((a) => !a.resolved).length
    return { totalSpent, totalTax, totalGST, alertCount }
  }, [invoices, fraudAlerts])

  // Empty state
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
          Upload your first invoice to unlock powerful AI-driven financial insights,
          expense tracking, and smart categorization.
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

  const statCards = [
    {
      title: 'Total Spent',
      value: `₹${stats.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      change: '+12.5%',
      up: true,
      icon: <IndianRupee className="h-5 w-5" />,
      gradient: 'from-violet-500/20 to-purple-500/20',
      iconColor: 'text-violet-400',
    },
    {
      title: 'Invoices Processed',
      value: invoices.length.toString(),
      change: `+${Math.min(invoices.length, 3)}`,
      up: true,
      icon: <Receipt className="h-5 w-5" />,
      gradient: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      title: 'Tax Paid',
      value: `₹${stats.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      change: `${invoices.length > 0 ? ((stats.totalTax / stats.totalSpent) * 100).toFixed(1) : 0}%`,
      up: false,
      icon: <IndianRupee className="h-5 w-5" />,
      gradient: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-400',
    },
    {
      title: 'Fraud Alerts',
      value: stats.alertCount.toString(),
      change: stats.alertCount > 0 ? 'Action needed' : 'All clear',
      up: stats.alertCount === 0,
      icon: <ShieldAlert className="h-5 w-5" />,
      gradient: 'from-rose-500/20 to-pink-500/20',
      iconColor: stats.alertCount > 0 ? 'text-red-400' : 'text-emerald-400',
    },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ─── Top Row: 4 Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="stat-card overflow-hidden hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.up ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          stat.up ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {stat.change}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        vs last month
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}
                  >
                    <span className={stat.iconColor}>{stat.icon}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ─── Second Row: Spending Trend + Category Breakdown ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-2">
          <SpendingChart />
        </motion.div>
        <motion.div variants={item} className="lg:col-span-1">
          <CategoryBreakdown />
        </motion.div>
      </div>

      {/* ─── Third Row: Merchant Leaderboard + AI Insights + Health Score ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-1">
          <MerchantLeaderboard />
        </motion.div>
        <motion.div variants={item} className="lg:col-span-1">
          <AIInsightsPanel />
        </motion.div>
        <motion.div variants={item} className="lg:col-span-1">
          <HealthScore />
        </motion.div>
      </div>

      {/* ─── Bottom Row: GST Analytics + Fraud Alerts + Prediction Graph ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item} className="lg:col-span-1">
          <GSTAnalytics />
        </motion.div>
        <motion.div variants={item} className="lg:col-span-1">
          <FraudAlertsPanel />
        </motion.div>
        <motion.div variants={item} className="lg:col-span-1">
          <PredictionGraph />
        </motion.div>
      </div>
    </motion.div>
  )
}
