import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import os from 'os'

const MAX_IMAGE_SIZE = 4 * 1024 * 1024

const TEMP_DIR = join(os.tmpdir(), 'invoiceai')

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true })
}

export async function POST(request: NextRequest) {
  let tempPath: string | null = null

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]

    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let processed: Buffer

    // ✅ SIMPLE + RELIABLE PDF HANDLING (NO poppler dependency)
    if (file.type === 'application/pdf') {
      return NextResponse.json(
        {
          error:
            'PDF upload detected. Please upload a screenshot (PNG/JPG) for now.',
        },
        { status: 400 }
      )
    }

    // IMAGE PROCESSING ONLY
    const metadata = await sharp(buffer).metadata()

    if (
      buffer.length > MAX_IMAGE_SIZE ||
      (metadata.width && metadata.width > 2000)
    ) {
      processed = await sharp(buffer)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()
    } else {
      processed = buffer
    }

    const base64 = processed.toString('base64')

    return NextResponse.json({
      fileName: file.name,
      imageData: base64, // 🔥 IMPORTANT: no prefix
      mimeType: 'image/jpeg',
      size: processed.length,
    })
  } catch (err) {
    console.error('Upload error:', err)

    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  } finally {
    if (tempPath) {
      try {
        unlinkSync(tempPath)
      } catch {}
    }
  }
}