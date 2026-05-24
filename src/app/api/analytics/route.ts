import { NextResponse } from 'next/server'
import { database } from '@/lib/database'

export async function POST() {
  try {
    const analytics = await database.getAnalytics()
    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to generate analytics' },
      { status: 500 }
    )
  }
}
