import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseApp } from '@/lib/firebase'
import { getAuth } from 'firebase-admin/auth'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      )
    }

    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      return NextResponse.json(
        { error: 'Firebase is not configured. Please contact the administrator.' },
        { status: 500 }
      )
    }

    const auth = getAuth(firebaseApp)

    try {
      const resetLink = await auth.generatePasswordResetLink(email)
      return NextResponse.json({
        success: true,
        message: 'Password reset link generated successfully.',
        resetLink,
      })
    } catch (error: unknown) {
      // Firebase throws if the email doesn't have an account — we don't leak that info
      console.error('[Reset Password Error]', error)
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been generated.',
      })
    }
  } catch (error: unknown) {
    console.error('[Reset Password Error]', error)
    const message = error instanceof Error ? error.message : 'Failed to process password reset'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
