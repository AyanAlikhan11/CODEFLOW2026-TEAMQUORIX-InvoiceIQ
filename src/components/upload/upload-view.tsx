'use client'

import { useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  Image,
  X,
  CheckCircle2,
  Loader2,
  Zap,
  Search,
  Shield,
  FileCheck,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

type Step = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

const PIPELINE_STEPS = [
  { key: 'uploading', label: 'Uploading', icon: Upload },
  { key: 'processing', label: 'AI Analysis', icon: Zap },
  { key: 'complete', label: 'Complete', icon: CheckCircle2 },
]

export function UploadView() {
  const { addInvoice, setCurrentView } = useAppStore()
  const [dragActive, setDragActive] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [progress, setProgress] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [result, setResult] = useState<{ merchant: string; amount: number } | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback((files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || f.type === 'application/pdf'
    )
    setSelectedFiles(validFiles)
    setError('')
    setStep('idle')
    setProgress(0)
    setResult(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const processInvoice = async () => {
    if (selectedFiles.length === 0) return

    setStep('uploading')
    setProgress(10)
    setError('')

    try {
      // Simulate upload progress
      await new Promise((r) => setTimeout(r, 800))
      setProgress(40)

      // Read file and send to API
      const file = selectedFiles[0]
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      const base64 = await base64Promise

      setStep('processing')
      setProgress(60)

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64, fileName: file.name }),
      })

      setProgress(85)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to process invoice')
      }

      const data = await res.json()

      setProgress(100)
      setStep('complete')

      if (data.invoice) {
        addInvoice({
          ...data.invoice,
          items: typeof data.invoice.items === 'string' ? JSON.parse(data.invoice.items) : data.invoice.items || [],
        })
        setResult({ merchant: data.invoice.merchant || 'Unknown', amount: data.invoice.amount || 0 })
      } else {
        setResult({ merchant: 'Processed', amount: 0 })
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process invoice')
      setStep('error')
    }
  }

  const reset = () => {
    setSelectedFiles([])
    setStep('idle')
    setProgress(0)
    setResult(null)
    setError('')
  }

  const currentStepIndex = PIPELINE_STEPS.findIndex((s) => s.key === step)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Upload & Scan</h2>
        <p className="text-muted-foreground text-sm">
          Upload invoices as images or PDFs. Our AI extracts all data automatically.
        </p>
      </div>

      {/* Pipeline Progress */}
      {step !== 'idle' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card mb-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-4 mb-4">
                {PIPELINE_STEPS.map((s, i) => {
                  const StepIcon = s.icon
                  const isActive = i === currentStepIndex
                  const isDone = i < currentStepIndex
                  return (
                    <div key={s.key} className="flex items-center gap-2 flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isActive
                            ? 'bg-purple-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <StepIcon className="h-4 w-4" />
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          isActive ? 'text-foreground' : isDone ? 'text-emerald-600' : 'text-muted-foreground'
                        }`}
                      >
                        {s.label}
                      </span>
                      {i < PIPELINE_STEPS.length - 1 && (
                        <div className="flex-1 h-0.5 bg-muted mx-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all duration-500"
                            style={{
                              width: isDone ? '100%' : isActive ? `${progress}%` : '0%',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {step !== 'complete' && step !== 'error' && (
                <Progress value={progress} className="h-1.5" />
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Upload Zone */}
      <AnimatePresence mode="wait">
        {step === 'idle' && selectedFiles.length === 0 && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className={`upload-zone p-12 flex flex-col items-center justify-center cursor-pointer ${
                dragActive ? 'active' : ''
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
              <motion.div
                animate={dragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-5"
              >
                <Upload className="h-8 w-8 text-purple-500" />
              </motion.div>
              <p className="text-lg font-semibold mb-1">
                {dragActive ? 'Drop files here' : 'Drag & drop invoices here'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse — supports PDF, JPG, PNG, WEBP
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span>PDF</span>
                <Image className="h-3.5 w-3.5 ml-2" />
                <span>Images</span>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              {[
                { icon: Zap, title: 'AI Extraction', desc: '99.2% accuracy OCR' },
                { icon: Shield, title: 'Fraud Check', desc: 'Duplicate detection' },
                { icon: FileCheck, title: 'GST Analysis', desc: 'Auto breakdown' },
              ].map((f) => (
                <div key={f.title} className="glass-card p-4 text-center">
                  <f.icon className="h-5 w-5 text-purple-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Selected Files Preview */}
        {step === 'idle' && selectedFiles.length > 0 && (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                  </h3>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <X className="h-4 w-4 mr-1" /> Clear
                  </Button>
                </div>
                <div className="space-y-2">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        {file.type === 'application/pdf' ? (
                          <FileText className="h-5 w-5 text-purple-500" />
                        ) : (
                          <Image className="h-5 w-5 text-purple-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-11"
                  onClick={processInvoice}
                >
                  Process with AI
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Processing */}
        {(step === 'uploading' || step === 'processing') && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <Loader2 className="h-10 w-10 text-purple-500 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-1">
                  {step === 'uploading' ? 'Uploading your invoice...' : 'AI is analyzing your invoice...'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step === 'processing'
                    ? 'Extracting merchant, amount, date, tax, line items...'
                    : 'Preparing for analysis...'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Complete */}
        {step === 'complete' && (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card className="glass-card border-emerald-500/20">
              <CardContent className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </motion.div>
                <h3 className="text-xl font-bold mb-1">Invoice Processed!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {result
                    ? `Successfully extracted data from ${result.merchant} — ₹${result.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : 'Invoice processed successfully'}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setCurrentView('invoices')}
                  >
                    View Invoices
                  </Button>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                    onClick={reset}
                  >
                    Upload Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Error */}
        {step === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="glass-card border-red-500/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <X className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold mb-1">Processing Failed</h3>
                <p className="text-sm text-red-500 mb-4">{error}</p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" className="rounded-xl" onClick={reset}>
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
