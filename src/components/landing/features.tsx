'use client'

import { motion } from 'framer-motion'
import {
  FileSearch,
  BarChart3,
  Bell,
  Shield,
  Zap,
  Globe,
  ArrowUpRight,
} from 'lucide-react'

export function FeaturesSection() {
  const features = [
    {
      icon: FileSearch,
      title: 'AI-Powered OCR',
      description:
        'Our advanced AI engine extracts every field from your invoices — merchant, amount, date, tax, line items — with over 99% accuracy. Supports PDF, images, and scanned documents.',
      color: 'purple',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description:
        'Get instant visibility into spending patterns, cash flow, GST breakdowns, and category analytics. Interactive charts update in real-time as you process invoices.',
      color: 'blue',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description:
        'Automated alerts for overdue payments, unusual transactions, and budget thresholds. Never miss a payment or an anomaly with intelligent reminder system.',
      color: 'amber',
    },
    {
      icon: Shield,
      title: 'Fraud Detection',
      description:
        'AI-powered fraud detection identifies duplicate invoices, amount anomalies, and suspicious patterns. Protect your business with real-time risk scoring.',
      color: 'rose',
    },
    {
      icon: Zap,
      title: 'Batch Processing',
      description:
        'Upload and process hundreds of invoices simultaneously. Our parallel processing engine handles large volumes with consistent speed and accuracy.',
      color: 'emerald',
    },
    {
      icon: Globe,
      title: 'Multi-Currency Support',
      description:
        'Process invoices in any currency with automatic conversion. GST-aware analytics for Indian businesses with CGST, SGST, and IGST breakdowns.',
      color: 'teal',
    },
  ]

  const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-900/30' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', icon: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-900/30' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900/30' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-900/20', icon: 'text-teal-600 dark:text-teal-400', border: 'border-teal-100 dark:border-teal-900/30' },
  }

  return (
    <section id="features" className="py-24 bg-gray-50/50 dark:bg-gray-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 bg-purple-50 dark:bg-purple-900/30 rounded-full text-sm font-medium text-purple-700 dark:text-purple-300 mb-4">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50 mb-4">
            Everything you need to manage invoices
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            From AI-powered data extraction to fraud detection, InvoiceIQ gives you
            all the tools to streamline your financial workflow.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const colors = colorMap[feature.color]
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-6 hover:shadow-xl hover:shadow-purple-900/5 dark:hover:shadow-purple-900/20 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-4`}>
                  <feature.icon className={`h-6 w-6 ${colors.icon}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                  {feature.title}
                  <ArrowUpRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
