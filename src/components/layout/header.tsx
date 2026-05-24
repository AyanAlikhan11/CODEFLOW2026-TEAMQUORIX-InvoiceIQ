'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Search, MessageCircle, X, Receipt } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const viewInfo: Record<string, { title: string; description: string }> = {
  dashboard: {
    title: 'Dashboard',
    description: 'Financial overview and AI insights',
  },
  upload: {
    title: 'Upload & Scan',
    description: 'Upload invoices for AI analysis',
  },
  invoices: {
    title: 'Invoices',
    description: 'Manage and review all invoices',
  },
  analytics: {
    title: 'Analytics',
    description: 'Deep financial analytics',
  },
  predictions: {
    title: 'Predictions',
    description: 'AI spending predictions',
  },
  chat: {
    title: 'AI Assistant',
    description: 'Ask questions about your finances',
  },
  budget: {
    title: 'Budget',
    description: 'Set and track budgets',
  },
  settings: {
    title: 'Settings',
    description: 'Application settings',
  },
}

export function Header() {
  const {
    currentView,
    invoices,
    fraudAlerts,
    setCurrentView,
    setIsChatOpen,
  } = useAppStore()
  const [showNotifications, setShowNotifications] = useState(false)

  const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0)

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 glass-header"
      >
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left — Dynamic title */}
          <div>
            <motion.h1
              key={currentView}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold tracking-tight"
            >
              {viewInfo[currentView]?.title ?? 'Dashboard'}
            </motion.h1>
            <motion.p
              key={`desc-${currentView}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-sm text-muted-foreground mt-0.5"
            >
              {viewInfo[currentView]?.description ?? ''}
            </motion.p>
          </div>

          {/* Right — Actions */}
          <div className="flex items-center gap-3">
            {/* Search (hidden on mobile) */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                className="pl-9 w-64 bg-secondary/50 border-border focus-visible:ring-purple-500/50"
              />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-accent/10 transition-colors"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {fraudAlerts.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-purple-500 text-white rounded-full">
                    {fraudAlerts.length}
                  </Badge>
                )}
              </motion.button>

              {/* Notification Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-80 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <h3 className="text-sm font-semibold">Notifications</h3>
                      <button
                        onClick={() => {
                          setShowNotifications(false)
                          setCurrentView('invoices')
                        }}
                        className="text-xs text-purple-400 hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {invoices.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground text-sm">
                          No invoices yet
                        </div>
                      ) : (
                        invoices.slice(0, 5).map((inv) => (
                          <motion.div
                            key={inv.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-accent/10 transition-colors cursor-pointer"
                            onClick={() => {
                              setShowNotifications(false)
                              setCurrentView('invoices')
                            }}
                          >
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                              <Receipt className="h-4 w-4 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {inv.merchant}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {inv.category} &middot;{' '}
                                {inv.date || 'No date'}
                              </p>
                            </div>
                            <span className="text-sm font-semibold shrink-0">
                              ${inv.amount.toFixed(2)}
                            </span>
                          </motion.div>
                        ))
                      )}
                    </div>
                    {invoices.length > 0 && (
                      <div className="px-4 py-2.5 border-t border-border bg-secondary/30">
                        <p className="text-xs text-muted-foreground text-center">
                          {invoices.length} invoice
                          {invoices.length !== 1 ? 's' : ''} processed
                          &middot; Total: ${totalSpent.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chat Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setCurrentView('chat')
                setIsChatOpen(true)
              }}
              className="relative p-2 rounded-lg hover:bg-accent/10 transition-colors"
            >
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </>
  )
}
