import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseApp } from '@/lib/firebase'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const SEVEN_DAYS_MS = 60 * 60 * 24 * 7 * 1000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, name, email, company, avatar, idToken } = body

    if (!uid || !email || !name) {
      return NextResponse.json(
        { error: 'uid, name, and email are required' },
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

    // Verify the idToken if provided
    let verifiedUid = uid
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        verifiedUid = decodedToken.uid
      } catch (error: unknown) {
        console.error('[Register Error] ID token verification failed:', error)
        return NextResponse.json(
          { error: 'Invalid or expired ID token' },
          { status: 401 }
        )
      }
    }

    // Check if user profile already exists in Firestore
    try {
      const existingDoc = await firestore.collection('users').doc(verifiedUid).get()
      if (existingDoc.exists) {
        return NextResponse.json(
          { error: 'An account with this user already exists' },
          { status: 409 }
        )
      }
    } catch (error: unknown) {
      console.error('[Register Error] Firestore read check failed:', error)
      return NextResponse.json(
        { error: 'Failed to check existing user. Please try again.' },
        { status: 500 }
      )
    }

    // Create user profile document in Firestore
    const userProfile = {
      name,
      email,
      company: company || '',
      avatar: avatar || '',
      role: 'user',
      provider: 'email',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      await firestore.collection('users').doc(verifiedUid).set(userProfile)
    } catch (error: unknown) {
      console.error('[Register Error] Firestore write failed:', error)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Create session cookie if idToken is provided
    let sessionCookie: string | null = null
    if (idToken) {
      try {
        sessionCookie = await auth.createSessionCookie(idToken, {
          expiresIn: SEVEN_DAYS_MS,
        })
      } catch (error: unknown) {
        console.error('[Register Error] Session cookie creation failed:', error)
        // Registration succeeded but session creation failed — still return success
      }
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: verifiedUid,
        name: userProfile.name,
        email: userProfile.email,
        company: userProfile.company,
        avatar: userProfile.avatar,
        role: userProfile.role,
      },
    })

    if (sessionCookie) {
      response.cookies.set('session', sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
    }

    return response
  } catch (error: unknown) {
    console.error('[Register Error]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
