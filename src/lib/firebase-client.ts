// Firebase Client SDK — browser-side only
// Used for authentication (sign in, sign up, Google OAuth), onAuthStateChanged listener.

import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth, type GoogleAuthProvider as GoogleAuthProviderType } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

const isClientConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId)

const app = isClientConfigured
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null

const auth: Auth | null = app ? getAuth(app) : null
const googleProvider: GoogleAuthProviderType | null = app ? new GoogleAuthProvider().addScope('email').addScope('profile') : null

export { app, auth, googleProvider, isClientConfigured }
