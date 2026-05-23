'use client'

import { useAppStore } from '@/store/app-store'
import { motion } from 'framer-motion'
import { Bell, Search, Receipt, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'

const viewTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  upload: 'Upload & Analyze',
  history: 'Invoice History',
  insights: 'AI Insights',
}

const viewDescriptions: Record<string, string> = {
  dashboard: 'Overview of your financial data and spending patterns',
  upload: 'Upload invoices, receipts, or bills for AI analysis',
  history: 'View and manage all your processed invoices',
  insights: 'AI-powered financial recommendations and observations',
}

export function Header() {
  const { currentView, invoices, setCurrentView } = useAppStore()
  const [showNotifications, setShowNotifications] = useState(false)

  const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0)

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <motion.h1 
            key={currentView}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="text-2xl font-bold tracking-tight"
          >
            {viewTitles[currentView]}
          </motion.h1>
          <motion.p 
            key={`desc-${currentView}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-sm text-muted-foreground mt-0.5"
          >
            {viewDescriptions[currentView]}
          </motion.p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search invoices..." 
              className="pl-9 w-64 bg-secondary/50 border-0 focus-visible:ring-1"
            />
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {invoices.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
                  {invoices.length}
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
                      onClick={() => { setShowNotifications(false); setCurrentView('history') }}
                      className="text-xs text-primary hover:underline"
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
                          className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => { setShowNotifications(false); setCurrentView('history') }}
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Receipt className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{inv.merchant}</p>
                            <p className="text-xs text-muted-foreground">
                              {inv.category} &middot; {inv.date || 'No date'}
                            </p>
                          </div>
                          <span className="text-sm font-semibold shrink-0">${inv.amount.toFixed(2)}</span>
                        </motion.div>
                      ))
                    )}
                  </div>
                  {invoices.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-border bg-secondary/30">
                      <p className="text-xs text-muted-foreground text-center">
                        {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} processed &middot; Total: ${totalSpent.toFixed(2)}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </motion.header>
  )
}
