'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HistoryLogoutGuard() {
  const router = useRouter()

  useEffect(() => {
    // Create history trap
    window.history.pushState({ page: 'guard' }, '', window.location.href)

    const handlePopState = async () => {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
        })

        router.replace('/login')
        router.refresh()
      } catch (err) {
        console.error('Logout failed on navigation:', err)
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [router])

  return null
}