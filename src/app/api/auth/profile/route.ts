import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseApp } from '@/lib/firebase'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'

/**
 * Helper: verify the session cookie and return the decoded token, or null.
 */
async function getAuthenticatedUser(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const sessionToken = cookieStore.get('session')?.value
  if (!sessionToken) return null

  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null

  const auth = getAuth(firebaseApp)
  try {
    const decoded = await auth.verifySessionCookie(sessionToken, true)
    return decoded
  } catch {
    return null
  }
}

// ─── GET: Retrieve user profile ──────────────────────────────────────────────

export async function GET() {
  try {
    const cookieStore = await cookies()
    const decoded = await getAuthenticatedUser(cookieStore)

    if (!decoded) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      return NextResponse.json(
        { error: 'Firebase is not configured' },
        { status: 500 }
      )
    }

    const firestore = getFirestore(firebaseApp)
    const userDoc = await firestore.collection('users').doc(decoded.uid).get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const data = userDoc.data()!
    return NextResponse.json({
      success: true,
      user: {
        id: decoded.uid,
        name: data.name || '',
        email: data.email || '',
        company: data.company || '',
        avatar: data.avatar || '',
        role: data.role || 'user',
        provider: data.provider || '',
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
      },
    })
  } catch (error: unknown) {
    console.error('[Profile GET Error]', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch profile'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── PATCH: Update user profile ──────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const decoded = await getAuthenticatedUser(cookieStore)

    if (!decoded) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      return NextResponse.json(
        { error: 'Firebase is not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { name, company, avatar } = body

    // Only allow updating these specific fields
    const updates: Record<string, string> = {
      updatedAt: new Date().toISOString(),
    }
    if (typeof name === 'string') updates.name = name.trim()
    if (typeof company === 'string') updates.company = company.trim()
    if (typeof avatar === 'string') updates.avatar = avatar.trim()

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json(
        { error: 'No valid fields to update. Provide at least one of: name, company, avatar' },
        { status: 400 }
      )
    }

    const firestore = getFirestore(firebaseApp)
    await firestore.collection('users').doc(decoded.uid).set(updates, { merge: true })

    // Read back the updated profile
    const userDoc = await firestore.collection('users').doc(decoded.uid).get()
    const data = userDoc.data()!

    return NextResponse.json({
      success: true,
      user: {
        id: decoded.uid,
        name: data.name || '',
        email: data.email || '',
        company: data.company || '',
        avatar: data.avatar || '',
        role: data.role || 'user',
        provider: data.provider || '',
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
      },
    })
  } catch (error: unknown) {
    console.error('[Profile PATCH Error]', error)
    const message = error instanceof Error ? error.message : 'Failed to update profile'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── DELETE: Remove user profile and associated data ─────────────────────────

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const decoded = await getAuthenticatedUser(cookieStore)

    if (!decoded) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      return NextResponse.json(
        { error: 'Firebase is not configured' },
        { status: 500 }
      )
    }

    const firestore = getFirestore(firebaseApp)
    const userRef = firestore.collection('users').doc(decoded.uid)

    // Delete user document and all sub-collections
    try {
      // List and delete sub-collections (Firestore requires deleting docs individually)
      const collections = await userRef.listCollections()
      for (const col of collections) {
        const snapshot = await col.get()
        for (const doc of snapshot.docs) {
          await doc.ref.delete()
        }
      }
    } catch (error: unknown) {
      console.warn('[Profile DELETE] Error cleaning up sub-collections:', error)
      // Continue with deleting the main document even if sub-collections fail
    }

    await userRef.delete()

    // Optionally delete the Firebase Auth user
    try {
      const auth = getAuth(firebaseApp)
      await auth.deleteUser(decoded.uid)
    } catch (error: unknown) {
      console.warn('[Profile DELETE] Firebase Auth user deletion failed:', error)
      // Profile document is deleted, which is the primary concern
    }

    // Clear session cookie
    const response = NextResponse.json({ success: true, message: 'Account deleted successfully' })
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error: unknown) {
    console.error('[Profile DELETE Error]', error)
    const message = error instanceof Error ? error.message : 'Failed to delete account'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
