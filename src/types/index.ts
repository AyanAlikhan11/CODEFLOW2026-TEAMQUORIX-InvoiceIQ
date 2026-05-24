// Invoice types
export interface InvoiceItem {
  id: string
  name: string
  quantity: number
  price: number
  total: number
}

export interface Invoice {
  id: string
  fileName: string
  merchant: string
  amount: number
  date: string | null
  tax: number
  gstAmount: number
  gstRate: number
  category: string
  subCategory: string
  items: InvoiceItem[]
  currency: string
  status: 'processing' | 'completed' | 'flagged' | 'duplicate'
  fraudScore: number
  isDuplicate: boolean
  confidence: number
  ocrText: string
  uploadedAt: string
  processedAt: string | null
}

// Category types
export type CategoryType =
  | 'Food'
  | 'Shopping'
  | 'Travel'
  | 'Medical'
  | 'Utilities'
  | 'Entertainment'
  | 'Office'
  | 'Education'
  | 'Subscription'
  | 'Other'
  | 'Rent'
  | 'Insurance'
  | 'Transport'
  | 'Groceries'
  | 'Dining'

// Insight types
export interface AIInsight {
  id: string
  type: 'recommendation' | 'observation' | 'warning' | 'fraud_alert'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  createdAt: string
}

// Analytics types
export interface MonthlySpending {
  month: string
  amount: number
  budget: number
  predicted: number
}

export interface CategoryAnalytics {
  category: string
  amount: number
  count: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
}

export interface MerchantAnalytics {
  merchant: string
  totalSpent: number
  invoiceCount: number
  avgAmount: number
  lastTransaction: string
}

export interface GSTAnalytics {
  totalGST: number
  cgst: number
  sgst: number
  igst: number
  gstByCategory: Record<string, number>
  monthlyGST: MonthlySpending[]
}

// Health Score types
export interface FinancialHealthScore {
  overall: number
  spending: number
  savings: number
  consistency: number
  diversification: number
  fraudRisk: number
}

// Prediction types
export interface SpendingPrediction {
  month: string
  predicted: number
  lower: number
  upper: number
  confidence: number
}

// Budget types
export interface Budget {
  id: string
  category: string
  allocated: number
  spent: number
  period: 'monthly' | 'quarterly'
  alertThreshold: number
}

// Chat types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface FraudAlert {
  id: string
  invoiceId: string
  type: 'duplicate' | 'amount_anomaly' | 'merchant_anomaly' | 'timing_anomaly'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
  resolved: boolean
}

// View types
export type ViewType =
  | 'dashboard'
  | 'upload'
  | 'invoices'
  | 'analytics'
  | 'predictions'
  | 'chat'
  | 'budget'
  | 'settings'

// Upload pipeline step types
export type PipelineStep =
  | 'idle'
  | 'uploading'
  | 'ocr'
  | 'extracting'
  | 'categorizing'
  | 'fraud_check'
  | 'duplicate_check'
  | 'analyzing'
  | 'complete'
  | 'error'
