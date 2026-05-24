import { NextResponse } from 'next/server'
import { database } from '@/lib/database'
import { detectFraud, invoiceToInvoiceData } from '@/lib/ai-enhanced'

export async function GET() {
  try {
    const alerts = await database.getFraudAlerts()
    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Failed to fetch fraud alerts:', error)
    return NextResponse.json({ alerts: [] }, { status: 200 })
  }
}

export async function POST() {
  try {
    const invoices = await database.getInvoices()

    if (invoices.length < 2) {
      return NextResponse.json({ alerts: [], newAlerts: [] })
    }

    const existingAlerts = await database.getFraudAlerts()
    const existingKeys = new Set(
      existingAlerts.map(a => `${a.invoiceId}:${a.type}`)
    )

    const newAlerts: Array<{
      invoiceId: string
      type: string
      description: string
      severity: string
    }> = []

    const now = new Date().toISOString()

    // Enhanced fraud detection using AI-enhanced service
    for (const invoice of invoices) {
      const invoiceData = invoiceToInvoiceData(invoice)
      const fraudResult = detectFraud(invoiceData, invoices.map(inv => invoiceToInvoiceData(inv)))

      for (const alert of fraudResult.alerts) {
        const key = `${invoice.id}:${alert.type}`

        if (!existingKeys.has(key) && !newAlerts.find(a => a.invoiceId === invoice.id && a.type === alert.type)) {
          newAlerts.push({
            invoiceId: invoice.id,
            type: alert.type,
            description: alert.description,
            severity: alert.severity,
          })
        }
      }
    }

    // Save new alerts to database
    if (newAlerts.length > 0) {
      await database.createFraudAlerts(newAlerts)
    }

    // Fetch all alerts including new ones
    const allAlerts = await database.getFraudAlerts()

    return NextResponse.json({
      alerts: allAlerts,
      newAlerts: newAlerts.map((a, idx) => ({
        id: `new-${idx}`,
        invoiceId: a.invoiceId,
        type: a.type,
        description: a.description,
        severity: a.severity,
        createdAt: now,
        resolved: false,
      })),
    })
  } catch (error) {
    console.error('Fraud detection error:', error)
    return NextResponse.json(
      { error: 'Failed to run fraud detection' },
      { status: 500 }
    )
  }
}
