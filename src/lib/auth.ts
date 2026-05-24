import { db } from './db'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export interface AuthUser {
  id: string
  name: string
  email: string
  company: string
  avatar: string
  role: string
}

// Simple password hashing (for demo — use bcrypt in production)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'invoiceiq_salt_2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  await db.session.create({
    data: {
      userId,
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    },
  })

  return token
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')?.value

  if (!sessionToken) return null

  const session = await db.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  })

  if (!session) return null

  // Check expiration
  if (new Date(session.expiresAt) < new Date()) {
    await db.session.delete({ where: { id: session.id } })
    return null
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    company: session.user.company,
    avatar: session.user.avatar,
    role: session.user.role,
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')?.value

  if (sessionToken) {
    await db.session.deleteMany({ where: { token: sessionToken } })
  }
}
