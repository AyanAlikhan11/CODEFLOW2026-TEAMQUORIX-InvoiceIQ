'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type AIInsight } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Lightbulb,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Target,
  ArrowUpRight,
  PiggyBank,
  Shield,
  Zap,
  Receipt,
  CheckCircle2,
} from 'lucide-react'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function InsightsView() {
  const { invoices, setInsights } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [insights, setLocalInsights] = useState<AIInsight[]>([])
  const [aiRecommendations, setAIRecommendations] = useState<string[]>([])
  const [generated, setGenerated] = useState(false)

  const generateInsights = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/insights', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        const normalizedInsights: AIInsight[] = (data.insights || []).map((insight: Record<string, string>, i: number) => ({
          id: `insight-${Date.now()}-${i}`,
          type: (insight.type as 'observation' | 'recommendation' | 'warning') || 'observation',
          title: insight.title || 'Insight',
          description: insight.description || '',
          createdAt: new Date().toISOString(),
        }))
        setLocalInsights(normalizedInsights)
        setInsights(normalizedInsights)
        setAIRecommendations(data.recommendations || [])
        setGenerated(true)
      }
    } catch (err) {
      console.error('Failed to generate insights:', err)
    } finally {
      setLoading(false)
    }
  }

  // Stats
  const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const totalTax = invoices.reduce((sum, inv) => sum + inv.tax, 0)
  const categoryBreakdown: Record<string, number> = {}
  invoices.forEach(inv => {
    categoryBreakdown[inv.category] = (categoryBreakdown[inv.category] || 0) + inv.amount
  })
  const topCategory = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]
  const merchantCount = new Set(invoices.map(inv => inv.merchant)).size

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
          className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6"
        >
          <Lightbulb className="h-10 w-10 text-amber-500" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">No Data for Insights</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Upload and analyze at least one invoice to unlock AI-powered financial insights, spending patterns, and smart recommendations.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => useAppStore.getState().setCurrentView('upload')}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
        >
          Upload an Invoice
        </motion.button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Analyzed', value: invoices.length, icon: <Receipt className="h-5 w-5" />, color: 'text-primary' },
          { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}`, icon: <TrendingUp className="h-5 w-5" />, color: 'text-emerald-500' },
          { label: 'Top Category', value: topCategory?.[0] || 'N/A', icon: <Target className="h-5 w-5" />, color: 'text-amber-500' },
          { label: 'Unique Merchants', value: merchantCount, icon: <Shield className="h-5 w-5" />, color: 'text-violet-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="card-hover">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`${stat.color}`}>{stat.icon}</div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Generate Button */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex justify-center">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generateInsights}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {loading ? 'Analyzing your data...' : generated ? 'Regenerate AI Insights' : 'Generate AI Insights'}
        </motion.button>
      </motion.div>

      {/* AI Financial Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              AI Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-background/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">Savings Opportunity</span>
                </div>
                <p className="text-2xl font-bold text-emerald-500">${(totalSpent * 0.12).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Estimated potential savings</p>
              </div>
              <div className="p-4 rounded-xl bg-background/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Tax Summary</span>
                </div>
                <p className="text-2xl font-bold">${totalTax.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{totalSpent > 0 ? ((totalTax / totalSpent) * 100).toFixed(1) : 0}% effective tax rate</p>
              </div>
              <div className="p-4 rounded-xl bg-background/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Avg. per Invoice</span>
                </div>
                <p className="text-2xl font-bold">${invoices.length > 0 ? (totalSpent / invoices.length).toFixed(2) : '0.00'}</p>
                <p className="text-xs text-muted-foreground mt-1">Average spending per invoice</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Insights Results */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center py-12"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="h-10 w-10 text-primary mb-4" />
            </motion.div>
            <p className="font-medium text-lg">AI is analyzing your finances...</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a few seconds</p>
          </motion.div>
        )}

        {!loading && generated && insights.length > 0 && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Success Banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                Analysis complete! Found {insights.length} insights across {insights.filter(i => i.type === 'observation').length} observations, {insights.filter(i => i.type === 'recommendation').length} recommendations, and {insights.filter(i => i.type === 'warning').length} warnings.
              </p>
            </motion.div>

            {/* Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <InsightCard insight={insight} />
                </motion.div>
              ))}
            </div>

            {/* AI Recommendations Section */}
            {aiRecommendations.length > 0 && (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    AI Recommendations Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aiRecommendations.map((rec, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: insights.length * 0.1 + i * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
                      >
                        <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground leading-relaxed">{rec}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {!loading && !generated && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Sparkles className="h-14 w-14 text-muted-foreground/20 mx-auto mb-4" />
            </motion.div>
            <p className="text-muted-foreground font-medium">Ready to analyze your finances</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Click &quot;Generate AI Insights&quot; to get personalized financial analysis</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function InsightCard({ insight }: { insight: AIInsight }) {
  const config = {
    observation: { icon: <TrendingUp className="h-5 w-5" />, color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    recommendation: { icon: <Lightbulb className="h-5 w-5" />, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    warning: { icon: <AlertTriangle className="h-5 w-5" />, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  }
  const c = config[insight.type] || config.observation

  return (
    <Card className={`card-hover ${c.border}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.color} flex items-center justify-center shrink-0`}>
            {c.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{insight.title}</h3>
              <Badge variant="secondary" className="text-[10px] capitalize">{insight.type}</Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
