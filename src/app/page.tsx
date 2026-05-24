'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LandingNavbar } from '@/components/landing/navbar'
import { HeroSection } from '@/components/landing/hero'
import { FeaturesSection } from '@/components/landing/features'
import { HowItWorksSection } from '@/components/landing/how-it-works'
import { TrustedBySection } from '@/components/landing/trusted-by'
import { LandingFooter } from '@/components/landing/footer'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0e1a]">
      <LandingNavbar />
      <HeroSection />
      <TrustedBySection />
      <FeaturesSection />
      <HowItWorksSection />
      <LandingFooter />
    </div>
  )
}
