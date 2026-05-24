
import {
  initializeApp,
  getApps,
  cert,
  type App,
} from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getStorage, type Storage } from 'firebase-admin/storage'

let app: App | null = null
let db: Firestore | null = null
let storage: Storage | null = null

export function getFirebaseApp(): App | null {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    console.log('[Firebase] Not configured — using local database')
    return null
  }

  try {
    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })
    return app
  } catch (error) {
    console.error('[Firebase] Init failed:', error)
    return null
  }
}

export function getFirebaseDb(): Firestore | null {
  if (db) return db
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null
  db = getFirestore(firebaseApp)
  return db
}

export function getFirebaseStorage(): Storage | null {
  if (storage) return storage
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null
  storage = getStorage(firebaseApp)
  return storage
}

export const isFirebaseEnabled = (): boolean => {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  )
}
