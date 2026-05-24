import { create } from 'zustand'
import type {
  ViewType,
  Invoice,
  AIInsight,
  FraudAlert,
  ChatMessage,
  Budget,
  FinancialHealthScore,
  MonthlySpending,
  SpendingPrediction,
  CategoryAnalytics,
  MerchantAnalytics,
  GSTAnalytics,
  PipelineStep,
} from '@/types'

interface AppState {
  // Navigation
  currentView: ViewType
  sidebarOpen: boolean
  sidebarCollapsed: boolean

  // Upload pipeline
  pipelineStep: PipelineStep
  pipelineProgress: number

  // Invoices
  invoices: Invoice[]
  selectedInvoice: Invoice | null

  // Analytics
  monthlySpending: MonthlySpending[]
  categoryAnalytics: CategoryAnalytics[]
  merchantAnalytics: MerchantAnalytics[]
  gstAnalytics: GSTAnalytics | null

  // AI
  insights: AIInsight[]
  recommendations: string[]
  healthScore: FinancialHealthScore | null
  predictions: SpendingPrediction[]

  // Fraud
  fraudAlerts: FraudAlert[]
  unreadAlerts: number

  // Chat
  chatMessages: ChatMessage[]
  isChatOpen: boolean

  // Budget
  budgets: Budget[]

  // Actions
  setCurrentView: (view: ViewType) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setPipelineStep: (step: PipelineStep) => void
  setPipelineProgress: (progress: number) => void
  setInvoices: (invoices: Invoice[]) => void
  addInvoice: (invoice: Invoice) => void
  removeInvoice: (id: string) => void
  updateInvoice: (id: string, data: Partial<Invoice>) => void
  setSelectedInvoice: (invoice: Invoice | null) => void
  setMonthlySpending: (data: MonthlySpending[]) => void
  setCategoryAnalytics: (data: CategoryAnalytics[]) => void
  setMerchantAnalytics: (data: MerchantAnalytics[]) => void
  setGSTAnalytics: (data: GSTAnalytics) => void
  setInsights: (insights: AIInsight[]) => void
  setRecommendations: (recs: string[]) => void
  setHealthScore: (score: FinancialHealthScore) => void
  setPredictions: (predictions: SpendingPrediction[]) => void
  setFraudAlerts: (alerts: FraudAlert[]) => void
  addFraudAlert: (alert: FraudAlert) => void
  resolveFraudAlert: (id: string) => void
  addChatMessage: (message: ChatMessage) => void
  setChatMessages: (messages: ChatMessage[]) => void
  setIsChatOpen: (open: boolean) => void
  setBudgets: (budgets: Budget[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentView: 'dashboard',
  sidebarOpen: true,
  sidebarCollapsed: false,

  // Upload pipeline
  pipelineStep: 'idle',
  pipelineProgress: 0,

  // Invoices
  invoices: [],
  selectedInvoice: null,

  // Analytics
  monthlySpending: [],
  categoryAnalytics: [],
  merchantAnalytics: [],
  gstAnalytics: null,

  // AI
  insights: [],
  recommendations: [],
  healthScore: null,
  predictions: [],

  // Fraud
  fraudAlerts: [],
  unreadAlerts: 0,

  // Chat
  chatMessages: [],
  isChatOpen: false,

  // Budget
  budgets: [],

  // Actions — Navigation
  setCurrentView: (view) => set({ currentView: view }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  // Actions — Upload pipeline
  setPipelineStep: (step) => set({ pipelineStep: step }),
  setPipelineProgress: (progress) => set({ pipelineProgress: progress }),

  // Actions — Invoices
  setInvoices: (invoices) => set({ invoices }),
  addInvoice: (invoice) =>
    set((state) => ({ invoices: [invoice, ...state.invoices] })),
  removeInvoice: (id) =>
    set((state) => ({
      invoices: state.invoices.filter((inv) => inv.id !== id),
      selectedInvoice:
        state.selectedInvoice?.id === id ? null : state.selectedInvoice,
    })),
  updateInvoice: (id, data) =>
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === id ? { ...inv, ...data } : inv
      ),
      selectedInvoice:
        state.selectedInvoice?.id === id
          ? { ...state.selectedInvoice, ...data }
          : state.selectedInvoice,
    })),
  setSelectedInvoice: (invoice) => set({ selectedInvoice: invoice }),

  // Actions — Analytics
  setMonthlySpending: (data) => set({ monthlySpending: data }),
  setCategoryAnalytics: (data) => set({ categoryAnalytics: data }),
  setMerchantAnalytics: (data) => set({ merchantAnalytics: data }),
  setGSTAnalytics: (data) => set({ gstAnalytics: data }),

  // Actions — AI
  setInsights: (insights) => set({ insights }),
  setRecommendations: (recs) => set({ recommendations: recs }),
  setHealthScore: (score) => set({ healthScore: score }),
  setPredictions: (predictions) => set({ predictions }),

  // Actions — Fraud
  setFraudAlerts: (alerts) =>
    set({
      fraudAlerts: alerts,
      unreadAlerts: alerts.filter((a) => !a.resolved).length,
    }),
  addFraudAlert: (alert) =>
    set((state) => ({
      fraudAlerts: [alert, ...state.fraudAlerts],
      unreadAlerts: state.unreadAlerts + 1,
    })),
  resolveFraudAlert: (id) =>
    set((state) => ({
      fraudAlerts: state.fraudAlerts.map((a) =>
        a.id === id ? { ...a, resolved: true } : a
      ),
      unreadAlerts: Math.max(0, state.unreadAlerts - 1),
    })),

  // Actions — Chat
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  setIsChatOpen: (open) => set({ isChatOpen: open }),

  // Actions — Budget
  setBudgets: (budgets) => set({ budgets }),
}))
