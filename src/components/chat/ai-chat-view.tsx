'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import type { ChatMessage } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  Copy,
  Lightbulb,
  TrendingUp,
  Receipt,
  User,
  Loader2,
} from 'lucide-react'

const QUICK_ACTIONS = [
  { label: 'Summarize my spending', icon: TrendingUp, message: 'Give me a summary of my spending patterns' },
  { label: 'Find duplicates', icon: Copy, message: 'Check for any duplicate invoices in my records' },
  { label: 'Budget tips', icon: Lightbulb, message: 'Give me budget tips based on my spending' },
  { label: 'Tax summary', icon: Receipt, message: 'Provide a tax summary of all my invoices' },
]

function parseMessage(content: string): React.ReactNode[] {
  const parts = content.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part.split('\n').map((line, j) => (
      <span key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </span>
    ))
  })
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="glass-card px-4 py-3 rounded-2xl rounded-tl-sm max-w-[80%]">
        <div className="flex items-center gap-1.5">
          <motion.span
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </div>
  )
}

export function AIChatView() {
  const { chatMessages, addChatMessage, invoices } = useAppStore()
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Add welcome message on first load
  useEffect(() => {
    if (chatMessages.length === 0) {
      addChatMessage({
        id: 'welcome',
        role: 'assistant',
        content:
          "Hi! I'm your AI financial assistant. Ask me anything about your invoices, spending patterns, or financial health.",
        timestamp: new Date().toISOString(),
      })
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isTyping])

  // Build invoice context
  const invoiceContext = useMemo(() => {
    if (invoices.length === 0) return 'No invoices uploaded yet.'
    const total = invoices.reduce((s, i) => s + i.amount, 0)
    const totalTax = invoices.reduce((s, i) => s + i.tax, 0)
    const categoryBreakdown: Record<string, { amount: number; count: number }> = {}
    invoices.forEach((inv) => {
      if (!categoryBreakdown[inv.category])
        categoryBreakdown[inv.category] = { amount: 0, count: 0 }
      categoryBreakdown[inv.category].amount += inv.amount
      categoryBreakdown[inv.category].count++
    })
    const merchants = [...new Set(invoices.map((i) => i.merchant))]

    return `Total invoices: ${invoices.length}
Total spent: ₹${total.toFixed(2)}
Total tax: ₹${totalTax.toFixed(2)}
Average invoice: ₹${total / invoices.length}
Categories: ${Object.entries(categoryBreakdown)
      .map(([k, v]) => `${k} (₹${v.amount.toFixed(2)}, ${v.count} invoices)`)
      .join('; ')}
Merchants: ${merchants.slice(0, 20).join(', ')}
Date range: ${invoices[invoices.length - 1]?.uploadedAt || 'N/A'} to ${invoices[0]?.uploadedAt || 'N/A'}
Duplicate invoices: ${invoices.filter((i) => i.isDuplicate).length}
Flagged invoices: ${invoices.filter((i) => i.status === 'flagged').length}`
  }, [invoices])

  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isTyping) return

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageText.trim(),
        timestamp: new Date().toISOString(),
      }
      addChatMessage(userMessage)
      setInput('')
      setIsTyping(true)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageText.trim(),
            invoiceContext,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: data.response || 'Sorry, I could not process your request.',
            timestamp: new Date().toISOString(),
          }
          addChatMessage(aiMessage)
        } else {
          const errData = await res.json().catch(() => ({}))
          addChatMessage({
            id: `ai-error-${Date.now()}`,
            role: 'assistant',
            content:
              errData.error ||
              'Sorry, something went wrong. Please try again.',
            timestamp: new Date().toISOString(),
          })
        }
      } catch {
        addChatMessage({
          id: `ai-error-${Date.now()}`,
          role: 'assistant',
          content:
            'Network error. Please check your connection and try again.',
          timestamp: new Date().toISOString(),
        })
      } finally {
        setIsTyping(false)
      }
    },
    [isTyping, addChatMessage, invoiceContext]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleQuickAction = (message: string) => {
    sendMessage(message)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
      {/* Messages Area */}
      <Card className="glass-card flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {chatMessages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className={`flex items-start gap-3 ${
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar */}
                  {msg.role === 'assistant' ? (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-foreground" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-purple-600 text-primary-foreground rounded-tr-sm'
                        : 'glass-card rounded-tl-sm'
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.role === 'user'
                        ? msg.content
                        : parseMessage(msg.content)}
                    </div>
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.role === 'user'
                          ? 'text-primary-foreground/60'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isTyping && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Actions & Input */}
      <div className="mt-3 space-y-3 max-w-3xl mx-auto w-full">
        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="secondary"
              size="sm"
              onClick={() => handleQuickAction(action.message)}
              disabled={isTyping}
              className="h-7 text-xs whitespace-nowrap shrink-0 gap-1.5 glass-card hover:bg-secondary/80"
            >
              <action.icon className="h-3 w-3" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="glass-card rounded-2xl p-2 flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me about your invoices..."
            className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 text-sm flex-1 placeholder:text-muted-foreground/50"
            rows={1}
            disabled={isTyping}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className="shrink-0 rounded-xl bg-primary hover:bg-primary/90 h-10 w-10"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
