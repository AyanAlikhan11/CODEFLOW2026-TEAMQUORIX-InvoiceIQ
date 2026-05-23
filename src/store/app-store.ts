import { create } from 'zustand'

export type ViewType = 'dashboard' | 'upload' | 'history' | 'insights'

interface InvoiceItem {
  name: string
  quantity: number
  price: number
}

export interface Invoice {
  id: string
  fileName: string
  merchant: string
  amount: number
  date: string | null
  tax: number
  category: string
  items: InvoiceItem[]
  currency: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface AIInsight {
  id: string
  type: 'recommendation' | 'observation' | 'warning'
  title: string
  description: string
  createdAt: string
}

interface AppState {
  currentView: ViewType
  sidebarOpen: boolean
  invoices: Invoice[]
  insights: AIInsight[]
  isAnalyzing: boolean
  analysisResult: Invoice | null
  aiRecommendations: string[]
  
  setCurrentView: (view: ViewType) => void
  setSidebarOpen: (open: boolean) => void
  setInvoices: (invoices: Invoice[]) => void
  setInsights: (insights: AIInsight[]) => void
  setIsAnalyzing: (analyzing: boolean) => void
  setAnalysisResult: (result: Invoice | null) => void
  setAIRecommendations: (recommendations: string[]) => void
  addInvoice: (invoice: Invoice) => void
  removeInvoice: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  sidebarOpen: true,
  invoices: [],
  insights: [],
  isAnalyzing: false,
  analysisResult: null,
  aiRecommendations: [],
  
  setCurrentView: (view) => set({ currentView: view }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setInvoices: (invoices) => set({ invoices }),
  setInsights: (insights) => set({ insights }),
  setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setAIRecommendations: (recommendations) => set({ aiRecommendations: recommendations }),
  addInvoice: (invoice) => set((state) => ({ invoices: [invoice, ...state.invoices] })),
  removeInvoice: (id) => set((state) => ({ invoices: state.invoices.filter((inv) => inv.id !== id) })),
}))
