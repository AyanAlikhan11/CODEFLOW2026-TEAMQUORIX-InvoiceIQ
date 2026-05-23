'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type Invoice } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  FileText,
  ImageIcon,
  X,
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowRight,
  Receipt,
  Tag,
  Calendar,
  DollarSign,
  Percent,
  ShoppingBag,
  Lightbulb,
  AlertCircle,
} from 'lucide-react'

type UploadStep = 'idle' | 'uploading' | 'analyzing' | 'result'

export function UploadView() {
  const { addInvoice, setCurrentView } = useAppStore()
  const [step, setStep] = useState<UploadStep>('idle')
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<Invoice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    if (!f.type.match(/image\/|application\/pdf/)) {
      setError('Please upload a PDF or image file')
      return
    }
    setError(null)
    setFile(f)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => setDragOver(false), [])

  const analyzeInvoice = async () => {
    if (!file) return
    setStep('uploading')
    setError(null)

    try {
      // Upload file to get base64
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Upload failed')
      }
      const uploadData = await uploadRes.json()

      setStep('analyzing')

      // Send to AI analysis
      const analyzeRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadData.fileName,
          imageData: uploadData.imageData,
        }),
      })

      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json().catch(() => ({}))
        throw new Error(errData.error || 'AI analysis failed. Please try a clearer image.')
      }
      const analyzeData = await analyzeRes.json()

      const invoice: Invoice = {
        id: analyzeData.invoice.id,
        fileName: file.name,
        merchant: analyzeData.invoice.merchant,
        amount: analyzeData.invoice.amount,
        date: analyzeData.invoice.date,
        tax: analyzeData.invoice.tax,
        category: analyzeData.invoice.category,
        items: typeof analyzeData.invoice.items === 'string' ? JSON.parse(analyzeData.invoice.items) : analyzeData.invoice.items,
        currency: analyzeData.invoice.currency,
        status: analyzeData.invoice.status,
        createdAt: analyzeData.invoice.createdAt,
        updatedAt: analyzeData.invoice.updatedAt,
      }

      setResult(invoice)
      addInvoice(invoice)
      setStep('result')

      // Get AI recommendations
      try {
        const insightRes = await fetch('/api/insights', { method: 'POST' })
        if (insightRes.ok) {
          const insightData = await insightRes.json()
          setRecommendations(insightData.recommendations || [])
        }
      } catch {
        // Insights are optional
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('idle')
    }
  }

  const reset = () => {
    setStep('idle')
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setRecommendations([])
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'idle' && !file && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`upload-area rounded-2xl p-12 text-center cursor-pointer transition-all ${
                dragOver ? 'drag-over' : ''
              }`}
            >
              <motion.div
                animate={dragOver ? { scale: 1.05, y: -5 } : { scale: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 animate-pulse-glow">
                  <Upload className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Drop your invoice here</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Upload invoices, receipts, or bills in PDF or image format. Our AI will extract and analyze all the details.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" /> PDF</Badge>
                  <Badge variant="secondary" className="gap-1"><ImageIcon className="h-3 w-3" /> PNG</Badge>
                  <Badge variant="secondary" className="gap-1"><ImageIcon className="h-3 w-3" /> JPG</Badge>
                  <Badge variant="secondary" className="gap-1"><ImageIcon className="h-3 w-3" /> WEBP</Badge>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-destructive"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">Try Again</Button>
          </motion.div>
        )}

        {(step === 'idle' || step === 'uploading' || step === 'analyzing') && file && step !== 'result' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      {file.type === 'application/pdf' ? <FileText className="h-6 w-6 text-primary" /> : <ImageIcon className="h-6 w-6 text-primary" />}
                    </div>
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={reset} disabled={step !== 'idle'}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {preview && (
                  <div className="mb-6 rounded-xl overflow-hidden border border-border max-h-64">
                    <img src={preview} alt="Invoice preview" className="w-full h-full object-contain" />
                  </div>
                )}
                <AnimatePresence mode="wait">
                  {step === 'uploading' && (
                    <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8">
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                      <p className="font-medium">Uploading file...</p>
                      <p className="text-sm text-muted-foreground">Preparing your invoice for analysis</p>
                    </motion.div>
                  )}
                  {step === 'analyzing' && (
                    <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                        <Sparkles className="h-8 w-8 text-primary mb-4" />
                      </motion.div>
                      <p className="font-medium">AI is analyzing your invoice</p>
                      <p className="text-sm text-muted-foreground">Extracting merchant details, amounts, and categorizing expenses</p>
                      <div className="mt-4 w-64 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: '90%' }}
                          transition={{ duration: 8, ease: 'easeInOut' }}
                        />
                      </div>
                    </motion.div>
                  )}
                  {step === 'idle' && (
                    <motion.div key="idle-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={analyzeInvoice}
                        className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
                      >
                        <Sparkles className="h-5 w-5" />
                        Analyze with AI
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Success Banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">Invoice analyzed successfully! AI has extracted all key details.</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Extracted Details */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Receipt className="h-5 w-5 text-primary" />
                    Extracted Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DetailRow icon={<Receipt className="h-4 w-4" />} label="Merchant" value={result.merchant} />
                  <DetailRow icon={<DollarSign className="h-4 w-4" />} label="Amount" value={`$${result.amount.toFixed(2)}`} highlight />
                  <DetailRow icon={<Calendar className="h-4 w-4" />} label="Date" value={result.date || 'Not found'} />
                  <DetailRow icon={<Percent className="h-4 w-4" />} label="Tax" value={`$${result.tax.toFixed(2)}`} />
                  <DetailRow icon={<Tag className="h-4 w-4" />} label="Currency" value={result.currency} />
                  <DetailRow icon={<ShoppingBag className="h-4 w-4" />} label="Category" value={
                    <Badge className={`${getCategoryBg(result.category)}`}>{result.category}</Badge>
                  } />
                </CardContent>
              </Card>

              {/* Items */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    Line Items ({result.items?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.items && result.items.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {result.items.map((lineItem, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                        >
                          <div>
                            <p className="text-sm font-medium">{lineItem.name}</p>
                            <p className="text-xs text-muted-foreground">Qty: {lineItem.quantity}</p>
                          </div>
                          <p className="font-medium text-sm">${(lineItem.price * lineItem.quantity).toFixed(2)}</p>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-8">No individual items detected</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Recommendations */}
            {recommendations.length > 0 && (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    AI Financial Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendations.map((rec, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
                      >
                        <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{rec}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={reset}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border hover:bg-accent transition-colors font-medium"
              >
                Analyze Another
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentView('dashboard')}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                View Dashboard
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function DetailRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className={`text-sm font-medium ${highlight ? 'text-lg text-primary' : ''}`}>
        {typeof value === 'string' ? value : value}
      </span>
    </div>
  )
}

function getCategoryBg(category: string): string {
  const map: Record<string, string> = {
    Food: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    Shopping: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    Travel: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    Medical: 'bg-red-500/10 text-red-600 dark:text-red-400',
    Utilities: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    Entertainment: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
    Office: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    Education: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  }
  return map[category] || 'bg-gray-500/10 text-gray-600'
}
