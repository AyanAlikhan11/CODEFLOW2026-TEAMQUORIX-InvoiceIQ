import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/database'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Save user message to chat history
    await database.addChatMessage({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    })

    // Get invoice context for the AI
    const invoices = await database.getInvoices()
    const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const recentInvoices = invoices.slice(0, 10)

    const invoiceContext = invoices.length > 0
      ? `Total of ${invoices.length} invoices, total spent: $${totalSpent.toFixed(2)}.\n\nRecent invoices:\n${recentInvoices.map(inv => `- ${inv.merchant}: $${inv.amount.toFixed(2)} (${inv.category}) on ${inv.date || 'unknown date'}`).join('\n')}`
      : 'No invoices uploaded yet.'

    const zai = await ZAI.create()

    // Get previous chat history for context
    const chatHistory = await database.getChatMessages()
    const recentHistory = chatHistory.slice(-10) // Last 10 messages for context

    const systemPrompt = `You are a helpful AI financial assistant integrated into an invoice management app called InvoiceIQ. You help users understand their spending, find patterns, and provide actionable financial advice.

You have access to the user's invoice data:
${invoiceContext}

Guidelines:
- Be concise but helpful (2-4 sentences unless more detail is needed)
- Use **bold** for key terms and amounts
- Be specific with dollar amounts and percentages when discussing data
- Suggest actionable steps when relevant
- If asked about something outside invoice/financial data, politely redirect
- Never make up data that isn't provided in the context
- Use a friendly, professional tone`

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ]

    // Add recent chat history
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content })
    }

    // Add current message (already in history, but ensure it's the last)
    if (recentHistory.length === 0 || recentHistory[recentHistory.length - 1].content !== message) {
      messages.push({ role: 'user', content: message })
    }

    const completion = await zai.chat.completions.create({
      messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
      temperature: 0.7,
      max_tokens: 1000,
    })

    const responseText = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    // Save assistant response to chat history
    await database.addChatMessage({
      role: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString(),
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
