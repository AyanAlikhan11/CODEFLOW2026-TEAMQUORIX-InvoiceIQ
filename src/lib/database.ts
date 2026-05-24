// Unified database service — Firebase (primary) with SQLite/Prisma fallback
import { isFirebaseEnabled, getFirebaseDb, getFirebaseStorage } from './firebase'
import { db as prismaDb } from './db'
import type { Invoice, ChatMessage, Budget, FraudAlert, FinancialHealthScore, MonthlySpending, CategoryAnalytics, MerchantAnalytics, GSTAnalytics, SpendingPrediction } from '@/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseFirestoreDoc<T>(doc: { id: string; data: () => Record<string, unknown> }): T {
  return { id: doc.id, ...doc.data() } as T
}

function invoiceFromRow(row: Record<string, unknown>): Invoice {
  const items = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || [])
  return {
    id: row.id as string,
    fileName: (row.fileName as string) || '',
    merchant: (row.merchant as string) || 'Unknown',
    amount: Number(row.amount) || 0,
    date: (row.date as string) || null,
    tax: Number(row.tax) || 0,
    gstAmount: Number(row.gstAmount) || 0,
    gstRate: Number(row.gstRate) || 0,
    category: (row.category as string) || 'Other',
    subCategory: (row.subCategory as string) || '',
    items,
    currency: (row.currency as string) || 'USD',
    status: (row.status as Invoice['status']) || 'completed',
    fraudScore: Number(row.fraudScore) || 0,
    isDuplicate: Boolean(row.isDuplicate),
    confidence: Number(row.confidence) || 0,
    ocrText: (row.ocrText as string) || '',
    uploadedAt: (row.uploadedAt as string) || (row.createdAt as string) || '',
    processedAt: (row.processedAt as string) || null,
  }
}

// ─── Database Service ───────────────────────────────────────────────────────

export const database = {
  // ─── Invoices ──────────────────────────────────────────────────────────

  async getInvoices(): Promise<Invoice[]> {
    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          const snapshot = await firestore.collection('invoices').orderBy('createdAt', 'desc').get()
          return snapshot.docs.map(doc => invoiceFromRow(parseFirestoreDoc(doc)))
        }
      } catch (error) {
        console.error('[Database] Firebase getInvoices failed, falling back:', error)
      }
    }
    // Fallback: Prisma
    const rows = await prismaDb.invoice.findMany({ orderBy: { createdAt: 'desc' } })
    return rows.map(row => invoiceFromRow(row))
  },

  async getInvoice(id: string): Promise<Invoice | null> {
    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          const doc = await firestore.collection('invoices').doc(id).get()
          if (doc.exists) return invoiceFromDoc(doc)
          return null
        }
      } catch (error) {
        console.error('[Database] Firebase getInvoice failed, falling back:', error)
      }
    }
    const row = await prismaDb.invoice.findUnique({ where: { id } })
    return row ? invoiceFromRow(row) : null
  },

  async createInvoice(data: Omit<Invoice, 'id'> & { id?: string }): Promise<Invoice> {
    const id = data.id || crypto.randomUUID()
    const now = data.uploadedAt || new Date().toISOString()
    const invoice: Invoice = {
      id,
      fileName: data.fileName || 'invoice.pdf',
      merchant: data.merchant || 'Unknown',
      amount: data.amount || 0,
      date: data.date || null,
      tax: data.tax || 0,
      gstAmount: data.gstAmount || 0,
      gstRate: data.gstRate || 0,
      category: data.category || 'Other',
      subCategory: data.subCategory || '',
      items: data.items || [],
      currency: data.currency || 'USD',
      status: data.status || 'completed',
      fraudScore: data.fraudScore || 0,
      isDuplicate: data.isDuplicate || false,
      confidence: data.confidence || 0,
      ocrText: data.ocrText || '',
      uploadedAt: now,
      processedAt: data.processedAt || null,
    }

    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          const { id: _id, ...docData } = invoice
          void _id
          await firestore.collection('invoices').doc(id).set({
            ...docData,
            createdAt: now,
            updatedAt: now,
          })
          return invoice
        }
      } catch (error) {
        console.error('[Database] Firebase createInvoice failed, falling back:', error)
      }
    }

    await prismaDb.invoice.create({
      data: {
        id,
        fileName: invoice.fileName,
        merchant: invoice.merchant,
        amount: invoice.amount,
        date: invoice.date,
        tax: invoice.tax,
        gstAmount: invoice.gstAmount,
        gstRate: invoice.gstRate,
        category: invoice.category,
        subCategory: invoice.subCategory,
        items: JSON.stringify(invoice.items),
        currency: invoice.currency,
        status: invoice.status,
        fraudScore: invoice.fraudScore,
        isDuplicate: invoice.isDuplicate,
        confidence: invoice.confidence,
        ocrText: invoice.ocrText,
        createdAt: now,
        updatedAt: now,
      },
    })

    return invoice
  },

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | null> {
    const existing = await this.getInvoice(id)
    if (!existing) return null

    const updated: Invoice = { ...existing, ...data }

    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          const { id: _id, ...docData } = updated
          void _id
          await firestore.collection('invoices').doc(id).set({
            ...docData,
            updatedAt: new Date().toISOString(),
          }, { merge: true })
          return updated
        }
      } catch (error) {
        console.error('[Database] Firebase updateInvoice failed, falling back:', error)
      }
    }

    await prismaDb.invoice.update({
      where: { id },
      data: {
        merchant: updated.merchant,
        amount: updated.amount,
        date: updated.date,
        tax: updated.tax,
        gstAmount: updated.gstAmount,
        gstRate: updated.gstRate,
        category: updated.category,
        subCategory: updated.subCategory,
        items: JSON.stringify(updated.items),
        currency: updated.currency,
        status: updated.status,
        fraudScore: updated.fraudScore,
        isDuplicate: updated.isDuplicate,
        confidence: updated.confidence,
        ocrText: updated.ocrText,
        updatedAt: new Date().toISOString(),
      },
    }).catch(() => null)

    return updated
  },

  async deleteInvoice(id: string): Promise<boolean> {
    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          await firestore.collection('invoices').doc(id).delete()
          return true
        }
      } catch (error) {
        console.error('[Database] Firebase deleteInvoice failed, falling back:', error)
      }
    }

    try {
      await prismaDb.invoice.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  },

  // ─── Chat Messages ─────────────────────────────────────────────────────

  async getChatMessages(): Promise<ChatMessage[]> {
    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          const snapshot = await firestore.collection('chat_messages').orderBy('createdAt', 'asc').get()
          return snapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              role: data.role as ChatMessage['role'],
              content: data.content as string,
              timestamp: data.timestamp || data.createdAt || '',
            }
          })
        }
      } catch (error) {
        console.error('[Database] Firebase getChatMessages failed, falling back:', error)
      }
    }

    const rows = await prismaDb.chatMessage.findMany({ orderBy: { createdAt: 'asc' } })
    return rows.map(row => ({
      id: row.id,
      role: row.role as ChatMessage['role'],
      content: row.content,
      timestamp: row.createdAt,
    }))
  },

  async addChatMessage(msg: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const id = crypto.randomUUID()
    const now = msg.timestamp || new Date().toISOString()
    const message: ChatMessage = {
      id,
      role: msg.role,
      content: msg.content,
      timestamp: now,
    }

    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          await firestore.collection('chat_messages').doc(id).set({
            role: message.role,
            content: message.content,
            timestamp: now,
            createdAt: now,
          })
          return message
        }
      } catch (error) {
        console.error('[Database] Firebase addChatMessage failed, falling back:', error)
      }
    }

    await prismaDb.chatMessage.create({
      data: {
        id,
        role: message.role,
        content: message.content,
        createdAt: now,
      },
    })

    return message
  },

  // ─── Budgets ──────────────────────────────────────────────────────────

  async getBudgets(): Promise<Budget[]> {
    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          const snapshot = await firestore.collection('budgets').orderBy('createdAt', 'desc').get()
          return snapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              category: data.category as string,
              allocated: Number(data.allocated) || 0,
              spent: Number(data.spent) || 0,
              period: data.period as Budget['period'] || 'monthly',
              alertThreshold: Number(data.alertThreshold) || 80,
            }
          })
        }
      } catch (error) {
        console.error('[Database] Firebase getBudgets failed, falling back:', error)
      }
    }

    const rows = await prismaDb.budget.findMany({ orderBy: { createdAt: 'desc' } })
    return rows.map(row => ({
      id: row.id,
      category: row.category,
      allocated: row.allocated,
      spent: row.spent,
      period: row.period as Budget['period'],
      alertThreshold: row.alertThreshold,
    }))
  },

  async createBudget(data: { category: string; allocated: number; period: string; alertThreshold?: number }): Promise<Budget> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const budget: Budget = {
      id,
      category: data.category,
      allocated: data.allocated,
      spent: 0,
      period: data.period as Budget['period'],
      alertThreshold: data.alertThreshold || 80,
    }

    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          await firestore.collection('budgets').doc(id).set({
            category: budget.category,
            allocated: budget.allocated,
            spent: budget.spent,
            period: budget.period,
            alertThreshold: budget.alertThreshold,
            createdAt: now,
            updatedAt: now,
          })
          return budget
        }
      } catch (error) {
        console.error('[Database] Firebase createBudget failed, falling back:', error)
      }
    }

    await prismaDb.budget.create({
      data: {
        id,
        category: budget.category,
        allocated: budget.allocated,
        spent: budget.spent,
        period: budget.period,
        alertThreshold: budget.alertThreshold,
        createdAt: now,
        updatedAt: now,
      },
    })

    return budget
  },

  async updateBudget(id: string, data: Partial<Budget>): Promise<Budget | null> {
    const existing = await this.getBudgets()
    const budget = existing.find(b => b.id === id)
    if (!budget) return null

    const updated: Budget = { ...budget, ...data }

    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          await firestore.collection('budgets').doc(id).set({
            category: updated.category,
            allocated: updated.allocated,
            spent: updated.spent,
            period: updated.period,
            alertThreshold: updated.alertThreshold,
            updatedAt: new Date().toISOString(),
          }, { merge: true })
          return updated
        }
      } catch (error) {
        console.error('[Database] Firebase updateBudget failed, falling back:', error)
      }
    }

    await prismaDb.budget.update({
      where: { id },
      data: {
        category: updated.category,
        allocated: updated.allocated,
        spent: updated.spent,
        period: updated.period,
        alertThreshold: updated.alertThreshold,
        updatedAt: new Date().toISOString(),
      },
    }).catch(() => null)

    return updated
  },

  async deleteBudget(id: string): Promise<boolean> {
    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          await firestore.collection('budgets').doc(id).delete()
          return true
        }
      } catch (error) {
        console.error('[Database] Firebase deleteBudget failed, falling back:', error)
      }
    }

    try {
      await prismaDb.budget.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  },

  // ─── Fraud Alerts ─────────────────────────────────────────────────────

  async getFraudAlerts(): Promise<FraudAlert[]> {
    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          const snapshot = await firestore.collection('fraud_alerts').orderBy('createdAt', 'desc').get()
          return snapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              invoiceId: data.invoiceId as string,
              type: data.type as FraudAlert['type'],
              description: data.description as string,
              severity: data.severity as FraudAlert['severity'],
              createdAt: data.createdAt as string,
              resolved: Boolean(data.resolved),
            }
          })
        }
      } catch (error) {
        console.error('[Database] Firebase getFraudAlerts failed, falling back:', error)
      }
    }

    const rows = await prismaDb.fraudAlert.findMany({ orderBy: { createdAt: 'desc' } })
    return rows.map(row => ({
      id: row.id,
      invoiceId: row.invoiceId,
      type: row.type as FraudAlert['type'],
      description: row.description,
      severity: row.severity as FraudAlert['severity'],
      createdAt: row.createdAt,
      resolved: row.resolved,
    }))
  },

  async createFraudAlert(data: { invoiceId: string; type: string; description: string; severity: string }): Promise<FraudAlert> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const alert: FraudAlert = {
      id,
      invoiceId: data.invoiceId,
      type: data.type as FraudAlert['type'],
      description: data.description,
      severity: data.severity as FraudAlert['severity'],
      createdAt: now,
      resolved: false,
    }

    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          await firestore.collection('fraud_alerts').doc(id).set({
            invoiceId: alert.invoiceId,
            type: alert.type,
            description: alert.description,
            severity: alert.severity,
            createdAt: now,
            resolved: false,
          })
          return alert
        }
      } catch (error) {
        console.error('[Database] Firebase createFraudAlert failed, falling back:', error)
      }
    }

    await prismaDb.fraudAlert.create({
      data: {
        id,
        invoiceId: alert.invoiceId,
        type: alert.type,
        description: alert.description,
        severity: alert.severity,
        createdAt: now,
        resolved: false,
      },
    })

    return alert
  },

  async createFraudAlerts(alerts: Array<{ invoiceId: string; type: string; description: string; severity: string }>): Promise<FraudAlert[]> {
    const results: FraudAlert[] = []
    for (const alertData of alerts) {
      const result = await this.createFraudAlert(alertData)
      results.push(result)
    }
    return results
  },

  async resolveFraudAlert(id: string): Promise<boolean> {
    if (isFirebaseEnabled()) {
      try {
        const firestore = getFirebaseDb()
        if (firestore) {
          await firestore.collection('fraud_alerts').doc(id).update({ resolved: true })
          return true
        }
      } catch (error) {
        console.error('[Database] Firebase resolveFraudAlert failed, falling back:', error)
      }
    }

    try {
      await prismaDb.fraudAlert.update({
        where: { id },
        data: { resolved: true },
      })
      return true
    } catch {
      return false
    }
  },

  // ─── Analytics ────────────────────────────────────────────────────────

  async getAnalytics(): Promise<{
    monthlySpending: MonthlySpending[]
    categoryAnalytics: CategoryAnalytics[]
    merchantAnalytics: MerchantAnalytics[]
    gstAnalytics: GSTAnalytics
    healthScore: FinancialHealthScore
    fraudAlerts: Array<{ invoiceId: string; type: string; description: string; severity: string; fraudScore: number; isDuplicate: boolean }>
  }> {
    const invoices = await this.getInvoices()

    if (invoices.length === 0) {
      return {
        monthlySpending: [],
        categoryAnalytics: [],
        merchantAnalytics: [],
        gstAnalytics: { totalGST: 0, cgst: 0, sgst: 0, igst: 0, gstByCategory: {}, monthlyGST: [] },
        healthScore: { overall: 50, spending: 50, savings: 50, consistency: 50, diversification: 50, fraudRisk: 100 },
        fraudAlerts: [],
      }
    }

    const totalSpent = invoices.reduce((sum, inv) => sum + inv.amount, 0)

    // Monthly spending
    const monthlyMap: Record<string, number> = {}
    invoices.forEach(inv => {
      const month = inv.date ? inv.date.substring(0, 7) : inv.uploadedAt.substring(0, 7)
      monthlyMap[month] = (monthlyMap[month] || 0) + inv.amount
    })
    const sortedMonths = Object.keys(monthlyMap).sort()
    const avgMonthly = totalSpent / sortedMonths.length

    const monthlySpending = sortedMonths.map(month => {
      const prevMonths = sortedMonths.filter(m => m < month)
      const predicted = prevMonths.length > 0
        ? prevMonths.reduce((sum, m) => sum + (monthlyMap[m] || 0), 0) / prevMonths.length
        : monthlyMap[month]
      return {
        month,
        amount: Math.round(monthlyMap[month] * 100) / 100,
        budget: Math.round(avgMonthly * 100) / 100,
        predicted: Math.round(predicted * 100) / 100,
      }
    })

    // Category analytics
    const categoryMap: Record<string, { amount: number; count: number }> = {}
    invoices.forEach(inv => {
      if (!categoryMap[inv.category]) categoryMap[inv.category] = { amount: 0, count: 0 }
      categoryMap[inv.category].amount += inv.amount
      categoryMap[inv.category].count++
    })

    const categoryAnalytics = Object.entries(categoryMap).map(([category, data]) => {
      const catInvoices = invoices.filter(inv => inv.category === category)
      const mid = Math.floor(catInvoices.length / 2)
      const firstHalf = catInvoices.slice(mid).reduce((s, i) => s + i.amount, 0)
      const secondHalf = catInvoices.slice(0, mid).reduce((s, i) => s + i.amount, 0)
      const trend = secondHalf > firstHalf * 1.1 ? 'up' : firstHalf > secondHalf * 1.1 ? 'down' : 'stable'
      return {
        category,
        amount: Math.round(data.amount * 100) / 100,
        count: data.count,
        percentage: totalSpent > 0 ? Math.round((data.amount / totalSpent) * 10000) / 100 : 0,
        trend,
      }
    }).sort((a, b) => b.amount - a.amount)

    // Merchant analytics
    const merchantMap: Record<string, { total: number; count: number; last: string }> = {}
    invoices.forEach(inv => {
      if (!merchantMap[inv.merchant]) merchantMap[inv.merchant] = { total: 0, count: 0, last: '' }
      merchantMap[inv.merchant].total += inv.amount
      merchantMap[inv.merchant].count++
      const invDate = inv.date || inv.uploadedAt
      if (!merchantMap[inv.merchant].last || invDate > merchantMap[inv.merchant].last) {
        merchantMap[inv.merchant].last = invDate
      }
    })

    const merchantAnalytics = Object.entries(merchantMap)
      .map(([merchant, data]) => ({
        merchant,
        totalSpent: Math.round(data.total * 100) / 100,
        invoiceCount: data.count,
        avgAmount: Math.round((data.total / data.count) * 100) / 100,
        lastTransaction: data.last,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)

    // GST analytics
    const totalGST = invoices.reduce((sum, inv) => sum + inv.gstAmount, 0)
    const gstByCategory: Record<string, number> = {}
    invoices.forEach(inv => {
      if (inv.gstAmount > 0) gstByCategory[inv.category] = (gstByCategory[inv.category] || 0) + inv.gstAmount
    })
    const monthlyGSTMap: Record<string, number> = {}
    invoices.forEach(inv => {
      if (inv.gstAmount > 0) {
        const month = inv.date ? inv.date.substring(0, 7) : inv.uploadedAt.substring(0, 7)
        monthlyGSTMap[month] = (monthlyGSTMap[month] || 0) + inv.gstAmount
      }
    })
    const monthlyGST = Object.entries(monthlyGSTMap).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({
      month,
      amount: Math.round(amount * 100) / 100,
      budget: 0,
      predicted: 0,
    }))

    const gstAnalytics: GSTAnalytics = {
      totalGST: Math.round(totalGST * 100) / 100,
      cgst: Math.round((totalGST / 2) * 100) / 100,
      sgst: Math.round((totalGST / 2) * 100) / 100,
      igst: 0,
      gstByCategory: Object.fromEntries(Object.entries(gstByCategory).map(([k, v]) => [k, Math.round(v * 100) / 100])),
      monthlyGST,
    }

    // Health score
    const avgFraudScore = invoices.reduce((s, i) => s + i.fraudScore, 0) / invoices.length
    const fraudRisk = Math.round((1 - Math.min(avgFraudScore * 3, 1)) * 100)
    const categoryCount = Object.keys(categoryMap).length
    const diversification = Math.min(Math.round((categoryCount / 10) * 100), 100)

    const mid = Math.floor(invoices.length / 2)
    const recentSpending = invoices.slice(0, mid).reduce((s, i) => s + i.amount, 0)
    const olderSpending = invoices.slice(mid).reduce((s, i) => s + i.amount, 0)
    const spendingRatio = olderSpending > 0 ? recentSpending / olderSpending : 1
    const spending = spendingRatio < 1
      ? Math.min(Math.round((1 - spendingRatio + 0.5) * 100), 100)
      : Math.max(Math.round((1.5 - spendingRatio) * 100), 20)

    const consistency = monthlySpending.length >= 2
      ? (() => {
          const amounts = monthlySpending.map(m => m.amount)
          const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length
          const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length
          const cv = mean > 0 ? Math.sqrt(variance) / mean : 1
          return Math.max(Math.round((1 - Math.min(cv, 1)) * 100), 10)
        })()
      : 50

    const savings = 70

    const overall = Math.round(
      spending * 0.25 + savings * 0.2 + consistency * 0.2 + diversification * 0.15 + fraudRisk * 0.2
    )

    const healthScore: FinancialHealthScore = {
      overall,
      spending,
      savings,
      consistency,
      diversification,
      fraudRisk,
    }

    // Fraud alerts from invoice data
    const fraudAlerts = invoices
      .filter(inv => inv.fraudScore > 0.5 || inv.isDuplicate)
      .map(inv => ({
        invoiceId: inv.id,
        type: inv.isDuplicate ? 'duplicate' : 'amount_anomaly',
        description: inv.isDuplicate
          ? `Possible duplicate invoice from ${inv.merchant} for ₹${inv.amount.toFixed(2)}`
          : `Unusual activity detected for ${inv.merchant}: ₹${inv.amount.toFixed(2)} (fraud score: ${inv.fraudScore.toFixed(2)})`,
        severity: inv.fraudScore > 0.7 ? 'high' : 'medium',
        fraudScore: inv.fraudScore,
        isDuplicate: inv.isDuplicate,
      }))

    return { monthlySpending, categoryAnalytics, merchantAnalytics, gstAnalytics, healthScore, fraudAlerts }
  },

  // ─── File Storage ─────────────────────────────────────────────────────

  async storeInvoiceFile(invoiceId: string, fileName: string, base64Data: string): Promise<string | null> {
    if (isFirebaseEnabled()) {
      try {
        const storage = getFirebaseStorage()
        if (storage) {
          const bucket = storage.bucket()
          const filePath = `invoices/${invoiceId}/${fileName}`
          const file = bucket.file(filePath)

          // Strip base64 prefix if present
          const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '')
          const buffer = Buffer.from(cleanBase64, 'base64')

          await file.save(buffer, {
            metadata: { contentType: getContentTypeFromFileName(fileName) },
          })

          // Make publicly readable
          await file.makePublic()
          return `https://storage.googleapis.com/${bucket.name}/${filePath}`
        }
      } catch (error) {
        console.error('[Database] Firebase storeInvoiceFile failed:', error)
      }
    }

    // Fallback: store as in-memory reference (base64 is already held by caller)
    return null
  },
}

// ─── Local helpers ──────────────────────────────────────────────────────────

function invoiceFromDoc(doc: { id: string; data: () => Record<string, unknown> | undefined }): Invoice {
  const data = doc.data()
  if (!data) throw new Error('Document data is undefined')
  return invoiceFromRow({ id: doc.id, ...data })
}

function getContentTypeFromFileName(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop()
  const contentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
  }
  return contentTypes[ext || ''] || 'application/octet-stream'
}
