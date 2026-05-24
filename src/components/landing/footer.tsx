'use client'

import Link from 'next/link'
import { Receipt } from 'lucide-react'

export function LandingFooter() {
  const footerLinks = {
    Product: ['Features', 'Pricing', 'API', 'Integrations', 'Security'],
    Company: ['About', 'Blog', 'Careers', 'Press', 'Contact'],
    Resources: ['Documentation', 'Help Center', 'Community', 'Status', 'Changelog'],
    Legal: ['Privacy', 'Terms', 'Cookie Policy', 'GDPR'],
  }

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                invoice<span className="text-purple-400">IQ</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed">
              AI-powered invoice intelligence platform for modern businesses.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} InvoiceIQ. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm hover:text-white transition-colors">
              Twitter
            </a>
            <a href="#" className="text-sm hover:text-white transition-colors">
              LinkedIn
            </a>
            <a href="#" className="text-sm hover:text-white transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
