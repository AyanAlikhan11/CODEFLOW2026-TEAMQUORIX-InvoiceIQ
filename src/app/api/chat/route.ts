import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseApp } from '@/lib/firebase'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

// ✅ Groq Client (OpenAI compatible)
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: 'https://api.groq.com/openai/v1',
})

// ✅ Auth helper
async function getAuthUid(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value
    if (!sessionToken) return null

    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) return null

    const auth = getAuth(firebaseApp)
    const decoded = await auth.verifySessionCookie(sessionToken, true)

    return decoded.uid
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY missing in .env.local' },
        { status: 500 }
      )
    }

    const uid = await getAuthUid()
    if (!uid) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { message } = await request.json()
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 500 }
      )
    }

    const firestore = getFirestore(firebaseApp)
    const chatRef = firestore
      .collection('users')
      .doc(uid)
      .collection('chat_messages')

    // ✅ Save user message
    await chatRef.doc(`${Date.now()}-user`).set({
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    })

    // ✅ Fetch invoices
    let invoiceContext = 'No invoices uploaded yet.'

    try {
      const invoicesSnap = await firestore
        .collection('users')
        .doc(uid)
        .collection('invoices')
        .limit(20)
        .get()

      const invoices = invoicesSnap.docs.map(doc => {
        const d = doc.data()
        return {
          merchant: d.merchant || d.vendor || 'Unknown',
          amount: Number(d.amount) || Number(d.total) || 0,
          category: d.category || 'Other',
          date: d.date || d.invoiceDate || 'unknown',
        }
      })

      if (invoices.length > 0) {
        const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0)

        invoiceContext = `
Total invoices: ${invoices.length}
Total spent: ₹${totalSpent.toFixed(2)}

Recent invoices:
${invoices
  .slice(0, 10)
  .map(
    inv =>
      `- ${inv.merchant}: ₹${inv.amount.toFixed(
        2
      )} (${inv.category}) on ${inv.date}`
  )
  .join('\n')}
`
      }
    } catch {
      // continue without invoice context
    }

    const systemPrompt = `
You are InvoiceIQ AI — a smart financial assistant.

User invoice data:
${invoiceContext}

Rules:
- Be concise (2–4 lines)
- Use **bold** for numbers
- Give actionable advice
- Never invent data
- Stay finance-focused
`

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: message },
    ]

    // ✅ Updated Working Groq Model
    const completion = await client.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: message,
    },
  ],
  temperature: 0.7,
  max_tokens: 500,
})

    const responseText =
      completion.choices?.[0]?.message?.content ||
      'Sorry, I could not generate a response.'

    // ✅ Save assistant message
    await chatRef.doc(`${Date.now()}-assistant`).set({
      role: 'assistant',
      content: responseText,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ response: responseText })
  } catch (error: any) {
    console.error('Groq error:', error)

    return NextResponse.json(
      { error: error?.message || 'AI generation failed' },
      { status: 500 }
    )
  }
}