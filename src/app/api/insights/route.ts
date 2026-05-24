import { NextResponse } from 'next/server'
import { database } from '@/lib/database'
import { generateInsights, invoiceToInvoiceData } from '@/lib/ai-enhanced'

export async function POST() {
  try {
    const invoices = await database.getInvoices()

    if (invoices.length === 0) {
      return NextResponse.json({
        insights: [],
        recommendations: ['Upload some invoices to get personalized AI financial insights.'],
      })
    }

    const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const totalTax = invoices.reduce((sum, inv) => sum + inv.tax, 0)
    const totalGST = invoices.reduce((sum, inv) => sum + inv.gstAmount, 0)
    const avgInvoice = totalSpent / invoices.length

    const categoryBreakdown: Record<string, number> = {}
    invoices.forEach(inv => {
      categoryBreakdown[inv.category] = (categoryBreakdown[inv.category] || 0) + inv.amount
    })

    const merchantBreakdown: Record<string, { count: number; total: number }> = {}
    invoices.forEach(inv => {
      if (!merchantBreakdown[inv.merchant]) {
        merchantBreakdown[inv.merchant] = { count: 0, total: 0 }
      }
      merchantBreakdown[inv.merchant].count++
      merchantBreakdown[inv.merchant].total += inv.amount
    })

    const topCategory = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]
    const topMerchant = Object.entries(merchantBreakdown).sort((a, b) => b[1].total - a[1].total)[0]
    const taxRate = totalSpent > 0 ? ((totalTax / totalSpent) * 100).toFixed(1) : '0'

    const flaggedInvoices = invoices.filter(inv => inv.fraudScore > 0.3 || inv.isDuplicate)

    // Use enhanced AI insights generation
    const invoiceDataList = invoices.map(invoiceToInvoiceData)
    let insights = await generateInsights(invoiceDataList)

    // Fallback if AI didn't return enough insights
    if (insights.length < 3) {
      const basicInsights = [
        {
          type: 'observation' as const,
          title: 'Total Spending Overview',
          description: `You have spent a total of $${totalSpent.toFixed(2)} across ${invoices.length} invoices. Your average invoice amount is $${avgInvoice.toFixed(2)}.`,
          impact: 'medium' as const,
        },
        {
          type: 'observation' as const,
          title: 'Top Spending Category',
          description: `Your highest spending category is ${topCategory?.[0] || 'N/A'} at $${topCategory?.[1]?.toFixed(2) || '0'}, which accounts for ${totalSpent > 0 ? ((topCategory?.[1] || 0) / totalSpent * 100).toFixed(1) : 0}% of your total spending.`,
          impact: 'high' as const,
        },
        {
          type: 'recommendation' as const,
          title: 'Tax Optimization',
          description: `Your effective tax rate is ${taxRate}%. Review your invoices for potential tax deductions and savings opportunities. Keep all business-related receipts organized.`,
          impact: 'medium' as const,
        },
      ]

      if (flaggedInvoices.length > 0) {
        basicInsights.push({
          type: 'fraud_alert' as const,
          title: `${flaggedInvoices.length} Flagged Invoice${flaggedInvoices.length > 1 ? 's' : ''}`,
          description: `${flaggedInvoices.length} invoice${flaggedInvoices.length > 1 ? 's have' : ' has'} been flagged for potential fraud or duplication. Review these transactions carefully.`,
          impact: 'high' as const,
        })
      }

      insights = [...basicInsights, ...insights]
    }

    // Generate recommendations
    const recommendations = [
      `Consider setting a monthly budget of $${(avgInvoice * 3).toFixed(2)} based on your average spending pattern of $${avgInvoice.toFixed(2)} per invoice.`,
      `Your top merchant ${topMerchant?.[0] || 'N/A'} accounts for ${totalSpent > 0 && topMerchant ? ((topMerchant[1].total / totalSpent) * 100).toFixed(0) : 0}% of spending. Look for bulk discounts or loyalty programs.`,
      `With $${totalTax.toFixed(2)} in total taxes paid ($${totalGST.toFixed(2)} GST), consult a tax professional about potential deductions on your ${topCategory?.[0] || 'uncategorized'} expenses.`,
    ]

    return NextResponse.json({ insights, recommendations })
  } catch (error) {
    console.error('Insights generation error:', error)
    return NextResponse.json(
      {
        insights: [],
        recommendations: ['Unable to generate insights. Please try again later.'],
      },
      { status: 500 }
    )
  }
}
