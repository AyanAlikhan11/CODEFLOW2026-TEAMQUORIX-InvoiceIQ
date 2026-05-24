import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { imageData, fileName } = body

    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      )
    }

    // =========================================
    // CALL PYTHON AI SERVICE
    // =========================================

    const aiResponse = await fetch(
      'http://localhost:8000/extract',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          image: imageData,
          fileName,
        }),
      }
    )

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()

      console.error('AI Service Error:', errorText)

      return NextResponse.json(
        {
          error: 'AI service failed',
        },
        {
          status: 500,
        }
      )
    }

    const aiData = await aiResponse.json()

    return NextResponse.json({
      success: true,
      data: aiData,
    })
  } catch (error) {
    console.error('Analyze Route Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to analyze invoice',
      },
      {
        status: 500,
      }
    )
  }
}