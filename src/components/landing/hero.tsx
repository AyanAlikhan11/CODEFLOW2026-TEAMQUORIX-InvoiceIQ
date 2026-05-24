'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Play,
  FileSearch,
  BarChart3,
  Bell,
  Shield,
  CheckCircle2,
  FileText,
  IndianRupee,
  Clock,
  Users,
} from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-100/40 dark:bg-purple-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/50 dark:bg-blue-900/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-full mb-6">
              <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Smart Invoicing. Powerful Insights.</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-tight text-gray-900 dark:text-gray-50 mb-6">
              Smarter Invoicing.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-400 dark:to-purple-500">
                Better Business.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-xl">
              invoiceIQ automates your invoicing, tracks payments, and provides real-time
              insights so you can focus on growing your business.
            </p>

            {/* Feature List */}
            <div className="space-y-4 mb-8">
              {[
                {
                  icon: FileSearch,
                  title: 'AI-Powered Invoice Processing',
                  desc: 'Extract data with high accuracy in seconds',
                },
                {
                  icon: BarChart3,
                  title: 'Real-Time Dashboard',
                  desc: 'Get insights into cash flow and outstanding payments',
                },
                {
                  icon: Bell,
                  title: 'Smart Reminders',
                  desc: 'Automated follow-ups so you get paid on time',
                },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mt-0.5 shrink-0">
                    <feature.icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{feature.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-8 h-12 text-base font-semibold shadow-xl shadow-purple-600/25 hover:shadow-purple-600/40 transition-all duration-300"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-xl px-8 h-12 text-base font-medium border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Play className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                  View Demo
                </Button>
              </a>
            </div>

            {/* Disclaimer */}
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No credit card required. Cancel anytime.</p>
            </div>
          </motion.div>

          {/* Right — Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl shadow-purple-900/10 dark:shadow-purple-900/30 border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
              {/* Mini dashboard header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">invoiceIQ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">Acme Solutions</span>
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                    <Users className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-3 p-4">
                {[
                  { label: 'Total Invoices', value: '128', change: '+12%', up: true, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                  { label: 'Paid Amount', value: '₹48,650', change: '+18%', up: true, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                  { label: 'Outstanding', value: '₹16,240', change: '-5%', up: true, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Overdue', value: '₹4,320', change: '-8%', up: true, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{stat.label}</p>
                    <p className={`text-lg font-bold ${stat.color} mt-0.5`}>{stat.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <CheckCircle2 className={`h-3 w-3 ${stat.up ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500'}`} />
                      <span className={`text-[10px] font-medium ${stat.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                        {stat.change} from last month
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mini chart */}
              <div className="px-4 pb-2">
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-3">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mb-3">Cash Flow Overview</p>
                  <div className="flex items-end gap-1.5 h-16">
                    {[35, 55, 40, 65, 50, 75, 60, 85, 70, 90, 80, 95].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className={`w-full rounded-sm ${i >= 9 ? 'bg-purple-500' : 'bg-purple-200 dark:bg-purple-800'}`}
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[7px] text-gray-300 dark:text-gray-600">
                          {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent invoices table */}
              <div className="px-4 pb-4">
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-3">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mb-2">Recent Invoices</p>
                  <div className="space-y-2">
                    {[
                      { id: 'INV-001', customer: 'Acme Corp', amount: '₹2,450', status: 'Paid', statusColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
                      { id: 'INV-002', customer: 'Globex Inc', amount: '₹1,800', status: 'Pending', statusColor: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
                      { id: 'INV-003', customer: 'Wayne Ent.', amount: '₹5,200', status: 'Paid', statusColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
                    ].map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{inv.id}</span>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{inv.customer}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{inv.amount}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${inv.statusColor}`}>
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="absolute -bottom-4 -left-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Data Extracted</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Successfully processed</p>
                </div>
              </div>
            </motion.div>

            {/* Floating stat card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 1 }}
              className="absolute -top-3 -right-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">₹48,650</p>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">+18% this month</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
