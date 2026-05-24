'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Copy,
  IndianRupee,
  Store,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import type { FraudAlert } from '@/types'

const TYPE_CONFIG: Record<
  FraudAlert['type'],
  { icon: React.ElementType; label: string }
> = {
  duplicate: { icon: Copy, label: 'Duplicate' },
  amount_anomaly: { icon: IndianRupee, label: 'Amount Anomaly' },
  merchant_anomaly: { icon: Store, label: 'Merchant Anomaly' },
  timing_anomaly: { icon: Clock, label: 'Timing Anomaly' },
}

const SEVERITY_CLASS: Record<FraudAlert['severity'], string> = {
  critical: 'fraud-alert-critical',
  high: 'fraud-alert-high',
  medium: 'fraud-alert-medium',
  low: 'fraud-alert-low',
}

const SEVERITY_COLOR: Record<FraudAlert['severity'], string> = {
  critical: 'text-red-400 bg-red-500/20',
  high: 'text-orange-400 bg-orange-500/20',
  medium: 'text-yellow-400 bg-yellow-500/20',
  low: 'text-blue-400 bg-blue-500/20',
}

export function FraudAlertsPanel() {
  const invoices = useAppStore((s) => s.invoices)
  const storeAlerts = useAppStore((s) => s.fraudAlerts)
  const resolveFraudAlert = useAppStore((s) => s.resolveFraudAlert)

  const alerts: FraudAlert[] = useMemo(() => {
    if (storeAlerts.length > 0) return storeAlerts

    // Generate alerts from invoice data
    const generated: FraudAlert[] = []

    invoices.forEach((inv) => {
      if (inv.isDuplicate) {
        generated.push({
          id: `fraud-dup-${inv.id}`,
          invoiceId: inv.id,
          type: 'duplicate',
          description: `Duplicate invoice detected for ${inv.merchant} (₹${inv.amount.toFixed(2)})`,
          severity: 'critical',
          createdAt: inv.uploadedAt,
          resolved: false,
        })
      }

      if (inv.fraudScore > 0.7) {
        generated.push({
          id: `fraud-amount-${inv.id}`,
          invoiceId: inv.id,
          type: 'amount_anomaly',
          description: `Unusual amount of ₹${inv.amount.toFixed(2)} from ${inv.merchant} (fraud score: ${(inv.fraudScore * 100).toFixed(0)}%)`,
          severity: inv.fraudScore > 0.9 ? 'critical' : 'high',
          createdAt: inv.uploadedAt,
          resolved: false,
        })
      }

      if (inv.status === 'flagged' && !inv.isDuplicate && inv.fraudScore <= 0.7) {
        generated.push({
          id: `fraud-merchant-${inv.id}`,
          invoiceId: inv.id,
          type: 'merchant_anomaly',
          description: `Unrecognized merchant pattern: ${inv.merchant}`,
          severity: 'medium',
          createdAt: inv.uploadedAt,
          resolved: false,
        })
      }
    })

    return generated
  }, [invoices, storeAlerts])

  const unresolvedCount = alerts.filter((a) => !a.resolved).length

  return (
    <Card className="glass-card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
          Fraud Alerts
          {unresolvedCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-auto text-xs"
            >
              {unresolvedCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
            <span>All clear — no fraud alerts</span>
          </div>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {alerts.map((alert) => {
              const typeConfig = TYPE_CONFIG[alert.type]
              const Icon = typeConfig.icon
              const isResolved = alert.resolved

              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl bg-secondary/30 transition-opacity ${
                    isResolved ? 'opacity-50' : ''
                  } ${SEVERITY_CLASS[alert.severity]}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isResolved ? 'bg-muted' : SEVERITY_COLOR[alert.severity]
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          isResolved ? 'text-muted-foreground' : ''
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-sm font-medium">
                          {typeConfig.label}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${SEVERITY_COLOR[alert.severity]}`}
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {alert.description}
                      </p>
                      {!isResolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 text-xs text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => resolveFraudAlert(alert.id)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Mark as Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
