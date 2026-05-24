import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseApp } from '@/lib/firebase'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const SEVEN_DAYS_MS = 60 * 60 * 24 * 7 * 1000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { idToken, email, password } = body

    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      return NextResponse.json(
        { error: 'Firebase is not configured. Please contact the administrator.' },
        { status: 500 }
      )
    }

    const auth = getAuth(firebaseApp)

    if (!idToken && !email) {
      return NextResponse.json(
        { error: 'ID token or email and password are required' },
        { status: 400 }
      )
    }

    // --- Preferred path: verify Firebase ID token ---
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        const uid = decodedToken.uid
        const tokenEmail = decodedToken.email || email || ''

        // Get or create user profile in Firestore
        const firestore = getFirestore(firebaseApp)
        let userProfile = {
          name: decodedToken.name || 'User',
          company: '',
          avatar: decodedToken.picture || '',
          role: 'user',
        }

        const userDoc = await firestore.collection('users').doc(uid).get()
        if (userDoc.exists) {
          const data = userDoc.data()!
          userProfile = {
            name: data.name || decodedToken.name || 'User',
            company: data.company || '',
            avatar: data.avatar || decodedToken.picture || '',
            role: data.role || 'user',
          }
        } else {
          // First-time login — create profile
          await firestore.collection('users').doc(uid).set({
            name: decodedToken.name || 'User',
            email: tokenEmail,
            company: '',
            avatar: decodedToken.picture || '',
            role: 'user',
            provider: 'email',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }

        // Create session cookie (7 day expiry)
        const sessionCookie = await auth.createSessionCookie(idToken, {
          expiresIn: SEVEN_DAYS_MS,
        })

        const response = NextResponse.json({
          success: true,
          user: {
            id: uid,
            name: userProfile.name,
            email: tokenEmail,
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
        console.error('[Login Error] ID token verification failed:', error)
        const message = error instanceof Error ? error.message : 'Invalid ID token'
        return NextResponse.json({ error: message }, { status: 401 })
      }
    }

    // --- Backward-compat path: email + password ---
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required when no ID token is provided' },
        { status: 400 }
      )
    }

    try {
      // Use Firebase Admin to get user by email, then verify via signInWithCustomToken
      // Since Admin SDK doesn't have direct password verification,
      // we rely on the client-side signInWithEmailAndPassword which returns an idToken.
      // This endpoint expects the client to already have obtained the idToken.
      return NextResponse.json(
        { error: 'Please sign in on the client and provide an idToken. Direct email/password login is not supported server-side.' },
        { status: 400 }
      )
    } catch (error: unknown) {
      console.error('[Login Error]', error)
      const message = error instanceof Error ? error.message : 'Login failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error: unknown) {
    console.error('[Login Error]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
