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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth: Auth = getAuth(app)
const googleProvider: GoogleAuthProviderType = new GoogleAuthProvider().addScope('email').addScope('profile')

export { app, auth, googleProvider, isClientConfigured }
