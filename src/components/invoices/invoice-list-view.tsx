'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import type { Invoice } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  Upload,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Receipt,
  Shield,
  Copy,
  AlertTriangle,
  Tag,
  Calendar,
  IndianRupee,
  Percent,
  XCircle,
  Inbox,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const CATEGORY_ICONS: Record<string, { icon: string; bg: string }> = {
  Food: { icon: '🍔', bg: 'bg-orange-500/15' },
  Shopping: { icon: '🛍️', bg: 'bg-violet-500/15' },
  Travel: { icon: '✈️', bg: 'bg-cyan-500/15' },
  Medical: { icon: '🏥', bg: 'bg-red-500/15' },
  Utilities: { icon: '⚡', bg: 'bg-yellow-500/15' },
  Entertainment: { icon: '🎬', bg: 'bg-pink-500/15' },
  Office: { icon: '💼', bg: 'bg-indigo-500/15' },
  Education: { icon: '📚', bg: 'bg-teal-500/15' },
  Subscription: { icon: '🔄', bg: 'bg-purple-500/15' },
  Groceries: { icon: '🛒', bg: 'bg-green-500/15' },
  Dining: { icon: '🍽️', bg: 'bg-amber-500/15' },
  Rent: { icon: '🏠', bg: 'bg-slate-500/15' },
  Insurance: { icon: '🛡️', bg: 'bg-emerald-500/15' },
  Transport: { icon: '🚗', bg: 'bg-sky-500/15' },
  Other: { icon: '📄', bg: 'bg-gray-500/15' },
}

function getStatusBadge(status: Invoice['status']) {
  const map: Record<
    Invoice['status'],
    { label: string; className: string }
  > = {
    completed: {
      label: 'Completed',
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    flagged: {
      label: 'Flagged',
      className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    },
    duplicate: {
      label: 'Duplicate',
      className: 'bg-red-500/10 text-red-600 dark:text-red-400',
    },
    processing: {
      label: 'Processing',
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
  }
  const { label, className } = map[status] || map.processing
  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  )
}

function FraudScoreBar({ score }: { score: number }) {
  if (score <= 0) return null
  const color =
    score > 70
      ? 'bg-red-500'
      : score > 40
      ? 'bg-orange-500'
      : score > 20
      ? 'bg-yellow-500'
      : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs text-muted-foreground">{score.toFixed(0)}</span>
    </div>
  )
}

function InvoiceCard({
  invoice,
  onDelete,
}: {
  invoice: Invoice
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const catInfo = CATEGORY_ICONS[invoice.category] || CATEGORY_ICONS.Other

  return (
    <Card className="glass-card-hover overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Category Icon */}
          <div
            className={`w-11 h-11 rounded-xl ${catInfo.bg} flex items-center justify-center text-lg shrink-0`}
          >
            {catInfo.icon}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {invoice.merchant}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {invoice.date
                      ? new Date(invoice.date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'No date'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {invoice.fileName}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="text-right shrink-0">
                <p className="font-bold text-lg">
                  {invoice.currency === 'INR' ? '₹' : '$'}
                  {invoice.amount.toFixed(2)}
                </p>
                {invoice.tax > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Tax: {invoice.currency === 'INR' ? '₹' : '$'}
                    {invoice.tax.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Badges Row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {invoice.category}
              </Badge>
              {getStatusBadge(invoice.status)}
              <FraudScoreBar score={invoice.fraudScore} />
              <span className="text-xs text-muted-foreground ml-auto">
                {invoice.confidence.toFixed(0)}% confidence
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="text-xs gap-1"
              >
                {expanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {expanded ? 'Hide Details' : 'View Details'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(invoice.id)}
                className="text-xs text-destructive hover:text-destructive gap-1 ml-auto"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                    {/* Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <DetailItem
                        icon={<Receipt className="h-3.5 w-3.5" />}
                        label="Merchant"
                        value={invoice.merchant}
                      />
                      <DetailItem
                        icon={<Calendar className="h-3.5 w-3.5" />}
                        label="Date"
                        value={invoice.date || 'N/A'}
                      />
                      <DetailItem
                        icon={<IndianRupee className="h-3.5 w-3.5" />}
                        label="Amount"
                        value={`${invoice.currency} ${invoice.amount.toFixed(2)}`}
                      />
                      <DetailItem
                        icon={<Percent className="h-3.5 w-3.5" />}
                        label="Tax"
                        value={`${invoice.currency} ${invoice.tax.toFixed(2)}`}
                      />
                      {invoice.gstAmount > 0 && (
                        <DetailItem
                          icon={<IndianRupee className="h-3.5 w-3.5" />}
                          label="GST"
                          value={`${invoice.gstAmount.toFixed(2)} (${invoice.gstRate}%)`}
                        />
                      )}
                      <DetailItem
                        icon={<Tag className="h-3.5 w-3.5" />}
                        label="Category"
                        value={invoice.category}
                      />
                      <DetailItem
                        icon={<Shield className="h-3.5 w-3.5" />}
                        label="Fraud Score"
                        value={`${invoice.fraudScore.toFixed(0)}/100`}
                      />
                      <DetailItem
                        icon={<Copy className="h-3.5 w-3.5" />}
                        label="Duplicate"
                        value={invoice.isDuplicate ? 'Yes' : 'No'}
                      />
                    </div>

                    {/* Line Items Table */}
                    {invoice.items && invoice.items.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                          Line Items
                        </h4>
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Item</TableHead>
                                <TableHead className="text-xs text-center">
                                  Qty
                                </TableHead>
                                <TableHead className="text-xs text-center">
                                  Price
                                </TableHead>
                                <TableHead className="text-xs text-right">
                                  Total
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoice.items.map((item, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-xs py-2">
                                    {item.name}
                                  </TableCell>
                                  <TableCell className="text-xs text-center py-2">
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className="text-xs text-center py-2">
                                    ₹{item.price.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-xs text-right py-2 font-medium">
                                    ₹{(item.price * item.quantity).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* OCR Text Preview */}
                    {invoice.ocrText && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                          OCR Text
                        </h4>
                        <div className="p-3 rounded-lg bg-secondary/50 max-h-32 overflow-y-auto">
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {invoice.ocrText.length > 500
                              ? invoice.ocrText.slice(0, 500) + '...'
                              : invoice.ocrText}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

export function InvoiceListView() {
  const { invoices, setInvoices, removeInvoice, setCurrentView } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/invoices')
        if (res.ok) {
          const data = await res.json()
          setInvoices(data.invoices || [])
        }
      } catch (err) {
        console.error('Failed to fetch invoices:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchInvoices()
  }, [setInvoices])

  const categories = useMemo(() => {
    const cats = new Set(invoices.map((inv) => inv.category))
    return Array.from(cats).sort()
  }, [invoices])

  const filteredInvoices = useMemo(() => {
    let result = invoices

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (inv) =>
          inv.merchant.toLowerCase().includes(q) ||
          inv.fileName.toLowerCase().includes(q) ||
          inv.category.toLowerCase().includes(q)
      )
    }

    if (selectedCategory) {
      result = result.filter((inv) => inv.category === selectedCategory)
    }

    return result
  }, [invoices, searchQuery, selectedCategory])

  const totalAmount = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    [filteredInvoices]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting(id)
      try {
        const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
        if (res.ok) {
          removeInvoice(id)
        }
      } catch (err) {
        console.error('Failed to delete invoice:', err)
      } finally {
        setDeleting(null)
      }
    },
    [removeInvoice]
  )

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-secondary animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
                  <div className="h-3 w-48 bg-secondary rounded animate-pulse" />
                </div>
                <div className="h-6 w-20 bg-secondary rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices by merchant, file name, or category..."
            className="pl-9 glass-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Buttons */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="h-7 text-xs"
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'secondary'}
              size="sm"
              onClick={() =>
                setSelectedCategory(selectedCategory === cat ? null : cat)
              }
              className="h-7 text-xs"
            >
              {CATEGORY_ICONS[cat]?.icon} {cat}
            </Button>
          ))}
        </div>
      )}

      {/* Summary Bar */}
      {invoices.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl glass-card">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {filteredInvoices.length}
              </span>{' '}
              invoice{filteredInvoices.length !== 1 ? 's' : ''}
            </span>
            {selectedCategory && (
              <span className="text-xs text-muted-foreground">
                filtered by{' '}
                <Badge variant="secondary" className="text-xs ml-1">
                  {selectedCategory}
                </Badge>
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="font-bold text-lg gradient-text">
              ₹
              {totalAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      )}

      {/* Invoice List */}
      {filteredInvoices.length > 0 ? (
        <div className="space-y-3">
          {filteredInvoices.map((invoice, index) => (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.3) }}
            >
              <InvoiceCard
                invoice={invoice}
                onDelete={handleDelete}
              />
            </motion.div>
          ))}
        </div>
      ) : invoices.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No matches found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting your search or filter criteria.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory(null)
            }}
          >
            Clear Filters
          </Button>
        </motion.div>
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6"
          >
            <Inbox className="h-10 w-10 text-primary" />
          </motion.div>
          <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Upload your first invoice to get started with AI-powered expense
            tracking and analysis.
          </p>
          <Button
            onClick={() => setCurrentView('upload')}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Your First Invoice
          </Button>
        </motion.div>
      )}

      {/* Deleting Overlay */}
      <AnimatePresence>
        {deleting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <Card className="glass-card p-6">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </motion.div>
                <span className="text-sm">Deleting invoice...</span>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
