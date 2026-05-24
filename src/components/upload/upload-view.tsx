'use client'

import { useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { motion } from 'framer-motion'

import {
  Upload,
  FileText,
  Image,
  X,
  CheckCircle2,
  Loader2,
  Zap,
  ArrowRight,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Invoice } from '@/types'

type Step =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error'

const PIPELINE_STEPS = [
  {
    key: 'uploading',
    label: 'Uploading',
    icon: Upload,
  },
  {
    key: 'processing',
    label: 'AI Analysis',
    icon: Zap,
  },
  {
    key: 'complete',
    label: 'Complete',
    icon: CheckCircle2,
  },
]

export function UploadView() {
  const { addInvoice, setCurrentView } =
    useAppStore()

  const [dragActive, setDragActive] =
    useState(false)

  const [step, setStep] =
    useState<Step>('idle')

  const [progress, setProgress] =
    useState(0)

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([])

  const [result, setResult] = useState<{
    merchant: string
    amount: number
  } | null>(null)

  const [error, setError] = useState('')

  const fileInputRef =
    useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const validFiles = Array.from(files).filter(
        (f) =>
          f.type.startsWith('image/') ||
          f.type === 'application/pdf'
      )

      setSelectedFiles(validFiles)
      setError('')
      setStep('idle')
      setProgress(0)
      setResult(null)
    },
    []
  )

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

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(true)
    },
    []
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
    },
    []
  )

  const processInvoice = async () => {
    if (selectedFiles.length === 0) return

    setStep('uploading')
    setProgress(10)
    setError('')

    try {
      await new Promise((r) =>
        setTimeout(r, 700)
      )

      setProgress(35)

      const file = selectedFiles[0]

      const formData = new FormData()

      formData.append('file', file)

      setStep('processing')
      setProgress(55)

      // Upload file
      const uploadRes = await fetch(
        '/api/upload',
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!uploadRes.ok) {
        const err = await uploadRes
          .json()
          .catch(() => ({}))

        throw new Error(
          err.error || 'Failed to upload invoice'
        )
      }

      const uploadData = await uploadRes.json()

      setProgress(75)

      // AI Analysis
      const aiRes = await fetch('/api/analytics', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          imageData: uploadData.imageData,
        }),
      })

      if (!aiRes.ok) {
        throw new Error(
          'AI failed to analyze invoice'
        )
      }

      const aiData = await aiRes.json()

      setProgress(90)

      // Create invoice object
      const invoice: Invoice = {
  id: crypto.randomUUID(),

  fileName:
    uploadData.fileName || 'invoice',

  merchant:
    aiData.merchant || 'Unknown',

  amount: Number(aiData.amount || 0),

  tax: Number(aiData.tax || 0),

  gstAmount: Number(
    aiData.gstAmount || 0
  ),

  gstRate: Number(
    aiData.gstRate || 18
  ),

  category:
    aiData.category || 'Other',

  subCategory: '',

  currency: 'INR',

  status: 'completed',

  fraudScore: Math.random() * 0.2,

  isDuplicate: false,

  confidence: 0.95,

  ocrText:
    aiData.ocrText || '',

  date:
    aiData.date ||
    new Date()
      .toISOString()
      .split('T')[0],

  uploadedAt:
    new Date().toISOString(),

  processedAt:
    new Date().toISOString(),

  items: Array.isArray(aiData.items)
    ? aiData.items.map(
        (item: any, index: number) => ({
          id:
            item.id ||
            crypto.randomUUID(),

          name:
            item.name || 'Item',

          quantity: Number(
            item.quantity || 1
          ),

          price: Number(
            item.price || 0
          ),

          total:
            Number(item.total) ||
            Number(item.price || 0) *
              Number(
                item.quantity || 1
              ),
        })
      )
    : [],

  imageData: uploadData.imageData,
}

      // Save to Zustand
      addInvoice(invoice)

      setResult({
        merchant: invoice.merchant,
        amount: invoice.amount,
      })

      setProgress(100)

      setStep('complete')
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to process invoice'
      )

      setStep('error')
    }
  }

  const reset = () => {
    setSelectedFiles([])
    setProgress(0)
    setResult(null)
    setError('')
    setStep('idle')
  }

  const currentStepIndex =
    PIPELINE_STEPS.findIndex(
      (s) => s.key === step
    )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">
          Upload & Scan
        </h2>

        <p className="text-muted-foreground text-sm">
          Upload invoices as images or PDFs.
          AI extracts merchant, GST, tax,
          items, totals and more.
        </p>
      </div>

      {step !== 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Card className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-4 mb-4">
                {PIPELINE_STEPS.map((s, i) => {
                  const Icon = s.icon

                  const isActive =
                    i === currentStepIndex

                  const isDone =
                    i < currentStepIndex

                  return (
                    <div
                      key={s.key}
                      className="flex items-center gap-2 flex-1"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isActive
                            ? 'bg-purple-500 text-white'
                            : 'bg-muted'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <span className="text-sm">
                        {s.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              <Progress
                value={progress}
                className="h-2"
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {selectedFiles.length === 0 &&
        step === 'idle' && (
          <div
            className={`upload-zone p-12 flex flex-col items-center justify-center cursor-pointer ${
              dragActive ? 'active' : ''
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={(e) =>
                e.target.files &&
                handleFiles(e.target.files)
              }
            />

            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-5">
              <Upload className="h-8 w-8 text-purple-500" />
            </div>

            <p className="text-lg font-semibold mb-1">
              Drag & Drop Invoice
            </p>

            <p className="text-sm text-muted-foreground">
              PDF, PNG, JPG supported
            </p>
          </div>
        )}

      {step === 'idle' &&
        selectedFiles.length > 0 && (
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="space-y-3">
                {selectedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      {file.type ===
                      'application/pdf' ? (
                        <FileText className="h-5 w-5 text-purple-500" />
                      ) : (
                        <Image className="h-5 w-5 text-purple-500" />
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {file.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(
                          1
                        )}{' '}
                        KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-5">
                <Button
                  variant="outline"
                  onClick={reset}
                >
                  Clear
                </Button>

                <Button
                  onClick={processInvoice}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Process Invoice

                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {(step === 'uploading' ||
        step === 'processing') && (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-10 w-10 text-purple-500 animate-spin mx-auto mb-4" />

            <h3 className="text-lg font-semibold">
              {step === 'uploading'
                ? 'Uploading Invoice...'
                : 'AI Analyzing Invoice...'}
            </h3>
          </CardContent>
        </Card>
      )}

      {step === 'complete' && result && (
        <Card className="glass-card border-emerald-500/20">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-4" />

            <h3 className="text-xl font-bold mb-2">
              Invoice Processed
            </h3>

            <p className="text-muted-foreground mb-4">
              {result.merchant} — ₹
              {result.amount.toLocaleString(
                'en-IN'
              )}
            </p>

            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentView('invoices')
                }
              >
                View Invoices
              </Button>

              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={reset}
              >
                Upload Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'error' && (
        <Card className="glass-card border-red-500/20">
          <CardContent className="p-8 text-center">
            <X className="h-10 w-10 text-red-500 mx-auto mb-4" />

            <h3 className="text-lg font-bold mb-2">
              Upload Failed
            </h3>

            <p className="text-red-500 text-sm mb-4">
              {error}
            </p>

            <Button onClick={reset}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}