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
import type { GSTAnalytics } from '@/types'

const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  color: 'var(--popover-foreground)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
}

export function GSTAnalytics() {
  const invoices = useAppStore((s) => s.invoices)
  const storeGST = useAppStore((s) => s.gstAnalytics)

  const gst: GSTAnalytics = useMemo(() => {
    if (storeGST) return storeGST

    let totalGST = 0
    let cgst = 0
    let sgst = 0
    let igst = 0
    const gstByCategory: Record<string, number> = {}
    const monthlyGSTMap: Record<string, number> = {}

    invoices.forEach((inv) => {
      const gst = inv.gstAmount || inv.tax * 0.5
      totalGST += gst

      // Approximate CGST/SGST split (intrastate) and IGST (interstate)
      // Use gstRate to determine
      if (inv.gstRate > 0) {
        cgst += gst * 0.5
        sgst += gst * 0.5
      } else {
        igst += gst
      }

      // By category
      gstByCategory[inv.category] =
        (gstByCategory[inv.category] || 0) + gst

      // Monthly
      if (inv.date) {
        const month = inv.date.substring(0, 7)
        monthlyGSTMap[month] = (monthlyGSTMap[month] || 0) + gst
      }
    })

    const monthlyGST = Object.entries(monthlyGSTMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
        amount: parseFloat(amount.toFixed(2)),
        budget: 0,
        predicted: 0,
      }))

    return {
      totalGST: parseFloat(totalGST.toFixed(2)),
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      igst: parseFloat(igst.toFixed(2)),
      gstByCategory,
      monthlyGST,
    }
  }, [invoices, storeGST])

  const totalSpent = invoices.reduce((s, i) => s + i.amount, 0)
  const taxEfficiency =
    totalSpent > 0
      ? ((gst.totalGST / totalSpent) * 100).toFixed(1)
      : '0.0'

  const categoryData = Object.entries(gst.gstByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }))

  const CAT_COLORS = ['#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#22c55e']

  return (
    <Card className="glass-card-hover h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
          GST Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-secondary/30 text-center">
            <p className="text-xs text-muted-foreground">Total GST</p>
            <p className="text-lg font-bold text-[#06b6d4]">
              ₹{gst.totalGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/30 text-center">
            <p className="text-xs text-muted-foreground">Tax Efficiency</p>
            <p className="text-lg font-bold text-[#22c55e]">{taxEfficiency}%</p>
          </div>
        </div>

        {/* CGST / SGST / IGST breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-[#8b5cf6]/10">
            <p className="text-[10px] text-muted-foreground">CGST</p>
            <p className="text-sm font-semibold">₹{gst.cgst.toFixed(2)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-[#06b6d4]/10">
            <p className="text-[10px] text-muted-foreground">SGST</p>
            <p className="text-sm font-semibold">₹{gst.sgst.toFixed(2)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-[#f97316]/10">
            <p className="text-[10px] text-muted-foreground">IGST</p>
            <p className="text-sm font-semibold">₹{gst.igst.toFixed(2)}</p>
          </div>
        </div>

        {/* Monthly GST bar chart */}
        {gst.monthlyGST.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Monthly GST</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gst.monthlyGST}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [
                      `₹${value.toFixed(2)}`,
                      'GST',
                    ]}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={24}>
                    {gst.monthlyGST.map((_entry, index) => (
                      <Cell
                        key={`gst-bar-${index}`}
                        fill="#06b6d4"
                        fillOpacity={0.75}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* GST by Category */}
        {categoryData.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">GST by Category</p>
            <div className="space-y-2">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: CAT_COLORS[index % CAT_COLORS.length],
                    }}
                  />
                  <span className="text-xs text-muted-foreground flex-1 truncate">
                    {item.name}
                  </span>
                  <span className="text-xs font-medium">
                    ₹{item.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
