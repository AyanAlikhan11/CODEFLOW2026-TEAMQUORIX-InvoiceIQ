import { NextResponse } from 'next/server'
import { getSession, destroySession } from '@/lib/auth'

export async function POST() {
  try {
    await destroySession()
    const response = NextResponse.json({ success: true })
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('[Logout Error]', error)
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 })
  }
}
