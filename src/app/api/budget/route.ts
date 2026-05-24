import { NextRequest, NextResponse } from 'next/server'
import { database } from '@/lib/database'

export async function GET() {
  try {
    const budgets = await database.getBudgets()
    return NextResponse.json({ budgets })
  } catch (error) {
    console.error('Failed to fetch budgets:', error)
    return NextResponse.json({ budgets: [] }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { category, allocated, period, alertThreshold } = await request.json()

    if (!category || !allocated || allocated <= 0) {
      return NextResponse.json(
        { error: 'Category and a valid amount are required' },
        { status: 400 }
      )
    }

    const validPeriods = ['monthly', 'quarterly']
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: 'Period must be monthly or quarterly' },
        { status: 400 }
      )
    }

    const threshold = Math.min(100, Math.max(50, Number(alertThreshold) || 80))

    await database.createBudget({
      category: String(category),
      allocated: Number(allocated),
      period: String(period),
      alertThreshold: threshold,
    })

    const budgets = await database.getBudgets()
    return NextResponse.json({ budgets })
  } catch (error) {
    console.error('Failed to create budget:', error)
    return NextResponse.json(
      { error: 'Failed to create budget. Please try again.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Budget ID is required' },
        { status: 400 }
      )
    }

    await database.deleteBudget(id)

    const budgets = await database.getBudgets()
    return NextResponse.json({ budgets })
  } catch (error) {
    console.error('Failed to delete budget:', error)
    return NextResponse.json(
      { error: 'Failed to delete budget' },
      { status: 500 }
    )
  }
}
