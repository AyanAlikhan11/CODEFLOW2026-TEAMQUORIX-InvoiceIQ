import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAuth, getFirebaseDb, getFirebaseApp } from '@/lib/firebase'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
import { getTextModel } from '@/lib/gemini'

// Helper: get authenticated user UID from session cookie
async function getAuthUid(): Promise<string | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')?.value
  if (!sessionToken) return null
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null
  const auth = getAuth(firebaseApp)
  try {
    const decoded = await auth.verifySessionCookie(sessionToken, true)
    return decoded.uid
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await getAuthUid()
    if (!uid) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { message } = await request.json()
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 })
    }

    const firestore = getFirestore(firebaseApp)
    const chatRef = firestore.collection('users').doc(uid).collection('chat_messages')

    // Save user message
    const userMsgId = `${Date.now()}-user`
    await chatRef.doc(userMsgId).set({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })

    // Get invoice context for the AI (user-scoped)
    const invoicesSnap = await firestore
      .collection('users').doc(uid).collection('invoices')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    const invoices = invoicesSnap.docs.map(doc => {
      const d = doc.data()
      return { merchant: d.merchant || 'Unknown', amount: Number(d.amount) || 0, category: d.category || 'Other', date: d.date || 'unknown' }
    })
    const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const recentInvoices = invoices.slice(0, 10)

    const invoiceContext = invoices.length > 0
      ? `Total of ${invoices.length} invoices, total spent: ₹${totalSpent.toFixed(2)}.\n\nRecent invoices:\n${recentInvoices.map(inv => `- ${inv.merchant}: ₹${inv.amount.toFixed(2)} (${inv.category}) on ${inv.date}`).join('\n')}`
      : 'No invoices uploaded yet.'

    // Get previous chat history (last 10 messages)
    const historySnap = await chatRef
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()
    const recentHistory = historySnap.docs
      .sort((a, b) => (a.data().createdAt as string).localeCompare(b.data().createdAt as string))
      .map(doc => ({ role: doc.data().role, content: doc.data().content }))

    // Build Gemini chat with history
    const model = getTextModel('gemini-2.5-flash')
    const chat = model.startChat({
      history: recentHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    })

    const systemPrompt = `You are a helpful AI financial assistant integrated into an invoice management app called InvoiceIQ. You help users understand their spending, find patterns, and provide actionable financial advice.

You have access to the user's invoice data:
${invoiceContext}

Guidelines:
- Be concise but helpful (2-4 sentences unless more detail is needed)
- Use **bold** for key terms and amounts
- Be specific with rupee amounts and percentages when discussing data
- Suggest actionable steps when relevant
- If asked about something outside invoice/financial data, politely redirect
- Never make up data that isn't provided in the context
- Use a friendly, professional tone`

    const prompt = `${systemPrompt}\n\nUser message: ${message}`
    const result = await chat.sendMessage(prompt)
    const responseText = result.response.text() || 'Sorry, I could not generate a response.'

    // Save assistant response
    const aiMsgId = `${Date.now()}-assistant`
    await chatRef.doc(aiMsgId).set({
      role: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ response: responseText })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response. Please try again.' },
      { status: 500 }
    )
  }
}

// GET: retrieve chat history for the authenticated user
export async function GET() {
  try {
    const uid = await getAuthUid()
    if (!uid) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 })
    }

    const firestore = getFirestore(firebaseApp)
    const historySnap = await firestore
      .collection('users').doc(uid).collection('chat_messages')
      .orderBy('createdAt', 'asc')
      .get()

    const messages = historySnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp || data.createdAt,
      }
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Chat history error:', error)
    return NextResponse.json({ error: 'Failed to load chat history' }, { status: 500 })
  }
}
