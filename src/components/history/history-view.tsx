'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  Trash2,
  Receipt,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
  Utensils,
  ShoppingCart,
  Car,
  Heart,
  Zap,
  GraduationCap,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react'

const categoryConfig: Record<string, { icon: React.ReactNode; bg: string }> = {
  Food: { icon: <Utensils className="h-4 w-4" />, bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  Shopping: { icon: <ShoppingCart className="h-4 w-4" />, bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  Travel: { icon: <Car className="h-4 w-4" />, bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  Medical: { icon: <Heart className="h-4 w-4" />, bg: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  Utilities: { icon: <Zap className="h-4 w-4" />, bg: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  Entertainment: { icon: <Sparkles className="h-4 w-4" />, bg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  Office: { icon: <Receipt className="h-4 w-4" />, bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  Education: { icon: <GraduationCap className="h-4 w-4" />, bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
  Subscription: { icon: <MoreHorizontal className="h-4 w-4" />, bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  Other: { icon: <Receipt className="h-4 w-4" />, bg: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
}

export function HistoryView() {
  const { invoices, setInvoices, removeInvoice } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices')
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices.map((inv: Record<string, unknown>) => ({
          ...inv,
          items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err)
    }
  }, [setInvoices])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const deleteInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
      if (res.ok) removeInvoice(id)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const categories = ['All', ...new Set(invoices.map(inv => inv.category))]
  
  const filtered = invoices.filter(inv => {
    const matchSearch = inv.merchant.toLowerCase().includes(search.toLowerCase()) ||
      inv.fileName.toLowerCase().includes(search.toLowerCase())
    const matchCategory = filterCategory === 'All' || inv.category === filterCategory
    return matchSearch && matchCategory
  })

  const totalFiltered = filtered.reduce((sum, inv) => sum + inv.amount, 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</span>
          <span>|</span>
          <span className="font-semibold text-foreground">₹{totalFiltered.toFixed(2)} total</span>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by merchant or filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {categories.map(cat => (
            <motion.button
              key={cat}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="font-medium">No invoices found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {invoices.length === 0 ? 'Upload your first invoice to get started' : 'Try adjusting your search or filters'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((inv, index) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="card-hover overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${categoryConfig[inv.category]?.bg || 'bg-gray-500/10 text-gray-500'}`}>
                        {categoryConfig[inv.category]?.icon || <Receipt className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{inv.merchant}</p>
                          <Badge variant="secondary" className="text-[10px] shrink-0">{inv.category}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{inv.date || 'No date'}</span>
                          <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{inv.fileName}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-lg">₹{inv.amount.toFixed(2)}</p>
                        {inv.tax > 0 && <p className="text-xs text-muted-foreground">Tax: ₹{inv.tax.toFixed(2)}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                          className="p-2 rounded-lg hover:bg-accent transition-colors"
                        >
                          {expandedId === inv.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteInvoice(inv.id)}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {expandedId === inv.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-border">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Merchant</p>
                                <p className="text-sm font-medium">{inv.merchant}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Amount</p>
                                <p className="text-sm font-medium">{inv.currency} ₹{inv.amount.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Tax</p>
                                <p className="text-sm font-medium">₹{inv.tax.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Category</p>
                                <p className="text-sm font-medium">{inv.category}</p>
                              </div>
                            </div>
                            {inv.items && inv.items.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Line Items</p>
                                <div className="space-y-1.5">
                                  {inv.items.map((lineItem, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-secondary/50">
                                      <span>{lineItem.name} x{lineItem.quantity}</span>
                                      <span className="font-medium">₹{(lineItem.price * lineItem.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
