import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseApp } from '@/lib/firebase'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const SEVEN_DAYS_MS = 60 * 60 * 24 * 7 * 1000

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
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
    const firestore = getFirestore(firebaseApp)

    // Verify ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error: unknown) {
      console.error('[Session Sync Error] ID token verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid or expired ID token' },
        { status: 401 }
      )
    }

    const uid = decodedToken.uid

    // Create session cookie (7 day expiry)
    let sessionCookie: string
    try {
      sessionCookie = await auth.createSessionCookie(idToken, {
        expiresIn: SEVEN_DAYS_MS,
      })
    } catch (error: unknown) {
      console.error('[Session Sync Error] Session cookie creation failed:', error)
      return NextResponse.json(
        { error: 'Failed to create session. Please try signing in again.' },
        { status: 500 }
      )
    }

    // Get or create user profile in Firestore
    const userDoc = await firestore.collection('users').doc(uid).get()
    const userProfile: {
      name: string
      email: string
      company: string
      avatar: string
      role: string
    } = {
      name: decodedToken.name || 'User',
      email: decodedToken.email || '',
      company: '',
      avatar: decodedToken.picture || '',
      role: 'user',
    }

    if (userDoc.exists) {
      const data = userDoc.data()!
      userProfile.name = data.name || userProfile.name
      userProfile.email = data.email || userProfile.email
      userProfile.company = data.company || ''
      userProfile.avatar = data.avatar || userProfile.avatar
      userProfile.role = data.role || 'user'
    } else {
      // New user — create profile
      await firestore.collection('users').doc(uid).set({
        name: userProfile.name,
        email: userProfile.email,
        company: '',
        avatar: userProfile.avatar,
        role: 'user',
        provider: 'email',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: uid,
        name: userProfile.name,
        email: userProfile.email,
        company: userProfile.company,
        avatar: userProfile.avatar,
        role: userProfile.role,
      },
    })

    response.cookies.set('session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error: unknown) {
    console.error('[Session Sync Error]', error)
    const message = error instanceof Error ? error.message : 'Failed to sync session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
