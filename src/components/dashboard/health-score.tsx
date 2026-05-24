'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import type { FinancialHealthScore } from '@/types'

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#eab308'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Needs Attention'
}

export function HealthScore() {
  const invoices = useAppStore((s) => s.invoices)
  const storeScore = useAppStore((s) => s.healthScore)

  const score: FinancialHealthScore = useMemo(() => {
    if (storeScore) return storeScore

    if (invoices.length === 0) {
      return {
        overall: 0,
        spending: 0,
        savings: 0,
        consistency: 0,
        diversification: 0,
        fraudRisk: 100,
      }
    }

    // Spending score: lower relative spending = higher score
    const totalSpent = invoices.reduce((s, i) => s + i.amount, 0)
    const avgInvoice = totalSpent / invoices.length
    const spendingScore = Math.max(0, Math.min(100, 100 - (avgInvoice / 500) * 20))

    // Savings score: based on tax efficiency
    const totalTax = invoices.reduce((s, i) => s + i.tax, 0)
    const savingsScore = Math.max(0, Math.min(100, 100 - (totalTax / totalSpent) * 100))

    // Consistency: based on how similar invoice amounts are
    const amounts = invoices.map((i) => i.amount)
    const mean = avgInvoice
    const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length
    const stdDev = Math.sqrt(variance)
    const cv = mean > 0 ? stdDev / mean : 1
    const consistencyScore = Math.max(0, Math.min(100, (1 - cv) * 100))

    // Diversification: more categories = higher score
    const categories = new Set(invoices.map((i) => i.category))
    const diversificationScore = Math.min(100, (categories.size / 10) * 100)

    // Fraud risk: inverted — lower fraud score = higher safety
    const avgFraud = invoices.reduce((s, i) => s + i.fraudScore, 0) / invoices.length
    const fraudRiskScore = Math.max(0, Math.min(100, 100 - avgFraud * 100))

    const overall = Math.round(
      (spendingScore * 0.25 +
        savingsScore * 0.2 +
        consistencyScore * 0.25 +
        diversificationScore * 0.15 +
        fraudRiskScore * 0.15)
    )

    return {
      overall,
      spending: Math.round(spendingScore),
      savings: Math.round(savingsScore),
      consistency: Math.round(consistencyScore),
      diversification: Math.round(diversificationScore),
      fraudRisk: Math.round(fraudRiskScore),
    }
  }, [invoices, storeScore])

  const donutData = [
    { value: score.overall, color: getScoreColor(score.overall) },
    { value: 100 - score.overall, color: 'var(--secondary)' },
  ]

  const subScores = [
    { label: 'Spending', value: score.spending },
    { label: 'Savings', value: score.savings },
    { label: 'Consistency', value: score.consistency },
    { label: 'Diversification', value: score.diversification },
    { label: 'Fraud Safety', value: score.fraudRisk },
  ]

  return (
    <Card className="glass-card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
          Financial Health
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col items-center">
        {/* Donut Chart */}
        <div className="relative w-36 h-36 health-ring">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={68}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                {donutData.map((entry, index) => (
                  <Cell
                    key={`health-cell-${index}`}
                    fill={entry.color}
                    style={index === 1 ? { opacity: 0.08 } : undefined}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-3xl font-bold"
              style={{ color: getScoreColor(score.overall) }}
            >
              {score.overall}
            </span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <span
          className="text-sm font-medium mt-2 mb-4"
          style={{ color: getScoreColor(score.overall) }}
        >
          {getScoreLabel(score.overall)}
        </span>

        {/* Sub-scores */}
        <div className="w-full space-y-3">
          {subScores.map((sub) => (
            <div key={sub.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{sub.label}</span>
                <span
                  className="font-medium"
                  style={{ color: getScoreColor(sub.value) }}
                >
                  {sub.value}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${sub.value}%`,
                    backgroundColor: getScoreColor(sub.value),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
