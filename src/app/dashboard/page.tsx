'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useAppStore, type ViewType } from '@/store/app-store'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { ErrorBoundary } from '@/components/error-boundary'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2 } from 'lucide-react'

// View components
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { UploadView } from '@/components/upload/upload-view'
import { InvoiceListView } from '@/components/invoices/invoice-list-view'
import { AnalyticsView } from '@/components/analytics/analytics-view'
import { PredictionsView } from '@/components/predictions/predictions-view'
import { AIChatView } from '@/components/chat/ai-chat-view'
import { BudgetView } from '@/components/budget/budget-view'

// Placeholder for views not yet created
function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
          <Sparkles className="h-8 w-8 text-purple-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground">Coming soon...</p>
      </div>
    </div>
  )
}

const views: Record<ViewType, React.ComponentType> = {
  dashboard: DashboardView,
  upload: UploadView,
  invoices: InvoiceListView,
  analytics: AnalyticsView,
  predictions: PredictionsView,
  chat: AIChatView,
  budget: BudgetView,
  settings: () => <PlaceholderView title="Settings" />,
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { currentView, sidebarCollapsed, setInvoices } = useAppStore()

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load invoices
  useEffect(() => {
    if (user) {
      async function loadInvoices() {
        try {
          const res = await fetch('/api/invoices')
          if (res.ok) {
            const data = await res.json()
            setInvoices(
              (data.invoices ?? []).map((inv: Record<string, unknown>) => ({
                ...inv,
                items:
                  typeof inv.items === 'string'
                    ? JSON.parse(inv.items)
                    : inv.items,
              }))
            )
          }
        } catch (err) {
          console.error('Failed to load invoices:', err)
        }
      }
      loadInvoices()
    }
  }, [setInvoices, user])

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const CurrentViewComponent = views[currentView]

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background bg-grid">
        <Sidebar />
        <motion.div
          animate={{ marginLeft: sidebarCollapsed ? 72 : 260 }}
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
    </ErrorBoundary>
  )
}
