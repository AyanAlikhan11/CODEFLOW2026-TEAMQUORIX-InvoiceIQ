import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const invoices = await db.invoice.findMany({
      orderBy: { createdAt: 'desc' },
    })

    if (invoices.length === 0) {
      return NextResponse.json({
        insights: [],
        recommendations: ['Upload some invoices to get personalized financial insights and recommendations.'],
      })
    }

    const summaryData = invoices.map(inv => ({
      merchant: inv.merchant,
      amount: inv.amount,
      tax: inv.tax,
      category: inv.category,
      date: inv.date,
      items: inv.items,
    }))

    const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const totalTax = invoices.reduce((sum, inv) => sum + inv.tax, 0)
    
    const categoryBreakdown: Record<string, number> = {}
    invoices.forEach(inv => {
      categoryBreakdown[inv.category] = (categoryBreakdown[inv.category] || 0) + inv.amount
    })

    const zai = await ZAI.create()

    const prompt = `You are a financial advisor AI. Analyze the following expense data and provide actionable financial insights and recommendations.

Expense Summary:
- Total Invoices: ${invoices.length}
- Total Spent: $${totalSpent.toFixed(2)}
- Total Tax Paid: $${totalTax.toFixed(2)}
- Categories: ${JSON.stringify(categoryBreakdown)}
- Individual expenses: ${JSON.stringify(summaryData.slice(0, 20))}

Please provide:
1. 4-6 specific financial observations about spending patterns
2. 3-5 actionable recommendations to save money
3. Any unusual patterns or concerns

Return ONLY valid JSON array with this format (no markdown, no code blocks):
[
  {"type": "observation", "title": "Short title", "description": "Detailed explanation"},
  {"type": "recommendation", "title": "Short title", "description": "Detailed explanation"},
  {"type": "warning", "title": "Short title", "description": "Detailed explanation"}
]`

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a financial advisor AI. Analyze spending data and provide actionable insights. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    let insights: { type: string; title: string; description: string }[] = []
    try {
      const content = completion.choices[0]?.message?.content || ''
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0])
      }
    } catch {
      insights = [
        { type: 'observation', title: 'Analysis Complete', description: `Analyzed ${invoices.length} invoices totaling $${totalSpent.toFixed(2)}.` },
        { type: 'recommendation', title: 'Track Your Spending', description: 'Continue uploading invoices to get more personalized recommendations over time.' },
      ]
    }

    // Save insights to database
    for (const insight of insights.slice(0, 6)) {
      await db.insight.create({
        data: {
          type: insight.type,
          title: insight.title,
          description: insight.description,
        },
      })
    }

    const recommendations = insights
      .filter((i) => i.type === 'recommendation')
      .map((i) => i.description)

    return NextResponse.json({ insights, recommendations })
  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
