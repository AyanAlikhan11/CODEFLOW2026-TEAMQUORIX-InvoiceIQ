import { NextResponse } from 'next/server'
import { database } from '@/lib/database'
import { predictSpending } from '@/lib/ai-enhanced'

export async function POST() {
  try {
    const invoices = await database.getInvoices()

    if (invoices.length < 2) {
      return NextResponse.json({
        predictions: [],
        message: 'Need at least 2 invoices to generate predictions',
      })
    }

    // Group invoices by month
    const monthlyMap: Record<string, number> = {}
    invoices.forEach(inv => {
      const month = inv.date ? inv.date.substring(0, 7) : inv.uploadedAt.substring(0, 7)
      monthlyMap[month] = (monthlyMap[month] || 0) + inv.amount
    })

    const monthlyData = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }))

    const predictions = predictSpending(monthlyData)

    return NextResponse.json({ predictions })
  } catch (error) {
    console.error('Predictions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    )
  }
}
