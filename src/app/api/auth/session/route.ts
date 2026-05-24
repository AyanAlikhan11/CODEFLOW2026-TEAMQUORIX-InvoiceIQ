import { NextResponse } from 'next/server'
import { getFirebaseApp } from '@/lib/firebase'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const auth = getAuth(firebaseApp)

    // Verify session cookie
    let decodedToken
    try {
      decodedToken = await auth.verifySessionCookie(sessionToken, true)
    } catch {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const uid = decodedToken.uid

    // Get user profile from Firestore
    const firestore = getFirestore(firebaseApp)
    try {
      const userDoc = await firestore.collection('users').doc(uid).get()
      if (userDoc.exists) {
        const data = userDoc.data()!
        return NextResponse.json({
          authenticated: true,
          user: {
            id: uid,
            name: data.name || decodedToken.name || 'User',
            email: data.email || decodedToken.email || '',
            company: data.company || '',
            avatar: data.avatar || decodedToken.picture || '',
            role: data.role || 'user',
          },
        })
      }
    } catch (error: unknown) {
      console.error('[Session Error] Firestore read failed:', error)
    }

    // No Firestore profile found — return basic info from the token
    return NextResponse.json({
      authenticated: true,
      user: {
        id: uid,
        name: decodedToken.name || 'User',
        email: decodedToken.email || '',
        company: '',
        avatar: decodedToken.picture || '',
        role: 'user',
      },
    })
  } catch (error) {
    console.error('[Session Error]', error)
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
