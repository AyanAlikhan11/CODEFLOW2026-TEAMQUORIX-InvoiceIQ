'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HistoryLogoutGuard() {
  const router = useRouter()

  useEffect(() => {
    // Push a fake history entry so we can detect back navigation
    window.history.pushState({ page: 'guard' }, '', window.location.href)

    const handlePopState = async () => {
      try {
        // Call logout API
        await fetch('/api/auth/logout', {
          method: 'POST',
        })

        // Redirect to login
        router.replace('/login')
      } catch (err) {
        console.error('Logout on history navigation failed:', err)
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [router])

  return null
}