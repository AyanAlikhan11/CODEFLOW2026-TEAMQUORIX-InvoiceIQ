'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type ViewType } from '@/store/app-store'
import {
  LayoutDashboard,
  Upload,
  History,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useEffect, useState } from 'react'

const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: 'upload', label: 'Upload & Analyze', icon: <Upload className="h-5 w-5" /> },
  { id: 'history', label: 'Invoice History', icon: <History className="h-5 w-5" /> },
  { id: 'insights', label: 'AI Insights', icon: <Lightbulb className="h-5 w-5" /> },
]

export function Sidebar() {
  const { currentView, setCurrentView, sidebarOpen, setSidebarOpen } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration guard for theme toggle
    setMounted(true)
  }, [])

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed left-0 top-0 h-screen z-40 flex flex-col border-r border-border bg-sidebar"
      >
        {/* Logo */}
        <motion.div 
          className="flex items-center gap-3 px-4 h-16 border-b border-border cursor-pointer"
          onClick={() => setCurrentView('dashboard')}
          whileHover={{ opacity: 0.8 }}
          whileTap={{ opacity: 0.6 }}
          title="Go to Dashboard"
        >
          <motion.div 
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground shrink-0"
            whileHover={{ rotate: 10, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Receipt className="h-5 w-5" />
          </motion.div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="text-lg font-bold tracking-tight">
                  <span className="gradient-text">InvoiceAI</span>
                </h1>
                <p className="text-[10px] text-muted-foreground -mt-1">Smart Analyzer</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative
                      ${isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className={`shrink-0 ${isActive ? 'text-primary' : ''}`}>{item.icon}</span>
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="overflow-hidden whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isActive && sidebarOpen && (
                      <Sparkles className="h-3.5 w-3.5 ml-auto text-primary" />
                    )}
                  </motion.button>
                </TooltipTrigger>
                {!sidebarOpen && (
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 pb-4 space-y-2 border-t border-border pt-4">
          {mounted && (
            <motion.button
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}
          <motion.button
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="h-5 w-5 shrink-0" /> : <ChevronRight className="h-5 w-5 shrink-0" />}
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.aside>
    </TooltipProvider>
  )
}
