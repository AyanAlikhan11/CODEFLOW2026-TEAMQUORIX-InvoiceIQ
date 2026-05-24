import * as bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET =
  process.env.JWT_SECRET || 'super-secret-key'

// Hash password
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

// Verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string
) {
  return bcrypt.compare(password, hashedPassword)
}

// Create session token
export async function createSession(userId: string) {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// Verify session token
export async function verifySession(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    return decoded as {
      userId: string
    }
  } catch (error) {
    return null
  }
}