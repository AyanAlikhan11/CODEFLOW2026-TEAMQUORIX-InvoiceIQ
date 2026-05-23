'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/app-store'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { UploadView } from '@/components/upload/upload-view'
import { HistoryView } from '@/components/history/history-view'
import { InsightsView } from '@/components/insights/insights-view'
import { motion, AnimatePresence } from 'framer-motion'

const views = {
  dashboard: DashboardView,
  upload: UploadView,
  history: HistoryView,
  insights: InsightsView,
}

export default function HomePage() {
  const { currentView, sidebarOpen, setInvoices } = useAppStore()

  useEffect(() => {
    // Load invoices from database on mount
    async function loadInvoices() {
      try {
        const res = await fetch('/api/invoices')
        if (res.ok) {
          const data = await res.json()
          setInvoices(
            data.invoices.map((inv: Record<string, unknown>) => ({
              ...inv,
              items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items,
            }))
          )
        }
      } catch (err) {
        console.error('Failed to load invoices:', err)
      }
    }
    loadInvoices()
  }, [setInvoices])

  const CurrentViewComponent = views[currentView]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <motion.div
        animate={{ marginLeft: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-screen flex flex-col"
      >
        <Header />
        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <CurrentViewComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>
    </div>
  )
}
