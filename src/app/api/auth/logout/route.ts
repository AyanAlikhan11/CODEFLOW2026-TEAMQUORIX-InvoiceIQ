import { NextResponse } from 'next/server'
import { getFirebaseApp } from '@/lib/firebase'
import { getAuth } from 'firebase-admin/auth'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    // Revoke Firebase refresh tokens if a valid session exists
    if (sessionToken) {
      const firebaseApp = getFirebaseApp()
      if (firebaseApp) {
        try {
          const auth = getAuth(firebaseApp)
          const decodedToken = await auth.verifySessionCookie(sessionToken)
          await auth.revokeRefreshTokens(decodedToken.uid)
        } catch {
          // Session already invalid or Firebase not configured — that's fine
        }
      }
    }

    // Clear the session cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Logout Error]', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}