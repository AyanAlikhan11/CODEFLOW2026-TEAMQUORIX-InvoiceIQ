'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/app-store'
import type { Invoice, PipelineStep } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Upload,
  FileText,
  Image as ImageIcon,
  File,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Shield,
  Eye,
  Trash2,
  Plus,
  ArrowRight,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Tag,
  Calendar,
  Receipt,
  ScanLine,
  Layers,
  Zap,
  AlertTriangle,
  Copy,
  Percent,
} from 'lucide-react'

// ─── Constants ──────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_BATCH_SIZE = 5

const PIPELINE_STEPS: { key: PipelineStep; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'uploading', label: 'Uploading', icon: <Upload className="h-4 w-4" />, description: 'Sending file to server...' },
  { key: 'ocr', label: 'OCR Scan', icon: <ScanLine className="h-4 w-4" />, description: 'Reading document content...' },
  { key: 'extracting', label: 'Extracting Data', icon: <Layers className="h-4 w-4" />, description: 'Pulling invoice fields...' },
  { key: 'categorizing', label: 'Categorizing', icon: <Tag className="h-4 w-4" />, description: 'Classifying expense type...' },
  { key: 'fraud_check', label: 'Fraud Check', icon: <Shield className="h-4 w-4" />, description: 'Running fraud analysis...' },
  { key: 'duplicate_check', label: 'Duplicate Check', icon: <Copy className="h-4 w-4" />, description: 'Checking for duplicates...' },
  { key: 'analyzing', label: 'AI Analysis', icon: <Sparkles className="h-4 w-4" />, description: 'Generating insights...' },
  { key: 'complete', label: 'Complete', icon: <CheckCircle2 className="h-4 w-4" />, description: 'Invoice processed!' },
]

function getStepIndex(step: PipelineStep): number {
  const idx = PIPELINE_STEPS.findIndex((s) => s.key === step)
  return idx >= 0 ? idx : 0
}

// ─── File Card ───────────────────────────────────────────────────────────────

interface FileEntry {
  id: string
  file: File
  preview: string | null
  status: 'pending' | 'processing' | 'success' | 'error'
  error?: string
  result?: Invoice
  step: PipelineStep
  progress: number
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5" />
  return <File className="h-5 w-5" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileCard({
  entry,
  onRemove,
}: {
  entry: FileEntry
  onRemove: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        className={cn(
          'overflow-hidden border transition-all duration-300',
          entry.status === 'error'
            ? 'border-destructive/50 bg-destructive/5'
            : entry.status === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : entry.status === 'processing'
                ? 'border-primary/30 bg-primary/5'
                : 'border-border'
        )}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Preview Thumbnail */}
            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-secondary/50 shrink-0 border border-border/50">
              {entry.preview ? (
                <img
                  src={entry.preview}
                  alt={entry.file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  {getFileIcon(entry.file.type)}
                </div>
              )}

              {/* Status Overlay */}
              {entry.status === 'processing' && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                </div>
              )}
              {entry.status === 'success' && (
                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
              )}
              {entry.status === 'error' && (
                <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{entry.file.name}</p>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatFileSize(entry.file.size)}
                </span>
              </div>

              {/* Pipeline Progress */}
              {entry.status === 'processing' && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    {PIPELINE_STEPS[getStepIndex(entry.step)]?.icon}
                    <span className="text-muted-foreground">
                      {PIPELINE_STEPS[getStepIndex(entry.step)]?.label}
                    </span>
                    <span className="text-muted-foreground/60 ml-auto">
                      {entry.progress}%
                    </span>
                  </div>
                  <Progress value={entry.progress} className="h-1.5" />
                </div>
              )}

              {/* Success Summary */}
              {entry.status === 'success' && entry.result && (
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {entry.result.merchant}
                  </span>
                  <span>
                    <IndianRupee className="inline h-3 w-3" />{' '}
                    {entry.result.amount.toFixed(2)}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-5 px-1.5"
                  >
                    {entry.result.category}
                  </Badge>
                  {entry.result.fraudScore > 20 && (
                    <span className="flex items-center gap-1 text-orange-500">
                      <Shield className="h-3 w-3" />
                      {entry.result.fraudScore.toFixed(0)}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    className="h-5 px-1.5 ml-auto text-xs"
                  >
                    {expanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}

              {/* Error */}
              {entry.status === 'error' && entry.error && (
                <p className="mt-1.5 text-xs text-destructive truncate">
                  {entry.error}
                </p>
              )}

              {/* Pending */}
              {entry.status === 'pending' && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Queued for upload
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {entry.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(entry.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {entry.status === 'error' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(entry.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Expanded Result Details */}
          <AnimatePresence>
            {expanded && entry.status === 'success' && entry.result && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-border/50">
                  <InvoiceResultDetails invoice={entry.result} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Invoice Result Details ──────────────────────────────────────────────────

function InvoiceResultDetails({ invoice }: { invoice: Invoice }) {
  return (
    <div className="space-y-3">
      {/* Grid Details */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <DetailPill
          icon={<Receipt className="h-3.5 w-3.5" />}
          label="Merchant"
          value={invoice.merchant}
        />
        <DetailPill
          icon={<Calendar className="h-3.5 w-3.5" />}
          label="Date"
          value={invoice.date ? new Date(invoice.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
        />
        <DetailPill
          icon={<IndianRupee className="h-3.5 w-3.5" />}
          label="Amount"
          value={`${invoice.currency === 'INR' ? '₹' : '$'}${invoice.amount.toFixed(2)}`}
        />
        <DetailPill
          icon={<Percent className="h-3.5 w-3.5" />}
          label="Tax"
          value={`${invoice.currency === 'INR' ? '₹' : '$'}${invoice.tax.toFixed(2)}`}
        />
        {invoice.gstAmount > 0 && (
          <DetailPill
            icon={<IndianRupee className="h-3.5 w-3.5" />}
            label="GST"
            value={`${invoice.gstAmount.toFixed(2)} (${invoice.gstRate}%)`}
          />
        )}
        <DetailPill
          icon={<Tag className="h-3.5 w-3.5" />}
          label="Category"
          value={invoice.category}
        />
        <DetailPill
          icon={<Shield className="h-3.5 w-3.5" />}
          label="Fraud Score"
          value={`${invoice.fraudScore.toFixed(0)}/100`}
          valueClass={
            invoice.fraudScore > 70
              ? 'text-red-500'
              : invoice.fraudScore > 40
                ? 'text-orange-500'
                : 'text-emerald-500'
          }
        />
        <DetailPill
          icon={<Eye className="h-3.5 w-3.5" />}
          label="Confidence"
          value={`${invoice.confidence.toFixed(0)}%`}
        />
      </div>

      {/* Line Items */}
      {invoice.items && invoice.items.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">
            Line Items
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">
                    Item
                  </th>
                  <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">
                    Qty
                  </th>
                  <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">
                    Price
                  </th>
                  <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="border-t border-border/50"
                  >
                    <td className="py-1.5 px-2">{item.name}</td>
                    <td className="text-center py-1.5 px-2">{item.quantity}</td>
                    <td className="text-center py-1.5 px-2">
                      {invoice.currency === 'INR' ? '₹' : '$'}
                      {item.price.toFixed(2)}
                    </td>
                    <td className="text-right py-1.5 px-2 font-medium">
                      {invoice.currency === 'INR' ? '₹' : '$'}
                      {(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Status:</span>
        <StatusBadge status={invoice.status} />
        {invoice.isDuplicate && (
          <Badge variant="secondary" className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400">
            Duplicate
          </Badge>
        )}
      </div>
    </div>
  )
}

function DetailPill({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className={cn('text-xs font-medium truncate', valueClass)}>
          {value}
        </p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: Invoice['status'] }) {
  const config: Record<Invoice['status'], { label: string; className: string }> = {
    completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    flagged: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    duplicate: 'bg-red-500/10 text-red-600 dark:text-red-400',
    processing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  }
  const labels: Record<Invoice['status'], string> = {
    completed: 'Completed',
    flagged: 'Flagged',
    duplicate: 'Duplicate',
    processing: 'Processing',
  }
  return (
    <Badge variant="secondary" className={cn('text-[10px]', config[status])}>
      {labels[status]}
    </Badge>
  )
}

// ─── Pipeline Visualization ──────────────────────────────────────────────────

function PipelineVisualization({ currentStep, progress }: { currentStep: PipelineStep; progress: number }) {
  const activeIdx = getStepIndex(currentStep)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span className="font-medium text-foreground flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          Processing Pipeline
        </span>
        <span>{progress}%</span>
      </div>

      {/* Steps Progress */}
      <div className="flex items-center gap-1">
        {PIPELINE_STEPS.map((step, idx) => {
          const isActive = idx === activeIdx && currentStep !== 'complete' && currentStep !== 'error'
          const isDone = idx < activeIdx || currentStep === 'complete'

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-full h-1.5 rounded-full transition-all duration-500',
                  isDone
                    ? 'bg-primary'
                    : isActive
                      ? 'bg-primary/60'
                      : 'bg-secondary'
                )}
              >
                {isActive && (
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </div>
              <span
                className={cn(
                  'text-[9px] text-center leading-tight hidden sm:block',
                  isDone
                    ? 'text-primary font-medium'
                    : isActive
                      ? 'text-primary'
                      : 'text-muted-foreground/50'
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Current Step Detail */}
      <AnimatePresence mode="wait">
        {currentStep !== 'idle' && currentStep !== 'complete' && currentStep !== 'error' && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              {PIPELINE_STEPS[activeIdx]?.icon}
            </motion.div>
            <div>
              <p className="text-xs font-medium">
                {PIPELINE_STEPS[activeIdx]?.label}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {PIPELINE_STEPS[activeIdx]?.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Upload View ────────────────────────────────────────────────────────

export function UploadView() {
  const { addInvoice, setCurrentView } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const [files, setFiles] = useState<FileEntry[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [currentStep, setCurrentStep] = useState<PipelineStep>('idle')
  const [overallProgress, setOverallProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // ─── File Handling ────────────────────────────────────────────────────────

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Unsupported format: ${file.type || 'unknown'}. Use PNG, JPG, WEBP, or PDF.`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (${formatFileSize(file.size)}). Max size is ${formatFileSize(MAX_FILE_SIZE)}.`
    }
    return null
  }, [])

  const createPreview = useCallback((file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(file)
      } else {
        resolve(null)
      }
    })
  }, [])

  const addFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles)
      const toAdd = fileArray.slice(0, MAX_BATCH_SIZE - files.length)

      if (fileArray.length > toAdd.length) {
        // Would warn but keep silent
      }

      const entries: FileEntry[] = []
      for (const file of toAdd) {
        const error = validateFile(file)
        if (error) {
          entries.push({
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            preview: null,
            status: 'error',
            error,
            step: 'idle',
            progress: 0,
          })
          continue
        }

        const preview = await createPreview(file)
        entries.push({
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          preview,
          status: 'pending',
          step: 'idle',
          progress: 0,
        })
      }

      setFiles((prev) => [...prev, ...entries])
    },
    [files.length, validateFile, createPreview]
  )

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current = 0
      setIsDragOver(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files)
        e.target.value = ''
      }
    },
    [addFiles]
  )

  // ─── Upload & Process ─────────────────────────────────────────────────────

  const processFiles = useCallback(async () => {
    const pending = files.filter((f) => f.status === 'pending')
    if (pending.length === 0) return

    setIsProcessing(true)

    for (let i = 0; i < pending.length; i++) {
      const entry = pending[i]
      const baseProgress = Math.round((i / pending.length) * 100)
      const totalSteps = PIPELINE_STEPS.length - 1 // exclude 'complete'

      try {
        // Update state through pipeline
        for (let stepIdx = 0; stepIdx < totalSteps; stepIdx++) {
          const step = PIPELINE_STEPS[stepIdx].key
          const stepProgress = Math.round(baseProgress + ((stepIdx + 1) / totalSteps) * (100 / pending.length))

          setCurrentStep(step)
          setOverallProgress(stepProgress)
          setFiles((prev) =>
            prev.map((f) =>
              f.id === entry.id
                ? { ...f, status: 'processing', step, progress: stepProgress }
                : f
            )
          )

          // Simulate step duration (real processing happens server-side)
          await new Promise((r) => setTimeout(r, 400))
        }

        // Read file as base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(entry.file)
        })

        // API Call
        const res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: entry.file.name,
            imageData: base64,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Upload failed' }))
          throw new Error(errorData.error || `Server error (${res.status})`)
        }

        const data = await res.json()
        const invoice = data.invoice as Invoice

        // Complete
        const finalProgress = Math.round(((i + 1) / pending.length) * 100)
        setCurrentStep('complete')
        setOverallProgress(finalProgress)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: 'success', step: 'complete', progress: 100, result: invoice }
              : f
          )
        )

        // Add to store
        addInvoice(invoice)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: 'error', step: 'error', error: errorMessage, progress: 0 }
              : f
          )
        )
      }
    }

    setIsProcessing(false)
  }, [files, addInvoice])

  const resetAll = useCallback(() => {
    setFiles([])
    setCurrentStep('idle')
    setOverallProgress(0)
    setIsProcessing(false)
  }, [])

  const successCount = files.filter((f) => f.status === 'success').length
  const errorCount = files.filter((f) => f.status === 'error').length
  const pendingCount = files.filter((f) => f.status === 'pending').length
  const hasResults = successCount > 0

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Hidden file input — single instance shared by dropzone & Add More button */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upload Invoices</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Drag & drop invoice images or PDFs. AI will extract merchant details,
          amounts, taxes, line items, and categorize automatically.
        </p>
      </div>

      {/* Drop Zone */}
      {files.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative flex flex-col items-center justify-center gap-4 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300',
              isDragOver
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-border hover:border-primary/50 hover:bg-secondary/30'
            )}
          >
            {/* Animated Icon */}
            <motion.div
              animate={isDragOver ? { y: -8, scale: 1.1 } : { y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
            >
              <Upload
                className={cn(
                  'h-7 w-7 transition-colors',
                  isDragOver ? 'text-primary' : 'text-muted-foreground'
                )}
              />
            </motion.div>

            <div className="text-center">
              <p className="font-medium text-sm">
                {isDragOver ? (
                  <span className="text-primary">Drop files here</span>
                ) : (
                  <>
                    Drop invoices here or{' '}
                    <span className="text-primary underline underline-offset-4">
                      browse files
                    </span>
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports PNG, JPG, WEBP, HEIC, PDF — up to {formatFileSize(MAX_FILE_SIZE)} each
              </p>
            </div>

            {/* Format Badges */}
            <div className="flex items-center gap-2">
              {['PNG', 'JPG', 'WEBP', 'PDF'].map((fmt) => (
                <Badge
                  key={fmt}
                  variant="secondary"
                  className="text-[10px] font-mono"
                >
                  {fmt}
                </Badge>
              ))}
            </div>

          </div>
        </motion.div>
      )}

      {/* File List + Pipeline */}
      {files.length > 0 && (
        <div className="space-y-4">
          {/* Pipeline Progress */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardContent className="p-4">
                  <PipelineVisualization
                    currentStep={currentStep}
                    progress={overallProgress}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Success Summary Bar */}
          {hasResults && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between p-3 rounded-xl glass-card">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium">{successCount} processed</span>
                  </div>
                  {errorCount > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errorCount} failed</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setCurrentView('invoices')}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View All Invoices
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* File Cards */}
          <div className="space-y-3">
            <AnimatePresence>
              {files.map((entry) => (
                <FileCard
                  key={entry.id}
                  entry={entry}
                  onRemove={removeFile}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Actions Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || files.length >= MAX_BATCH_SIZE}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add More
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAll}
                disabled={isProcessing}
                className="gap-1.5 text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Clear All
              </Button>
              <span className="text-xs text-muted-foreground">
                {files.length}/{MAX_BATCH_SIZE} files
              </span>
            </div>

            <Button
              onClick={processFiles}
              disabled={isProcessing || pendingCount === 0}
              className="gap-1.5"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze {pendingCount > 0 ? `${pendingCount} Invoice${pendingCount > 1 ? 's' : ''}` : 'All'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>
        </div>
      )}

      {/* Empty State Tips */}
      {files.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {[
            {
              icon: <ScanLine className="h-5 w-5" />,
              title: 'Smart OCR',
              desc: 'AI reads text from any invoice image or PDF with high accuracy.',
            },
            {
              icon: <Shield className="h-5 w-5" />,
              title: 'Fraud Detection',
              desc: 'Automatic duplicate detection and anomaly scoring on every upload.',
            },
            {
              icon: <Sparkles className="h-5 w-5" />,
              title: 'Auto Categorize',
              desc: 'Expenses are automatically categorized into 15+ categories.',
            },
          ].map((tip) => (
            <Card key={tip.title} className="glass-card">
              <CardContent className="p-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2.5">
                  {tip.icon}
                </div>
                <h3 className="font-medium text-sm">{tip.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{tip.desc}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  )
}
