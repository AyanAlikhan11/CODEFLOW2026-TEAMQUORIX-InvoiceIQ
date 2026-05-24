import { NextResponse } from 'next/server'
import { database } from '@/lib/database'
import { calculateHealthScore, invoiceToInvoiceData } from '@/lib/ai-enhanced'

export async function POST() {
  try {
    const invoices = await database.getInvoices()

    if (invoices.length === 0) {
      return NextResponse.json({
        healthScore: {
          overall: 50,
          spending: 50,
          savings: 50,
          consistency: 50,
          diversification: 50,
          fraudRisk: 100,
        },
      })
    }

    const invoiceDataList = invoices.map(invoiceToInvoiceData)
    const enhancedScore = calculateHealthScore(invoiceDataList)

    // Map enhanced score to the existing FinancialHealthScore interface
    const healthScore = {
      overall: enhancedScore.overall,
      spending: enhancedScore.spending,
      savings: enhancedScore.savings,
      consistency: enhancedScore.consistency,
      diversification: enhancedScore.diversification,
      fraudRisk: enhancedScore.fraudSafety,
    }

    return NextResponse.json({ healthScore })
  } catch (error) {
    console.error('Health score error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate health score' },
      { status: 500 }
    )
  }
}
