// Enhanced AI service with better performance for large data
import ZAI from 'z-ai-web-dev-sdk'
import type { Invoice } from '@/types'

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface InvoiceData {
  merchant: string
  invoiceNumber: string | null
  amount: number
  subtotal: number
  tax: number
  gstAmount: number
  gstRate: number
  gstType: string | null
  discount: number
  date: string | null
  currency: string
  category: string
  subCategory: string
  items: Array<{ name: string; quantity: number; price: number }>
  paymentMethod: string | null
  confidence: number
  status: string
}

export interface FraudDetectionResult {
  score: number
  reasons: string[]
  alerts: Array<{
    type: 'duplicate' | 'amount_anomaly' | 'round_amount' | 'missing_fields' | 'timing_anomaly'
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>
}

export interface InsightData {
  type: 'observation' | 'recommendation' | 'warning' | 'fraud_alert'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
}

export interface MonthlyDataPoint {
  month: string
  amount: number
}

export interface PredictionData {
  month: string
  predicted: number
  lower: number
  upper: number
  confidence: number
}

export interface HealthScoreData {
  overall: number
  spending: number
  savings: number
  consistency: number
  diversification: number
  fraudSafety: number
  taxEfficiency: number
}

// ─── Constants ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Food', 'Shopping', 'Travel', 'Medical', 'Utilities',
  'Entertainment', 'Office', 'Education', 'Subscription', 'Other',
  'Rent', 'Insurance', 'Transport', 'Groceries', 'Dining',
]

const CURRENCY_SYMBOLS: Record<string, string> = {
  '$': 'USD', '€': 'EUR', '£': 'GBP', '₹': 'INR', '¥': 'JPY',
  '₩': 'KRW', '₽': 'RUB', '₺': 'TRY', 'A$': 'AUD', 'C$': 'CAD',
}

// ─── Invoice Analysis ──────────────────────────────────────────────────────

const AI_INVOICE_PROMPT = `You are a world-class financial document analyzer with expertise in invoices from all countries. Analyze this document with extreme precision.

Extract EVERY piece of information from this invoice/receipt. Pay special attention to:
1. Merchant/vendor name (look for company logos, headers, "Bill From", "Sold By")
2. Invoice number if present
3. Date (look for "Date", "Invoice Date", "Due Date" — return in YYYY-MM-DD format)
4. Line items with EXACT names, quantities, and per-unit prices (not totals)
5. Subtotal before tax
6. Tax breakdown: look for GST, CGST, SGST, IGST, VAT, HST, or any tax
7. Grand total / final amount
8. Currency symbol detection
9. Payment method if shown
10. Any discount or coupon applied

CRITICAL RULES:
- Return ONLY valid JSON, no markdown fences
- For line items: each item must have "name" (string), "quantity" (number), "price" (per-unit price)
- If a line item shows only total, set quantity=1 and price=total
- Detect currency from symbols ($, €, £, ₹, ¥, ₩, ₽, ₺) and return ISO code
- For GST: split into CGST/SGST (intrastate) or IGST (interstate) if visible
- Category must be one of: Food, Shopping, Travel, Medical, Utilities, Entertainment, Office, Education, Subscription, Rent, Insurance, Transport, Groceries, Dining, Other

Return this exact JSON structure:
{
  "merchant": "exact merchant name",
  "invoiceNumber": "INV-001 or null",
  "amount": 123.45,
  "subtotal": 100.00,
  "tax": 23.45,
  "gstAmount": 18.00,
  "gstRate": 18,
  "gstType": "CGST/SGST or IGST or null",
  "discount": 0,
  "date": "2024-01-15",
  "currency": "INR",
  "category": "Food",
  "subCategory": "Groceries",
  "items": [{"name": "Item 1", "quantity": 2, "price": 50.00}],
  "paymentMethod": "UPI or Credit Card or null",
  "confidence": 0.95,
  "status": "processed"
}`

export async function analyzeInvoiceWithAI(imageData: string, fileName: string): Promise<InvoiceData> {
  const zai = await ZAI.create()

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const isPdf = fileName?.toLowerCase().endsWith('.pdf') || imageData.startsWith('data:application/pdf')

      const contentParts: Array<Record<string, unknown>> = [
        { type: 'text', text: AI_INVOICE_PROMPT },
      ]

      if (isPdf) {
        contentParts.push({ type: 'file_url', file_url: { url: imageData } })
      } else {
        contentParts.push({ type: 'image_url', image_url: { url: imageData } })
      }

      const completion = await zai.chat.completions.createVision({
        messages: [{ role: 'user', content: contentParts }],
        thinking: { type: 'disabled' },
      })

      const responseText = completion.choices[0]?.message?.content || ''
      return parseInvoiceResponse(responseText)
    } catch (error) {
      lastError = error as Error
      console.warn(`[AI] Attempt ${attempt}/3 failed:`, (error as Error).message)
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }

  throw lastError || new Error('AI analysis failed after 3 attempts')
}

function parseInvoiceResponse(text: string): InvoiceData {
  const defaults: InvoiceData = {
    merchant: 'Unknown Merchant',
    invoiceNumber: null,
    amount: 0,
    subtotal: 0,
    tax: 0,
    gstAmount: 0,
    gstRate: 0,
    gstType: null,
    discount: 0,
    date: null,
    currency: 'USD',
    category: 'Other',
    subCategory: '',
    items: [],
    paymentMethod: null,
    confidence: 0,
    status: 'processed',
  }

  // Strategy 1: Direct JSON parse
  try {
    const parsed = JSON.parse(text)
    return normalizeInvoiceData(parsed, defaults)
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Extract from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1])
      return normalizeInvoiceData(parsed, defaults)
    } catch {
      // Continue
    }
  }

  // Strategy 3: Find JSON object in text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      return normalizeInvoiceData(parsed, defaults)
    } catch {
      // Continue
    }
  }

  // Strategy 4: Use regex to extract key fields
  return extractFieldsWithRegex(text, defaults)
}

function normalizeInvoiceData(raw: Record<string, unknown>, defaults: InvoiceData): InvoiceData {
  const merchant = String(raw.merchant || defaults.merchant).trim()
  const amount = parseFloat(String(raw.amount)) || 0
  const subtotal = parseFloat(String(raw.subtotal)) || 0
  const tax = parseFloat(String(raw.tax)) || 0
  const gstAmount = parseFloat(String(raw.gstAmount)) || 0
  const gstRate = parseFloat(String(raw.gstRate)) || 0
  const discount = parseFloat(String(raw.discount)) || 0
  const confidence = Math.min(1, Math.max(0, parseFloat(String(raw.confidence)) || 0.8))
  const currency = String(raw.currency || 'USD').toUpperCase()

  let date: string | null = String(raw.date || '').trim() || null
  if (date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) date = null
  }

  const category = CATEGORIES.includes(String(raw.category)) ? String(raw.category) : 'Other'

  const items = Array.isArray(raw.items)
    ? (raw.items as Array<Record<string, unknown>>).map(item => ({
        name: String(item.name || 'Unknown Item'),
        quantity: parseInt(String(item.quantity)) || 1,
        price: parseFloat(String(item.price)) || 0,
      }))
    : []

  return {
    merchant,
    invoiceNumber: String(raw.invoiceNumber || '') || null,
    amount: Math.max(0, amount),
    subtotal: Math.max(0, subtotal),
    tax: Math.max(0, tax),
    gstAmount: Math.max(0, gstAmount),
    gstRate: Math.max(0, gstRate),
    gstType: String(raw.gstType || '') || null,
    discount: Math.max(0, discount),
    date,
    currency,
    category,
    subCategory: String(raw.subCategory || ''),
    items,
    paymentMethod: String(raw.paymentMethod || '') || null,
    confidence: Math.round(confidence * 100) / 100,
    status: String(raw.status || 'processed'),
  }
}

function extractFieldsWithRegex(text: string, defaults: InvoiceData): InvoiceData {
  const result = { ...defaults }

  // Try to find merchant name (usually near the top)
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length > 0) result.merchant = lines[0].trim().replace(/[^a-zA-Z0-9\s&.'-]/g, '').substring(0, 100)

  // Try to find amount patterns
  const amountPatterns = [
    /(?:total|amount|grand total)[:\s]*[$€£₹¥]?\s*([\d,]+\.?\d*)/i,
    /[$€£₹¥]\s*([\d,]+\.?\d*)/,
  ]
  for (const pattern of amountPatterns) {
    const match = text.match(pattern)
    if (match) {
      result.amount = parseFloat(match[1].replace(/,/g, '')) || 0
      break
    }
  }

  // Try to find date
  const datePatterns = [
    /(\d{4}[-/]\d{2}[-/]\d{2})/,
    /(\d{2}[-/]\d{2}[-/]\d{4})/,
  ]
  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      result.date = match[1].replace(/\//g, '-')
      break
    }
  }

  return result
}

// ─── Batch Invoice Analysis ─────────────────────────────────────────────────

export async function analyzeInvoicesBatch(
  invoices: Array<{ imageData: string; fileName: string }>
): Promise<Array<{ success: boolean; data?: InvoiceData; error?: string }>> {
  const CONCURRENCY_LIMIT = 3
  const results: Array<{ success: boolean; data?: InvoiceData; error?: string }> = []

  for (let i = 0; i < invoices.length; i += CONCURRENCY_LIMIT) {
    const batch = invoices.slice(i, i + CONCURRENCY_LIMIT)
    const batchResults = await Promise.allSettled(
      batch.map(async (inv) => {
        const data = await analyzeInvoiceWithAI(inv.imageData, inv.fileName)
        return { success: true, data } as const
      })
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        results.push({ success: false, error: result.reason?.message || 'Unknown error' })
      }
    }
  }

  return results
}

// ─── Fraud Detection ────────────────────────────────────────────────────────

export function detectFraud(
  invoice: InvoiceData | Invoice,
  existingInvoices: (InvoiceData | Invoice)[]
): FraudDetectionResult {
  const reasons: string[] = []
  const alerts: FraudDetectionResult['alerts'] = []
  let compositeScore = 0

  const invoiceAmount = invoice.amount
  const invoiceMerchant = invoice.merchant.toLowerCase().trim()
  const invoiceDate = invoice.date || ''

  // Strategy 1: Duplicate detection (same merchant + amount within 10% + date within 7 days)
  for (const existing of existingInvoices) {
    if ('id' in existing && existing.id === (invoice as Invoice).id) continue
    const existingMerchant = existing.merchant.toLowerCase().trim()
    const existingDate = existing.date || ''

    if (existingMerchant === invoiceMerchant && invoiceAmount > 0) {
      const amountDiff = Math.abs(existing.amount - invoiceAmount) / invoiceAmount
      if (amountDiff <= 0.1) {
        // Check date proximity (within 7 days)
        if (invoiceDate && existingDate) {
          const invDate = new Date(invoiceDate)
          const exDate = new Date(existingDate)
          const daysDiff = Math.abs(invDate.getTime() - exDate.getTime()) / (1000 * 60 * 60 * 24)
          if (daysDiff <= 7) {
            compositeScore += 0.4
            reasons.push(`Duplicate detected: same merchant "${invoice.merchant}" with ${Math.round(amountDiff * 100)}% amount match within ${Math.round(daysDiff)} days`)
            alerts.push({
              type: 'duplicate',
              description: `Possible duplicate: ${invoice.merchant} — ₹${invoiceAmount.toFixed(2)} matches existing invoice within ${Math.round(daysDiff)} days`,
              severity: amountDiff <= 0.02 ? 'critical' : 'high',
            })
          }
        } else {
          // No dates to compare, but amount and merchant match
          compositeScore += 0.2
          reasons.push(`Potential duplicate: same merchant "${invoice.merchant}" with similar amount (no dates to compare)`)
        }
      }
    }
  }

  // Strategy 2: Amount anomaly (z-score > 3)
  if (existingInvoices.length >= 3) {
    const amounts = existingInvoices.map(e => e.amount).filter(a => a > 0)
    if (amounts.length >= 3) {
      const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length
      const stdDev = Math.sqrt(amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length)
      if (stdDev > 0) {
        const zScore = Math.abs((invoiceAmount - mean) / stdDev)
        if (zScore > 3) {
          compositeScore += 0.3
          reasons.push(`Amount anomaly: ₹${invoiceAmount.toFixed(2)} is ${(zScore).toFixed(1)} standard deviations from the mean (₹${mean.toFixed(2)})`)
          alerts.push({
            type: 'amount_anomaly',
            description: `Unusual amount ₹${invoiceAmount.toFixed(2)} — ${(zScore).toFixed(1)}σ from average ₹${mean.toFixed(2)}`,
            severity: zScore > 5 ? 'critical' : 'high',
          })
        }
      }
    }
  }

  // Strategy 3: Round amount detection
  if (invoiceAmount > 50 && invoiceAmount === Math.round(invoiceAmount)) {
    compositeScore += 0.1
    reasons.push(`Round amount: ₹${invoiceAmount.toFixed(2)} is an exact round number, which is less common for real invoices`)
    alerts.push({
      type: 'round_amount',
      description: `Round amount detected: ₹${invoiceAmount.toFixed(2)}`,
      severity: 'low',
    })
  }

  // Strategy 4: Missing critical fields
  const missingFields: string[] = []
  if (!invoice.merchant || invoice.merchant === 'Unknown Merchant') missingFields.push('merchant')
  if (!invoice.date) missingFields.push('date')
  if (invoiceAmount <= 0) missingFields.push('amount')
  if (missingFields.length > 0) {
    compositeScore += missingFields.length * 0.05
    reasons.push(`Missing critical fields: ${missingFields.join(', ')}`)
    alerts.push({
      type: 'missing_fields',
      description: `Missing fields: ${missingFields.join(', ')}`,
      severity: missingFields.length > 2 ? 'medium' : 'low',
    })
  }

  // Strategy 5: Unusual timing (midnight or weekend)
  if (invoiceDate) {
    const invDateObj = new Date(invoiceDate)
    const dayOfWeek = invDateObj.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      compositeScore += 0.05
      reasons.push('Weekend invoice date detected')
    }
  }

  return {
    score: Math.min(1, compositeScore),
    reasons,
    alerts,
  }
}

// ─── Insights Generation ────────────────────────────────────────────────────

function generateDataSummary(invoices: InvoiceData[]): string {
  const totalSpent = invoices.reduce((s, i) => s + i.amount, 0)
  const avgInvoice = totalSpent / invoices.length
  const totalTax = invoices.reduce((s, i) => s + i.tax, 0)
  const totalGST = invoices.reduce((s, i) => s + i.gstAmount, 0)

  const categoryBreakdown: Record<string, number> = {}
  invoices.forEach(inv => {
    categoryBreakdown[inv.category] = (categoryBreakdown[inv.category] || 0) + inv.amount
  })

  const merchantBreakdown: Record<string, { count: number; total: number }> = {}
  invoices.forEach(inv => {
    if (!merchantBreakdown[inv.merchant]) merchantBreakdown[inv.merchant] = { count: 0, total: 0 }
    merchantBreakdown[inv.merchant].count++
    merchantBreakdown[inv.merchant].total += inv.amount
  })

  const topCategory = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]
  const topMerchant = Object.entries(merchantBreakdown).sort((a, b) => b[1].total - a[1].total)[0]

  return `Total Spent: ₹${totalSpent.toFixed(2)}
Total Tax: ₹${totalTax.toFixed(2)}
Total GST: ₹${totalGST.toFixed(2)}
Number of Invoices: ${invoices.length}
Average Invoice: ₹${avgInvoice.toFixed(2)}
Top Category: ${topCategory?.[0] || 'N/A'} (₹${topCategory?.[1]?.toFixed(2) || '0'})
Top Merchant: ${topMerchant?.[0] || 'N/A'} (${topMerchant?.[1]?.count} invoices, ₹${topMerchant?.[1]?.total.toFixed(2)})
Category Breakdown: ${Object.entries(categoryBreakdown).map(([k, v]) => `${k}: ₹${v.toFixed(2)}`).join(', ')}
Merchant Details: ${Object.entries(merchantBreakdown).map(([k, v]) => `${k}: ${v.count} invoices, total ₹${v.total.toFixed(2)}`).join(', ')}`
}

export async function generateInsights(invoices: InvoiceData[]): Promise<InsightData[]> {
  if (invoices.length === 0) return []

  const totalSpent = invoices.reduce((s, i) => s + i.amount, 0)
  const avgInvoice = totalSpent / invoices.length

  const zai = await ZAI.create()

  const prompt = `Analyze this financial data from ${invoices.length} invoices totaling ₹${totalSpent.toFixed(2)}:

${generateDataSummary(invoices)}

Generate 6-8 actionable insights. Each must include specific dollar amounts and percentages.
Return JSON array: [{"type": "observation|recommendation|warning|fraud_alert", "title": "...", "description": "...", "impact": "high|medium|low"}]

Rules:
- Be specific with dollar amounts and percentages
- Mix of types: observation, recommendation, warning, fraud_alert
- Return ONLY valid JSON array, no markdown
- Each description should be 2-3 sentences with specific data`

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
      })

      const responseText = completion.choices[0]?.message?.content || ''
      return parseInsightsResponse(responseText, invoices)
    } catch (error) {
      lastError = error as Error
      console.warn(`[AI] Insight generation attempt ${attempt}/2 failed:`, (error as Error).message)
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000))
    }
  }

  // Fallback to basic insights
  return generateBasicInsights(invoices, totalSpent, avgInvoice)
}

function parseInsightsResponse(text: string, invoices: InvoiceData[]): InsightData[] {
  // Try direct parse
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed.map((item: Record<string, unknown>) => ({
        type: ['observation', 'recommendation', 'warning', 'fraud_alert'].includes(String(item.type))
          ? String(item.type) as InsightData['type']
          : 'observation',
        title: String(item.title || 'Insight'),
        description: String(item.description || ''),
        impact: ['high', 'medium', 'low'].includes(String(item.impact))
          ? String(item.impact) as InsightData['impact']
          : 'medium',
      }))
    }
  } catch {
    // Continue
  }

  // Try extracting from code block
  const match = text.match(/\[[\s\S]*\]/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed)) {
        return parsed.map((item: Record<string, unknown>) => ({
          type: ['observation', 'recommendation', 'warning', 'fraud_alert'].includes(String(item.type))
            ? String(item.type) as InsightData['type']
            : 'observation',
          title: String(item.title || 'Insight'),
          description: String(item.description || ''),
          impact: ['high', 'medium', 'low'].includes(String(item.impact))
            ? String(item.impact) as InsightData['impact']
            : 'medium',
        }))
      }
    } catch {
      // Continue to basic fallback
    }
  }

  const totalSpent = invoices.reduce((s, i) => s + i.amount, 0)
  const avgInvoice = totalSpent / invoices.length
  return generateBasicInsights(invoices, totalSpent, avgInvoice)
}

function generateBasicInsights(invoices: InvoiceData[], totalSpent: number, avgInvoice: number): InsightData[] {
  const categoryBreakdown: Record<string, number> = {}
  invoices.forEach(inv => {
    categoryBreakdown[inv.category] = (categoryBreakdown[inv.category] || 0) + inv.amount
  })
  const topCategory = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]

  const insights: InsightData[] = [
    {
      type: 'observation',
      title: 'Total Spending Overview',
      description: `You have spent a total of ₹${totalSpent.toFixed(2)} across ${invoices.length} invoices. Your average invoice amount is ₹${avgInvoice.toFixed(2)}.`,
      impact: 'medium',
    },
  ]

  if (topCategory) {
    const pct = totalSpent > 0 ? ((topCategory[1] / totalSpent) * 100).toFixed(1) : '0'
    insights.push({
      type: 'observation',
      title: 'Top Spending Category',
      description: `Your highest spending category is ${topCategory[0]} at ₹${topCategory[1].toFixed(2)}, which accounts for ${pct}% of your total spending.`,
      impact: 'high',
    })
  }

  insights.push({
    type: 'recommendation',
    title: 'Tax Optimization',
    description: `Review your invoices for potential tax deductions. Keep all business-related receipts organized for tax filing.`,
    impact: 'medium',
  })

  return insights
}

// ─── Spending Prediction ────────────────────────────────────────────────────

export function predictSpending(monthlyData: MonthlyDataPoint[]): PredictionData[] {
  if (monthlyData.length < 2) return []

  const months = monthlyData.map(d => d.month)
  const amounts = monthlyData.map(d => d.amount)
  const n = amounts.length

  // Method 1: Linear regression
  const xs = amounts.map((_, i) => i)
  const sumX = xs.reduce((s, x) => s + x, 0)
  const sumY = amounts.reduce((s, y) => s + y, 0)
  const sumXY = xs.reduce((s, x, i) => s + x * amounts[i], 0)
  const sumX2 = xs.reduce((s, x) => s + x * x, 0)
  const denominator = n * sumX2 - sumX * sumX
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0
  const intercept = (sumY - slope * sumX) / n

  // Method 2: Moving average (3-month)
  const movingAvg = n >= 3
    ? amounts.slice(-3).reduce((s, a) => s + a, 0) / 3
    : amounts.reduce((s, a) => s + a, 0) / n

  // Method 3: Exponential smoothing
  let smoothed = amounts[0]
  const alpha = 0.3
  for (let i = 1; i < n; i++) {
    smoothed = alpha * amounts[i] + (1 - alpha) * smoothed
  }

  // Combine: weighted average (linear 40%, moving avg 30%, smoothed 30%)
  const predictions: PredictionData[] = []
  const lastMonth = months[months.length - 1]
  const lastDate = new Date(lastMonth + '-01')

  for (let i = 1; i <= 3; i++) {
    const predDate = new Date(lastDate)
    predDate.setMonth(predDate.getMonth() + i)
    const monthStr = predDate.toISOString().substring(0, 7)

    const linearPred = slope * (n - 1 + i) + intercept
    const combined = linearPred * 0.4 + movingAvg * 0.3 + smoothed * 0.3

    // Confidence intervals based on data variance
    const residuals = amounts.map((y, idx) => y - (slope * idx + intercept))
    const stdError = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(n - 2, 1))
    const margin = stdError * (1 + (1 / n) + Math.pow(i, 2) / n) * 0.5
    const confidence = Math.max(0.5, 0.95 - i * 0.1)

    predictions.push({
      month: monthStr,
      predicted: Math.round(Math.max(0, combined) * 100) / 100,
      lower: Math.round(Math.max(0, combined - margin) * 100) / 100,
      upper: Math.round((combined + margin) * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
    })
  }

  return predictions
}

// ─── Financial Health Score ─────────────────────────────────────────────────

export function calculateHealthScore(invoices: InvoiceData[]): HealthScoreData {
  if (invoices.length === 0) {
    return { overall: 50, spending: 50, savings: 50, consistency: 50, diversification: 50, fraudSafety: 100, taxEfficiency: 70 }
  }

  const totalSpent = invoices.reduce((s, i) => s + i.amount, 0)

  // 1. Spending trend (decreasing = good)
  let spending = 70
  const sortedByDate = [...invoices].sort((a, b) => {
    const da = a.date || ''
    const db2 = b.date || ''
    return da.localeCompare(db2)
  })
  if (sortedByDate.length >= 4) {
    const third = Math.floor(sortedByDate.length / 3)
    const recent = sortedByDate.slice(0, third).reduce((s, i) => s + i.amount, 0) / third
    const older = sortedByDate.slice(third * 2).reduce((s, i) => s + i.amount, 0) / Math.max(sortedByDate.length - third * 2, 1)
    if (older > 0) {
      const ratio = recent / older
      if (ratio < 0.8) spending = 90
      else if (ratio < 1) spending = 80
      else if (ratio < 1.2) spending = 60
      else if (ratio < 1.5) spending = 40
      else spending = 25
    }
  }
  spending = Math.min(100, Math.max(0, spending))

  // 2. Tax efficiency (are they claiming all GST?)
  const totalTax = invoices.reduce((s, i) => s + i.tax, 0)
  const totalGST = invoices.reduce((s, i) => s + i.gstAmount, 0)
  const taxEfficiency = totalSpent > 0
    ? Math.min(100, Math.round((totalGST / totalSpent) * 500 + 50))
    : 70

  // 3. Savings (budget adherence — use a default 70 since budgets are separate)
  const savings = 70

  // 4. Consistency (regular patterns = good)
  const monthlyMap: Record<string, number> = {}
  invoices.forEach(inv => {
    const month = inv.date ? inv.date.substring(0, 7) : 'unknown'
    monthlyMap[month] = (monthlyMap[month] || 0) + inv.amount
  })
  const monthlyAmounts = Object.values(monthlyMap)
  let consistency = 70
  if (monthlyAmounts.length >= 2) {
    const mean = monthlyAmounts.reduce((s, a) => s + a, 0) / monthlyAmounts.length
    if (mean > 0) {
      const variance = monthlyAmounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / monthlyAmounts.length
      const cv = Math.sqrt(variance) / mean
      consistency = Math.max(0, Math.round((1 - Math.min(cv, 1.5) / 1.5) * 100))
    }
  }
  consistency = Math.min(100, Math.max(0, consistency))

  // 5. Diversification (Shannon entropy of categories)
  const categoryTotals: Record<string, number> = {}
  invoices.forEach(inv => {
    categoryTotals[inv.category] = (categoryTotals[inv.category] || 0) + inv.amount
  })
  let diversification = 50
  const categories = Object.values(categoryTotals)
  if (categories.length > 1 && totalSpent > 0) {
    const proportions = categories.map(c => c / totalSpent)
    const entropy = -proportions.reduce((s, p) => s + (p > 0 ? p * Math.log(p) : 0), 0)
    const maxEntropy = Math.log(categories.length)
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0
    diversification = Math.round(normalizedEntropy * 100)
  }
  diversification = Math.min(100, Math.max(0, diversification))

  // 6. Fraud safety (based on fraud scores)
  // Use detectFraud results average
  let avgFraudScore = 0
  for (const inv of invoices) {
    const result = detectFraud(inv, invoices.filter(i => i !== inv))
    avgFraudScore += result.score
  }
  avgFraudScore /= invoices.length
  const fraudSafety = Math.min(100, Math.max(0, Math.round((1 - Math.min(avgFraudScore, 1)) * 100)))

  // Overall: weighted average
  const overall = Math.round(
    spending * 0.2 +
    savings * 0.15 +
    consistency * 0.2 +
    diversification * 0.15 +
    fraudSafety * 0.2 +
    taxEfficiency * 0.1
  )

  return {
    overall: Math.min(100, Math.max(0, overall)),
    spending,
    savings,
    consistency,
    diversification,
    fraudSafety,
    taxEfficiency: Math.min(100, Math.max(0, taxEfficiency)),
  }
}

// ─── Helpers: Convert Invoice to InvoiceData ────────────────────────────────

export function invoiceToInvoiceData(invoice: Invoice): InvoiceData {
  return {
    merchant: invoice.merchant,
    invoiceNumber: null,
    amount: invoice.amount,
    subtotal: invoice.amount - invoice.tax,
    tax: invoice.tax,
    gstAmount: invoice.gstAmount,
    gstRate: invoice.gstRate,
    gstType: null,
    discount: 0,
    date: invoice.date,
    currency: invoice.currency,
    category: invoice.category,
    subCategory: invoice.subCategory,
    items: invoice.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
    paymentMethod: null,
    confidence: invoice.confidence,
    status: invoice.status,
  }
}
