// Firebase Admin SDK — server-side only
// Used for session verification, Firestore access, and admin operations.

import {
  initializeApp,
  getApps,
  cert,
  type App,
} from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getStorage, type Storage } from 'firebase-admin/storage'
import { getAuth, type Auth } from 'firebase-admin/auth'

let app: App | null = null
let firestore: Firestore | null = null
let storage: Storage | null = null
let firebaseAuth: Auth | null = null

export function getFirebaseApp(): App | null {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase] Admin SDK not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env')
    return null
  }

  try {
    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })
    return app
  } catch (error) {
    console.error('[Firebase] Admin SDK init failed:', error)
    return null
  }
}

export function getFirebaseDb(): Firestore | null {
  if (firestore) return firestore
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null
  firestore = getFirestore(firebaseApp)
  return firestore
}

export function getFirebaseStorage(): Storage | null {
  if (storage) return storage
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null
  storage = getStorage(firebaseApp)
  return storage
}

export function getFirebaseAuth(): Auth | null {
  if (firebaseAuth) return firebaseAuth
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null
  firebaseAuth = getAuth(firebaseApp)
  return firebaseAuth
}

export function isFirebaseEnabled(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  )
}

/**
 * Verify a Firebase session cookie and return the decoded UID.
 * Returns null if the cookie is invalid or Firebase is not configured.
 */
export async function verifySessionCookie(sessionCookie: string): Promise<{ uid: string; email?: string; name?: string; picture?: string } | null> {
  const auth = getFirebaseAuth()
  if (!auth) return null

  try {
    const decoded = await auth.verifySessionCookie(sessionCookie, true)
    return {
      uid: decoded.uid,
      email: decoded.email || undefined,
      name: decoded.name || undefined,
      picture: decoded.picture || undefined,
    }
  } catch {
    return null
  }
}

/**
 * Create a Firestore document reference under a user's sub-collection.
 */
export function getUserCollection(collectionName: string, uid: string) {
  const db = getFirebaseDb()
  if (!db) return null
  return db.collection('users').doc(uid).collection(collectionName)
}
