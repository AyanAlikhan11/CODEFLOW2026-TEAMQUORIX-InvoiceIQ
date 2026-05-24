import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const session = await verifySession(token)

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // Since no Prisma → return session user directly
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email || null,
        name: session.name || null,
        role: session.role || 'user',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    )
  }
}