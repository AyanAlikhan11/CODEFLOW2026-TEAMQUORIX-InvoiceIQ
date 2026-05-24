'use client'

import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

const steps = [
  {
    step: '01',
    title: 'Upload Your Invoice',
    description:
      'Drag and drop or browse to upload invoices in any format — PDF, images, or scanned documents. Our system accepts batch uploads of up to 100 files at once.',
  },
  {
    step: '02',
    title: 'AI Extracts Data Instantly',
    description:
      'Our AI engine processes each invoice in seconds, extracting merchant details, amounts, dates, tax breakdowns, and line items with over 99% accuracy.',
  },
  {
    step: '03',
    title: 'Review & Approve',
    description:
      'Review extracted data on an intuitive dashboard. Edit any field, categorize expenses, and approve invoices for your records with a single click.',
  },
  {
    step: '04',
    title: 'Get Actionable Insights',
    description:
      'Access real-time analytics, spending trends, GST reports, fraud alerts, and predictions. Make data-driven decisions to optimize your business finances.',
  },
]

const stats = [
  { value: '99.2%', label: 'OCR Accuracy' },
  { value: '2.5M+', label: 'Invoices Processed' },
  { value: '10,000+', label: 'Businesses Trust Us' },
  { value: '<3s', label: 'Avg. Processing Time' },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-white dark:bg-[#0a0e1a]">
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
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50 mb-4">
            Four simple steps to smarter invoicing
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Go from upload to insights in minutes. Our AI handles the heavy lifting
            so you can focus on what matters.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(50%+32px)] w-[calc(100%-64px)] h-[2px] bg-gradient-to-r from-purple-200 dark:from-purple-700 to-purple-100 dark:to-purple-800" />
              )}
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-500/25">
                  <span className="text-xl font-bold text-white">{step.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-3xl p-10 md:p-14"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-purple-200">{stat.label}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="text-purple-200 mb-5">
              Join thousands of businesses already saving time with InvoiceIQ
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-white text-purple-700 hover:bg-purple-50 rounded-xl px-8 h-12 font-semibold shadow-xl transition-all duration-300"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
