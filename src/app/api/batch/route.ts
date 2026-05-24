import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/database'
import { analyzeInvoicesBatch, detectFraud, type InvoiceData } from '@/lib/ai-enhanced'
import type { Invoice } from '@/types'

const CATEGORIES = [
  'Food', 'Shopping', 'Travel', 'Medical', 'Utilities',
  'Entertainment', 'Office', 'Education', 'Subscription', 'Other',
  'Rent', 'Insurance', 'Transport', 'Groceries', 'Dining',
]

export async function POST(request: NextRequest) {
  try {
    const { invoices: invoiceFiles } = await request.json() as {
      invoices: Array<{ imageData: string; fileName: string }>
    }

    if (!invoiceFiles || !Array.isArray(invoiceFiles) || invoiceFiles.length === 0) {
      return NextResponse.json(
        { error: 'No invoices provided for batch processing' },
        { status: 400 }
      )
    }

    if (invoiceFiles.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 invoices per batch. Please split into smaller batches.' },
        { status: 400 }
      )
    }

    // Analyze all invoices in batch with concurrency
    const batchResults = await analyzeInvoicesBatch(invoiceFiles)

    const savedInvoices: Invoice[] = []
    let failed = 0
    const errors: string[] = []

    // Get existing invoices for fraud detection
    const existingInvoices = await database.getInvoices()

    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i]
      const file = invoiceFiles[i]

      if (!result.success || !result.data) {
        failed++
        errors.push(`${file.fileName}: ${result.error || 'Unknown error'}`)
        continue
      }

      const invoiceData = result.data as InvoiceData

      // Validate
      if (invoiceData.amount <= 0) {
        failed++
        errors.push(`${file.fileName}: No valid amount detected`)
        continue
      }

      // Normalize
      if (!CATEGORIES.includes(invoiceData.category)) {
        invoiceData.category = 'Other'
      }
      if (invoiceData.date && !/^\d{4}-\d{2}-\d{2}$/.test(invoiceData.date)) {
        invoiceData.date = null
      }

      // Fraud detection
      const fraudResult = detectFraud(invoiceData, existingInvoices)
      const fraudScore = fraudResult.score
      const isDuplicate = fraudResult.alerts.some(a => a.type === 'duplicate')

      const now = new Date().toISOString()
      const itemsWithIds = invoiceData.items.map((item, idx) => ({
        ...item,
        total: item.quantity * item.price,
        id: `item-${Date.now()}-${idx}`,
      }))

      try {
        const invoice = await database.createInvoice({
          fileName: file.fileName,
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

        savedInvoices.push(invoice)
        existingInvoices.push(invoice) // Add for subsequent fraud checks

        // Create high severity fraud alerts
        for (const alert of fraudResult.alerts) {
          if (alert.severity === 'high' || alert.severity === 'critical') {
            await database.createFraudAlert({
              invoiceId: invoice.id,
              type: alert.type,
              description: alert.description,
              severity: alert.severity,
            }).catch(() => {})
          }
        }
      } catch (saveError) {
        failed++
        errors.push(`${file.fileName}: Failed to save — ${(saveError as Error).message}`)
      }
    }

    return NextResponse.json({
      results: savedInvoices,
      failed,
      total: invoiceFiles.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Batch processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process batch. Please try again.' },
      { status: 500 }
    )
  }
}
