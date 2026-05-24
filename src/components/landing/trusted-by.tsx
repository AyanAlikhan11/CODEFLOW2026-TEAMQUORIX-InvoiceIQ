'use client'

import { motion } from 'framer-motion'

const companies = [
  'Acme Corp',
  'Globex',
  'Innotech',
  'Stark Industries',
  'Wayne Enterprises',
  'Umbrella Corp',
]

export function TrustedBySection() {
  return (
    <section className="py-16 bg-gray-50/50 dark:bg-gray-900/30 border-y border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-center text-sm font-medium text-gray-400 dark:text-gray-500 mb-8 uppercase tracking-wider">
            Trusted by businesses of all sizes
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {companies.map((company, i) => (
              <motion.div
                key={company}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex items-center gap-2 text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                    {company.charAt(0)}
                  </span>
                </div>
                <span className="text-lg font-semibold">{company}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
