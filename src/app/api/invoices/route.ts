import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

export async function GET() {
  try {
    const invoices = await db.invoice.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileName, imageData } = body

    if (!imageData) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 })
    }

    const zai = await ZAI.create()

    const completion = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageData,
              },
            },
            {
              type: 'text',
              text: `You are an expert invoice and receipt analyzer. Extract all information from this invoice image.

Return ONLY valid JSON with these fields (no markdown, no code blocks, just raw JSON):
- merchant: The business/store/merchant name (string)
- amount: Total amount as a number (no currency symbol)
- date: Invoice date in YYYY-MM-DD format (string or null)
- tax: Tax amount as a number (0 if not found)
- currency: Currency code like USD, EUR, GBP, INR (string)
- items: Array of objects, each with name (string), quantity (number), price (number)
- category: One of exactly: Food, Shopping, Travel, Medical, Utilities, Entertainment, Office, Education, Subscription, Other

Example JSON:
{"merchant":"Walmart","amount":45.67,"date":"2025-01-15","tax":3.82,"currency":"USD","items":[{"name":"Milk","quantity":2,"price":3.49},{"name":"Bread","quantity":1,"price":2.99}],"category":"Food"}

If you cannot determine a field, use null for strings and 0 for numbers.`,
            },
          ],
        },
      ],
    })

    let extractedData
    const content = completion.choices?.[0]?.message?.content || ''

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found')
      }
    } catch {
      extractedData = {
        merchant: 'Unknown Merchant',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        tax: 0,
        currency: 'USD',
        items: [],
        category: 'Other',
      }
    }

    // Validate and sanitize extracted data
    const sanitizedData = {
      merchant: String(extractedData.merchant || 'Unknown Merchant').substring(0, 200),
      amount: Math.max(0, parseFloat(extractedData.amount) || 0),
      date: extractedData.date || null,
      tax: Math.max(0, parseFloat(extractedData.tax) || 0),
      category: validateCategory(extractedData.category),
      items: validateItems(extractedData.items),
      currency: validateCurrency(extractedData.currency),
    }

    const invoice = await db.invoice.create({
      data: {
        fileName: fileName || 'uploaded-invoice',
        merchant: sanitizedData.merchant,
        amount: sanitizedData.amount,
        date: sanitizedData.date,
        tax: sanitizedData.tax,
        category: sanitizedData.category,
        items: JSON.stringify(sanitizedData.items),
        currency: sanitizedData.currency,
        status: 'processed',
      },
    })

    return NextResponse.json({ invoice, extractedData: sanitizedData })
  } catch (error) {
    console.error('Error analyzing invoice:', error)
    const message = error instanceof Error ? error.message : 'Failed to analyze invoice'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function validateCategory(cat: unknown): string {
  const valid = ['Food', 'Shopping', 'Travel', 'Medical', 'Utilities', 'Entertainment', 'Office', 'Education', 'Subscription', 'Other']
  if (typeof cat === 'string' && valid.includes(cat)) return cat
  return 'Other'
}

function validateCurrency(cur: unknown): string {
  if (typeof cur === 'string' && cur.match(/^[A-Z]{3}$/)) return cur
  return 'USD'
}

function validateItems(items: unknown): { name: string; quantity: number; price: number }[] {
  if (!Array.isArray(items)) return []
  return items.slice(0, 50).map((item: unknown) => {
    if (typeof item !== 'object' || item === null) return null
    const obj = item as Record<string, unknown>
    return {
      name: String(obj.name || 'Unknown Item').substring(0, 200),
      quantity: Math.max(1, parseInt(String(obj.quantity)) || 1),
      price: Math.max(0, parseFloat(String(obj.price)) || 0),
    }
  }).filter(Boolean) as { name: string; quantity: number; price: number }[]
}
