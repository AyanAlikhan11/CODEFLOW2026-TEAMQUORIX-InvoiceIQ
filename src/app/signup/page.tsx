'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Receipt, Mail, Lock, Eye, EyeOff, Loader2, User, Building2, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignupPage() {
  const { signup } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordStrength = () => {
    if (password.length === 0) return { level: 0, text: '', color: '' }
    if (password.length < 6) return { level: 1, text: 'Weak', color: 'bg-red-400' }
    if (password.length < 8) return { level: 2, text: 'Fair', color: 'bg-amber-400' }
    const hasUpper = /[A-Z]/.test(password)
    const hasNum = /[0-9]/.test(password)
    if (hasUpper && hasNum) return { level: 4, text: 'Strong', color: 'bg-emerald-400' }
    return { level: 3, text: 'Good', color: 'bg-blue-400' }
  }

  const strength = passwordStrength()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name || !email || !password) {
      setError('Please fill in all required fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const result = await signup(name, email, password, company)
    setLoading(false)

    if (result.success) {
      router.push('/dashboard')
    } else {
      setError(result.error || 'Signup failed')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-purple-600 to-purple-800 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 max-w-md text-center text-white">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
            <Receipt className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Start Your Free Trial Today
          </h2>
          <p className="text-purple-200 leading-relaxed mb-8">
            Join 10,000+ businesses that trust InvoiceIQ for intelligent
            invoice processing and financial insights.
          </p>

          <div className="space-y-4 text-left">
            {[
              'AI-powered invoice extraction with 99.2% accuracy',
              'Real-time fraud detection and alerts',
              'GST analytics with automatic breakdowns',
              'Spending predictions and budget tracking',
              'No credit card required to start',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0" />
                <span className="text-sm text-purple-100">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              invoice<span className="text-purple-500 dark:text-purple-400">IQ</span>
            </span>
          </Link>

          {/* Back to Home */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 mb-8 transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />
            Back to Home
          </Link>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create your account</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Get started for free. No credit card required.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus-visible:ring-purple-500/50"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Work Email <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus-visible:ring-purple-500/50"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Company <span className="text-gray-400 dark:text-gray-500">(optional)</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="company"
                  type="text"
                  placeholder="Acme Inc."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus-visible:ring-purple-500/50"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Password <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus-visible:ring-purple-500/50"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password Strength */}
              {password.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} rounded-full transition-all duration-300`}
                      style={{ width: `${(strength.level / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{strength.text}</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-purple-600/25 transition-all duration-300"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                'Create Account'
              )}
            </Button>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              By signing up, you agree to our{' '}
              <a href="#" className="text-purple-600 dark:text-purple-400 hover:underline">Terms</a> and{' '}
              <a href="#" className="text-purple-600 dark:text-purple-400 hover:underline">Privacy Policy</a>
            </p>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
