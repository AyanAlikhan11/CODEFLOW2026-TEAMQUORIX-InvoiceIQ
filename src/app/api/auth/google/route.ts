import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseApp } from '@/lib/firebase'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const SEVEN_DAYS_MS = 60 * 60 * 24 * 7 * 1000

export async function POST(request: NextRequest) {
  try {
    const { uid, name, email, avatar, idToken } = await request.json()

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

    // Verify ID token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error: unknown) {
      console.error('[Google Auth Error] ID token verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid or expired ID token' },
        { status: 401 }
      )
    }

    const userId = uid || decodedToken.uid
    const firestore = getFirestore(firebaseApp)

    // Create session cookie
    let sessionCookie: string
    try {
      sessionCookie = await auth.createSessionCookie(idToken, {
        expiresIn: SEVEN_DAYS_MS,
      })
    } catch (error: unknown) {
      console.error('[Google Auth Error] Session cookie creation failed:', error)
      return NextResponse.json(
        { error: 'Failed to create session. Please try signing in again.' },
        { status: 500 }
      )
    }

    // Build profile data from token + request body
    const profileData = {
      name: name || decodedToken.name || 'User',
      email: email || decodedToken.email || '',
      company: '',
      avatar: avatar || decodedToken.picture || '',
      role: 'user',
      provider: 'google' as const,
      updatedAt: new Date().toISOString(),
    }

    // Create or update user profile in Firestore
    const userDoc = await firestore.collection('users').doc(userId).get()
    if (userDoc.exists) {
      // Update existing profile — merge to preserve existing fields like company/role
      await firestore.collection('users').doc(userId).set(profileData, { merge: true })
    } else {
      // Create new profile for Google user
      await firestore.collection('users').doc(userId).set({
        ...profileData,
        createdAt: new Date().toISOString(),
      })
    }

    // Read back the final profile to return
    const finalDoc = await firestore.collection('users').doc(userId).get()
    const finalData = finalDoc.data()!

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: finalData.name || profileData.name,
        email: finalData.email || profileData.email,
        company: finalData.company || '',
        avatar: finalData.avatar || profileData.avatar,
        role: finalData.role || 'user',
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
    console.error('[Google Auth Error]', error)
    const message = error instanceof Error ? error.message : 'Google sign-in failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
