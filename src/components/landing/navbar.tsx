'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from 'next-themes'
import { Receipt, Menu, X, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

export function LandingNavbar() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration guard for theme toggle
    setMounted(true)
  }, [])

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
  ]

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
              invoice<span className="text-purple-600 dark:text-purple-400">IQ</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                {link.label}
              </a>
            ))}

            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-gray-300" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-600" />
                )}
              </button>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {user.name}
                </span>
                <Link href="/dashboard">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
                    Dashboard
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="rounded-lg border-gray-200 dark:border-gray-700"
                  onClick={logout}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="rounded-lg border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg shadow-purple-600/25">
                    Get Started Free
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {mobileOpen ? <X className="h-5 w-5 dark:text-gray-300" /> : <Menu className="h-5 w-5 dark:text-gray-300" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}

              {/* Mobile Theme Toggle */}
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center gap-2 w-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="h-4 w-4" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" />
                      Dark Mode
                    </>
                  )}
                </button>
              )}

              <hr className="border-gray-100 dark:border-gray-800" />
              {user ? (
                <div className="space-y-2">
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full rounded-lg border-gray-200 dark:border-gray-700"
                    onClick={() => { setMobileOpen(false); logout() }}
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="outline"
                      className="w-full rounded-lg border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
                      Get Started Free
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
