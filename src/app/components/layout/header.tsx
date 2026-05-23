'use client'

import { useAppStore } from '@/store/app-store'
import { motion } from 'framer-motion'
import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

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
  const { currentView, invoices } = useAppStore()

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
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {invoices.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
                {invoices.length}
              </Badge>
            )}
          </motion.button>
        </div>
      </div>
    </motion.header>
  )
}
