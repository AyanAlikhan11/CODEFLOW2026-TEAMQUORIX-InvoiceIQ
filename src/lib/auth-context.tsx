'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload as firebaseReload,
  updatePassword,
  deleteUser,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth, googleProvider, isClientConfigured } from '@/lib/firebase-client'

export interface AuthUser {
  id: string
  name: string
  email: string
  company: string
  avatar: string
  role: string
  emailVerified: boolean
}

interface AuthContextType {
  user: AuthUser | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  firebaseConfigured: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (name: string, email: string, password: string, company?: string) => Promise<{ success: boolean; error?: string }>
  googleSignIn: () => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  sendVerificationEmail: () => Promise<{ success: boolean; error?: string }>
  updateProfile: (data: { name?: string; company?: string; avatar?: string }) => Promise<{ success: boolean; error?: string }>
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
  deleteAccount: () => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const buildAuthUser = useCallback((uid: string, fbUser: FirebaseUser | null, profileData?: Record<string, unknown>): AuthUser => {
    return {
      id: uid,
      name: (profileData?.name as string) || fbUser?.displayName || 'User',
      email: (profileData?.email as string) || fbUser?.email || '',
      company: (profileData?.company as string) || '',
      avatar: (profileData?.avatar as string) || fbUser?.photoURL || '',
      role: (profileData?.role as string) || 'user',
      emailVerified: fbUser?.emailVerified || false,
    }
  }, [])

  const syncSession = useCallback(async (idToken: string) => {
    try {
      const res = await fetch('/api/auth/session-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.user) return data.user as Record<string, unknown>
      }
    } catch (err) {
      console.error('[Auth] Session sync failed:', err)
    }
    return null
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    if (!isClientConfigured) {
      const timer = setTimeout(() => setLoading(false), 0)
      return () => clearTimeout(timer)
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser)
        try {
          const idToken = await fbUser.getIdToken()
          const profileData = await syncSession(idToken)
          setUser(buildAuthUser(fbUser.uid, fbUser, profileData || undefined))
        } catch {
          setUser(buildAuthUser(fbUser.uid, fbUser))
        }
      } else {
        setFirebaseUser(null)
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [syncSession, buildAuthUser])

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      const idToken = await result.user.getIdToken()
      const profileData = await syncSession(idToken)
      setUser(buildAuthUser(result.user.uid, result.user, profileData || undefined))
      return { success: true }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      const code = err.code || ''
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        return { success: false, error: 'Invalid email or password' }
      }
      if (code === 'auth/invalid-email') {
        return { success: false, error: 'Invalid email address' }
      }
      if (code === 'auth/too-many-requests') {
        return { success: false, error: 'Too many attempts. Please try again later.' }
      }
      if (code === 'auth/user-disabled') {
        return { success: false, error: 'This account has been disabled. Contact support.' }
      }
      return { success: false, error: err.message || 'Login failed' }
    }
  }

  const signup = async (name: string, email: string, password: string, company?: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName: name })

      // Optionally send email verification
      try {
        await sendEmailVerification(result.user)
      } catch {
        // Email verification may fail in dev — non-blocking
      }

      const idToken = await result.user.getIdToken()

      // Sync profile to backend (Firestore)
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: result.user.uid,
          name,
          email,
          company: company || '',
          avatar: '',
          idToken,
        }),
      })

      const profileData = await syncSession(idToken)
      setUser(buildAuthUser(result.user.uid, result.user, profileData || undefined))
      return { success: true }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      const code = err.code || ''
      if (code === 'auth/email-already-in-use') {
        return { success: false, error: 'An account with this email already exists' }
      }
      if (code === 'auth/weak-password') {
        return { success: false, error: 'Password must be at least 6 characters' }
      }
      if (code === 'auth/invalid-email') {
        return { success: false, error: 'Invalid email address' }
      }
      return { success: false, error: err.message || 'Signup failed' }
    }
  }

  const googleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      const name = result.user.displayName || 'User'

      await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: result.user.uid,
          name,
          email: result.user.email,
          avatar: result.user.photoURL || '',
          idToken,
        }),
      })

      const profileData = await syncSession(idToken)
      setUser(buildAuthUser(result.user.uid, result.user, profileData || undefined))
      return { success: true }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      const code = err.code || ''
      if (code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Sign-in popup was closed' }
      }
      if (code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'Sign-in was cancelled' }
      }
      return { success: false, error: err.message || 'Google sign-in failed' }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      const code = err.code || ''
      if (code === 'auth/user-not-found') {
        return { success: false, error: 'No account found with this email' }
      }
      if (code === 'auth/invalid-email') {
        return { success: false, error: 'Invalid email address' }
      }
      return { success: false, error: err.message || 'Failed to send reset email' }
    }
  }

  const sendVerificationEmail = async () => {
    if (!firebaseUser) return { success: false, error: 'Not authenticated' }
    try {
      await sendEmailVerification(firebaseUser)
      return { success: true }
    } catch (error: unknown) {
      const err = error as { message?: string }
      return { success: false, error: err.message || 'Failed to send verification email' }
    }
  }

  const updateProfileData = async (data: { name?: string; company?: string; avatar?: string }) => {
    try {
      if (data.name && firebaseUser) {
        await updateProfile(firebaseUser, { displayName: data.name })
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const updated = await res.json()
        if (updated.user) {
          setUser((prev) => prev ? { ...prev, ...updated.user } : prev)
        }
        return { success: true }
      }
      return { success: false, error: 'Failed to update profile' }
    } catch {
      return { success: false, error: 'Failed to update profile' }
    }
  }

  const changePassword = async (newPassword: string) => {
    if (!firebaseUser) return { success: false, error: 'Not authenticated' }
    try {
      await updatePassword(firebaseUser, newPassword)
      return { success: true }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      const code = err.code || ''
      if (code === 'auth/weak-password') {
        return { success: false, error: 'Password must be at least 6 characters' }
      }
      if (code === 'auth/requires-recent-login') {
        return { success: false, error: 'Please sign out and sign in again before changing your password' }
      }
      return { success: false, error: err.message || 'Failed to update password' }
    }
  }

  const deleteAccount = async () => {
    if (!firebaseUser) return { success: false, error: 'Not authenticated' }
    try {
      // Delete user profile from Firestore
      try {
        await fetch('/api/auth/profile', { method: 'DELETE' })
      } catch {
        // Continue with Firebase deletion
      }
      await deleteUser(firebaseUser)
      setUser(null)
      setFirebaseUser(null)
      return { success: true }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string }
      const code = err.code || ''
      if (code === 'auth/requires-recent-login') {
        return { success: false, error: 'Please sign out and sign in again before deleting your account' }
      }
      return { success: false, error: err.message || 'Failed to delete account' }
    }
  }

  const logout = async () => {
    try {
      await firebaseSignOut(auth)
    } catch {
      // Continue with logout
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Continue with logout
    }
    setUser(null)
    setFirebaseUser(null)
    router.push('/')
  }

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      firebaseConfigured: isClientConfigured,
      login,
      signup,
      googleSignIn,
      logout,
      resetPassword,
      sendVerificationEmail,
      updateProfile: updateProfileData,
      changePassword,
      deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
