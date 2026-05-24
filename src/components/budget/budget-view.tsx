'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import type { Budget } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Plus,
  IndianRupee,
  AlertTriangle,
  Target,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Trash2,
  Wallet,
  Percent,
  BarChart3,
  Lightbulb,
  WalletIcon,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const CATEGORIES = [
  'Food',
  'Shopping',
  'Travel',
  'Medical',
  'Utilities',
  'Entertainment',
  'Office',
  'Education',
  'Subscription',
  'Other',
  'Groceries',
  'Dining',
  'Rent',
  'Insurance',
  'Transport',
]

const budgetChartConfig: ChartConfig = {
  allocated: { label: 'Budget', color: '#14b8a6' },
  spent: { label: 'Spent', color: '#8b5cf6' },
}

function getProgressColor(percentage: number): string {
  if (percentage > 95) return 'bg-red-500'
  if (percentage > 80) return 'bg-orange-500'
  if (percentage > 60) return 'bg-yellow-500'
  return 'bg-emerald-500'
}

function getProgressTextColor(percentage: number): string {
  if (percentage > 95) return 'text-red-500'
  if (percentage > 80) return 'text-orange-500'
  if (percentage > 60) return 'text-yellow-500'
  return 'text-emerald-500'
}

function BudgetCard({
  budget,
  onDelete,
}: {
  budget: Budget
  onDelete: (id: string) => void
}) {
  const percentage = budget.allocated > 0 ? (budget.spent / budget.allocated) * 100 : 0
  const remaining = budget.allocated - budget.spent
  const isOverBudget = remaining < 0
  const showAlert = percentage > budget.alertThreshold

  return (
    <Card
      className={`glass-card-hover overflow-hidden ${
        showAlert ? 'border-red-500/30' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm">{budget.category}</h3>
            <p className="text-xs text-muted-foreground capitalize">
              {budget.period}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {showAlert && (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDelete(budget.id)}
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              ₹{budget.spent.toFixed(2)}
            </span>
            <span className={getProgressTextColor(percentage)}>
              {percentage.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(percentage, 100)}%`,
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${getProgressColor(percentage)}`}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">
              Allocated
            </p>
            <p className="text-xs font-medium">
              ₹{budget.allocated.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">
              Spent
            </p>
            <p className="text-xs font-medium">
              ₹{budget.spent.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">
              Remaining
            </p>
            <p
              className={`text-xs font-medium ${
                isOverBudget ? 'text-red-500' : 'text-emerald-500'
              }`}
            >
              {isOverBudget ? '-' : ''}₹{Math.abs(remaining).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Alert Threshold */}
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground">
            Alert at {budget.alertThreshold.toFixed(0)}% usage
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function BudgetView() {
  const { budgets, setBudgets, invoices } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'monthly' as 'monthly' | 'quarterly',
    alertThreshold: 80,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch budgets on mount
  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/budget')
        if (res.ok) {
          const data = await res.json()
          setBudgets(data.budgets || [])
        }
      } catch (err) {
        console.error('Failed to fetch budgets:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchBudgets()
  }, [setBudgets])

  // Compute spent amounts for each budget from invoices
  const budgetsWithSpent = useMemo(() => {
    const now = new Date()
    return budgets.map((budget) => {
      const periodStart = new Date()
      if (budget.period === 'monthly') {
        periodStart.setMonth(now.getMonth(), 1)
      } else {
        // Quarterly
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3
        periodStart.setMonth(quarterMonth, 1)
      }
      periodStart.setHours(0, 0, 0, 0)

      const spent = invoices
        .filter(
          (inv) =>
            inv.category === budget.category &&
            new Date(inv.uploadedAt || inv.date || now) >= periodStart
        )
        .reduce((sum, inv) => sum + inv.amount, 0)

      return { ...budget, spent: Math.round(spent * 100) / 100 }
    })
  }, [budgets, invoices])

  // Total summary
  const totalAllocated = useMemo(
    () => budgetsWithSpent.reduce((s, b) => s + b.allocated, 0),
    [budgetsWithSpent]
  )
  const totalSpent = useMemo(
    () => budgetsWithSpent.reduce((s, b) => s + b.spent, 0),
    [budgetsWithSpent]
  )
  const totalRemaining = totalAllocated - totalSpent
  const avgUtilization =
    totalAllocated > 0
      ? Math.round((totalSpent / totalAllocated) * 1000) / 10
      : 0

  // Budget vs Actual chart data
  const chartData = useMemo(
    () =>
      budgetsWithSpent.map((b) => ({
        category: b.category,
        allocated: Math.round(b.allocated * 100) / 100,
        spent: Math.round(b.spent * 100) / 100,
      })),
    [budgetsWithSpent]
  )

  // Recommendations
  const recommendations = useMemo(() => {
    const recs: string[] = []
    budgetsWithSpent.forEach((b) => {
      const pct = b.allocated > 0 ? (b.spent / b.allocated) * 100 : 0
      if (pct > 95) {
        recs.push(
          `🔴 ${b.category} is at ${pct.toFixed(0)}% of budget. Consider reducing spending immediately.`
        )
      } else if (pct > 80) {
        recs.push(
          `🟠 ${b.category} has reached ${pct.toFixed(0)}%. Be cautious with further spending.`
        )
      } else if (pct > 60) {
        recs.push(
          `🟡 ${b.category} is at ${pct.toFixed(0)}%. You have ₹${(b.allocated - b.spent).toFixed(2)} remaining.`
        )
      }
    })
    if (recs.length === 0 && budgetsWithSpent.length > 0) {
      recs.push('✅ All budgets are within healthy limits. Keep it up!')
    }
    return recs
  }, [budgetsWithSpent])

  const handleSave = useCallback(async () => {
    if (!formData.category || !formData.amount) return
    setError(null)
    setSaving(true)

    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formData.category,
          allocated: parseFloat(formData.amount),
          period: formData.period,
          alertThreshold: formData.alertThreshold,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setBudgets(data.budgets || [])
        setDialogOpen(false)
        setFormData({
          category: '',
          amount: '',
          period: 'monthly',
          alertThreshold: 80,
        })
      } else {
        const errData = await res.json().catch(() => ({}))
        setError(errData.error || 'Failed to save budget')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [formData, setBudgets])

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/budget?id=${id}`, { method: 'DELETE' })
        if (res.ok) {
          const data = await res.json()
          setBudgets(data.budgets || [])
        }
      } catch (err) {
        console.error('Failed to delete budget:', err)
      }
    },
    [setBudgets]
  )

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4 space-y-3">
              <div className="h-4 w-24 bg-secondary rounded animate-pulse" />
              <div className="h-2 bg-secondary rounded animate-pulse" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-3 w-12 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-12 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-12 bg-secondary rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Set Budget Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Budget Management</h2>
            <p className="text-sm text-muted-foreground">
              {budgetsWithSpent.length} budget{budgetsWithSpent.length !== 1 ? 's' : ''}{' '}
              set
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Set Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Create New Budget
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Category Select */}
              <div className="space-y-2">
                <Label className="text-sm">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData((f) => ({ ...f, category: v }))
                  }
                >
                  <SelectTrigger className="glass-card">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label className="text-sm">Budget Amount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 500.00"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, amount: e.target.value }))
                  }
                  className="glass-card"
                />
              </div>

              {/* Period Select */}
              <div className="space-y-2">
                <Label className="text-sm">Period</Label>
                <Select
                  value={formData.period}
                  onValueChange={(v) =>
                    setFormData((f) => ({
                      ...f,
                      period: v as 'monthly' | 'quarterly',
                    }))
                  }
                >
                  <SelectTrigger className="glass-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Alert Threshold */}
              <div className="space-y-2">
                <Label className="text-sm">
                  Alert Threshold:{' '}
                  <span className="font-semibold text-primary">
                    {formData.alertThreshold}%
                  </span>
                </Label>
                <Slider
                  value={[formData.alertThreshold]}
                  onValueChange={(v) =>
                    setFormData((f) => ({ ...f, alertThreshold: v[0] }))
                  }
                  min={50}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Get notified when spending reaches this percentage
                </p>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={
                  !formData.category ||
                  !formData.amount ||
                  parseFloat(formData.amount) <= 0 ||
                  saving
                }
                className="w-full gap-2"
              >
                {saving ? 'Saving...' : 'Save Budget'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty State */}
      {budgetsWithSpent.length === 0 ? (
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
            <PiggyBank className="h-10 w-10 text-primary" />
          </motion.div>
          <h3 className="text-lg font-semibold mb-2">No budgets set</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Create budgets to track your spending against targets and get alerts
            when you&apos;re close to the limit.
          </p>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Budget
          </Button>
        </motion.div>
      ) : (
        <>
          {/* Total Budget Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="stat-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <IndianRupee className="h-4 w-4 text-teal-500" />
                <span className="text-xs text-muted-foreground">
                  Total Allocated
                </span>
              </div>
              <p className="text-xl font-bold">
                ₹{totalAllocated.toFixed(2)}
              </p>
            </Card>
            <Card className="stat-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <WalletIcon className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Total Spent
                </span>
              </div>
              <p className="text-xl font-bold">₹{totalSpent.toFixed(2)}</p>
            </Card>
            <Card className="stat-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank
                  className={`h-4 w-4 ${
                    totalRemaining >= 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}
                />
                <span className="text-xs text-muted-foreground">
                  Remaining
                </span>
              </div>
              <p
                className={`text-xl font-bold ${
                  totalRemaining >= 0 ? '' : 'text-red-500'
                }`}
              >
                {totalRemaining < 0 ? '-' : ''}₹
                {Math.abs(totalRemaining).toFixed(2)}
              </p>
            </Card>
            <Card className="stat-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">
                  Utilization
                </span>
              </div>
              <p className="text-xl font-bold">{avgUtilization}%</p>
            </Card>
          </div>

          {/* Budget Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetsWithSpent.map((budget, index) => (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.3) }}
              >
                <BudgetCard budget={budget} onDelete={handleDelete} />
              </motion.div>
            ))}
          </div>

          {/* Budget vs Actual Chart */}
          {chartData.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Budget vs Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={budgetChartConfig}
                  className="h-[300px] w-full"
                >
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="category"
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
                          formatter={(value) => [
                            `₹${Number(value).toFixed(2)}`,
                          ]}
                        />
                      }
                    />
                    <Bar
                      dataKey="allocated"
                      fill="#14b8a6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="spent"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
                <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-teal-500" />
                    Budget
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary" />
                    Spent
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Budget Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="text-sm text-muted-foreground py-2 px-3 rounded-lg bg-secondary/30"
                    >
                      {rec}
                    </motion.p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
