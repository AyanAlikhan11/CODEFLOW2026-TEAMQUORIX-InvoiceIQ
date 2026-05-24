'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Shield,
} from 'lucide-react'
import type { AIInsight } from '@/types'

const INSIGHT_CONFIG: Record<
  AIInsight['type'],
  { icon: React.ElementType; color: string; bg: string }
> = {
  recommendation: {
    icon: Lightbulb,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  observation: {
    icon: TrendingUp,
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
  fraud_alert: {
    icon: Shield,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
}

const IMPACT_STYLES: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

export function AIInsightsPanel() {
  const invoices = useAppStore((s) => s.invoices)
  const storeInsights = useAppStore((s) => s.insights)

  const insights: AIInsight[] = useMemo(() => {
    if (storeInsights.length > 0) return storeInsights

    if (invoices.length === 0) return []

    const totalSpent = invoices.reduce((s, i) => s + i.amount, 0)
    const totalTax = invoices.reduce((s, i) => s + i.tax, 0)
    const totalGST = invoices.reduce((s, i) => s + i.gstAmount, 0)
    const avgAmount = totalSpent / invoices.length
    const flaggedCount = invoices.filter(
      (i) => i.fraudScore > 0.7 || i.isDuplicate
    ).length

    // Category analysis
    const catMap: Record<string, number> = {}
    invoices.forEach((inv) => {
      catMap[inv.category] = (catMap[inv.category] || 0) + inv.amount
    })
    const topCategory = Object.entries(catMap).sort(
      (a, b) => b[1] - a[1]
    )[0]

    const taxRatio = totalSpent > 0 ? (totalTax / totalSpent) * 100 : 0

    const generated: AIInsight[] = []

    // Total spending observation
    generated.push({
      id: 'obs-spending',
      type: 'observation',
      title: `Total spending: ₹${totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      description: `Across ${invoices.length} invoices with an average of ₹${avgAmount.toFixed(2)} per invoice.`,
      impact: totalSpent > 5000 ? 'high' : totalSpent > 1000 ? 'medium' : 'low',
      createdAt: new Date().toISOString(),
    })

    // Top category analysis
    if (topCategory) {
      generated.push({
        id: 'rec-category',
        type: 'recommendation',
        title: `Top category: ${topCategory[0]}`,
        description: `${topCategory[0]} accounts for ${((topCategory[1] / totalSpent) * 100).toFixed(1)}% of total spending (₹${topCategory[1].toFixed(2)}). Consider diversifying expenses.`,
        impact: topCategory[1] / totalSpent > 0.5 ? 'high' : 'medium',
        createdAt: new Date().toISOString(),
      })
    }

    // Tax efficiency
    generated.push({
      id: 'rec-tax',
      type: 'recommendation',
      title: 'Tax efficiency review',
      description:
        taxRatio > 18
          ? `Your tax-to-spend ratio is ${taxRatio.toFixed(1)}%. This is above average — consider consolidating purchases or using tax-exempt channels.`
          : `Your tax-to-spend ratio is ${taxRatio.toFixed(1)}%, which is within a healthy range.`,
      impact: taxRatio > 18 ? 'high' : 'low',
      createdAt: new Date().toISOString(),
    })

    // GST specific
    if (totalGST > 0) {
      generated.push({
        id: 'obs-gst',
        type: 'observation',
        title: `GST collected: ₹${totalGST.toFixed(2)}`,
        description: 'Ensure all GST-eligible invoices are filed for timely input tax credit claims.',
        impact: totalGST > 500 ? 'medium' : 'low',
        createdAt: new Date().toISOString(),
      })
    }

    // Fraud assessment
    if (flaggedCount > 0) {
      generated.push({
        id: 'warn-fraud',
        type: 'fraud_alert',
        title: `${flaggedCount} flagged invoice${flaggedCount > 1 ? 's' : ''} detected`,
        description: 'Review flagged invoices for duplicates or anomalies. Consider verifying merchant details.',
        impact: 'high',
        createdAt: new Date().toISOString(),
      })
    } else {
      generated.push({
        id: 'obs-fraud',
        type: 'observation',
        title: 'No fraud indicators detected',
        description: 'All invoices have passed basic fraud checks. Continue monitoring for anomalies.',
        impact: 'low',
        createdAt: new Date().toISOString(),
      })
    }

    // Savings opportunity
    const highValueInvoices = invoices.filter((i) => i.amount > avgAmount * 1.5)
    if (highValueInvoices.length > 0) {
      generated.push({
        id: 'rec-savings',
        type: 'recommendation',
        title: 'Potential savings opportunity',
        description: `${highValueInvoices.length} invoices exceed your average by 50%+. Review these for bulk discount or subscription alternatives.`,
        impact: 'medium',
        createdAt: new Date().toISOString(),
      })
    }

    return generated
  }, [invoices, storeInsights])

  if (insights.length === 0) {
    return (
      <Card className="glass-card-hover h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#f97316]" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Upload invoices to see AI-powered insights
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f97316]" />
          AI Insights
          <Badge
            variant="outline"
            className="ml-auto text-xs"
          >
            {insights.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {insights.map((insight) => {
            const config = INSIGHT_CONFIG[insight.type]
            const Icon = config.icon
            return (
              <div
                key={insight.id}
                className="p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium truncate">
                        {insight.title}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {insight.description}
                    </p>
                    <Badge
                      variant="outline"
                      className={`mt-2 text-[10px] ${IMPACT_STYLES[insight.impact]}`}
                    >
                      {insight.impact} impact
                    </Badge>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
