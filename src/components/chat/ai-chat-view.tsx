'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import type { ChatMessage } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, Send, Lightbulb, TrendingUp, Receipt, User, Loader2 } from 'lucide-react'

const QUICK_ACTIONS = [
  { label: 'Summarize spending', icon: TrendingUp, message: 'Summarize my spending patterns' },
  { label: 'Find duplicates', icon: Receipt, message: 'Check duplicate invoices' },
  { label: 'Budget tips', icon: Lightbulb, message: 'Give me budget optimization tips' },
  { label: 'Tax summary', icon: Receipt, message: 'Show tax summary' },
]

function parseMessage(content: string): React.ReactNode[] {
  const parts = content.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
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
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
        <Bot className="h-4 w-4 text-white" />
      </div>

      <div className="glass-card px-4 py-3 rounded-2xl">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    </div>
  )
}

export function AIChatView() {
  const { chatMessages, addChatMessage } = useAppStore()

  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Welcome message
  useEffect(() => {
    if (chatMessages.length === 0) {
      addChatMessage({
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm your AI financial assistant. Ask me anything about your invoices.",
        timestamp: new Date().toISOString(),
      })
    }
  }, [])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isTyping])

  const sendMessage = useCallback(
  async (messageText: string) => {
    if (!messageText.trim() || isTyping) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    }

    addChatMessage(userMessage)
    setInput('')
    setIsTyping(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      })

      const data = await res.json()

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.response || data.error || 'No response',
        timestamp: new Date().toISOString(),
      }

      addChatMessage(aiMessage)
    } catch (err: any) {
      addChatMessage({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Network error. Please try again.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsTyping(false)
    }
  },
  [isTyping, addChatMessage]
)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">

      {/* Messages */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4 max-w-3xl mx-auto">

              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary">
                    {msg.role === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>

                  <div className="glass-card px-4 py-3 rounded-2xl max-w-[80%]">
                    <div className="text-sm whitespace-pre-wrap">
                      {msg.role === 'user'
                        ? msg.content
                        : parseMessage(msg.content)}
                    </div>
                  </div>
                </motion.div>
              ))}

              {isTyping && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your invoices..."
          disabled={isTyping}
        />

        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
        >
          {isTyping ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </div>
    </div>
  )
}