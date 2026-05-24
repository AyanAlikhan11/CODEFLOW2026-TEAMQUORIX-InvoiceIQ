import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/database'
import { analyzeInvoiceWithAI, detectFraud, type InvoiceData } from '@/lib/ai-enhanced'

const CATEGORIES = [
  'Food', 'Shopping', 'Travel', 'Medical', 'Utilities',
  'Entertainment', 'Office', 'Education', 'Subscription', 'Other',
  'Rent', 'Insurance', 'Transport', 'Groceries', 'Dining',
]

export async function GET() {
  try {
    const invoices = await database.getInvoices()
    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('Failed to fetch invoices:', error)
    return NextResponse.json({ invoices: [] }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileName, imageData } = body

    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      )
    }

    let invoiceData: InvoiceData

    try {
      invoiceData = await analyzeInvoiceWithAI(imageData, fileName || 'invoice.pdf')
    } catch (aiError) {
      console.error('AI analysis error:', aiError)
      return NextResponse.json(
        { error: 'AI analysis failed. Please try a clearer invoice image or a different format.' },
        { status: 500 }
      )
    }

    if (invoiceData.amount <= 0) {
      return NextResponse.json(
        { error: 'AI could not detect a valid total amount. Please try a clearer image.' },
        { status: 422 }
      )
    }

    // Normalize category
    if (!CATEGORIES.includes(invoiceData.category)) {
      invoiceData.category = 'Other'
    }

    // Validate date
    if (invoiceData.date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(invoiceData.date)) {
        invoiceData.date = null
      }
    }

    // Get existing invoices for fraud detection
    const existingInvoices = await database.getInvoices()
    const fraudResult = detectFraud(invoiceData, existingInvoices)
    const fraudScore = fraudResult.score
    const isDuplicate = fraudResult.alerts.some(a => a.type === 'duplicate')

    // Create fraud alerts if high severity detected
    for (const alert of fraudResult.alerts) {
      if (alert.severity === 'high' || alert.severity === 'critical') {
        // Create alert after invoice is saved (below)
      }
    }

    const now = new Date().toISOString()
    const itemsWithIds = invoiceData.items.map((item, idx) => ({
      ...item,
      total: item.quantity * item.price,
      id: `item-${Date.now()}-${idx}`,
    }))

    const invoice = await database.createInvoice({
      fileName: fileName || 'invoice.pdf',
      merchant: invoiceData.merchant,
      amount: invoiceData.amount,
      date: invoiceData.date,
      tax: invoiceData.tax,
      gstAmount: invoiceData.gstAmount,
      gstRate: invoiceData.gstRate,
      category: invoiceData.category,
      subCategory: invoiceData.subCategory || '',
      items: itemsWithIds,
      currency: invoiceData.currency,
      status: isDuplicate ? 'duplicate' : fraudScore > 0.5 ? 'flagged' : 'completed',
      fraudScore,
      isDuplicate,
      confidence: invoiceData.confidence,
      ocrText: '',
      uploadedAt: now,
      processedAt: now,
    })

    // Create fraud alerts for high severity detections
    if (invoice.id) {
      for (const alert of fraudResult.alerts) {
        if (alert.severity === 'high' || alert.severity === 'critical') {
          await database.createFraudAlert({
            invoiceId: invoice.id,
            type: alert.type,
            description: alert.description,
            severity: alert.severity,
          }).catch(() => {
            // Ignore alert creation errors
          })
        }
      }
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Invoice processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process invoice. Please try again.' },
      { status: 500 }
    )
  }
}
