import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { execSync } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const MAX_IMAGE_SIZE = 4 * 1024 * 1024 // 4MB max for vision API
const TEMP_DIR = '/tmp/invoiceai'

// Ensure temp directory exists
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true })
}

export async function POST(request: NextRequest) {
  let tempPdfPath: string | null = null
  let tempPngPath: string | null = null

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF, PNG, JPG, or WebP image.' },
        { status: 400 }
      )
    }

    // File size limit: 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const originalBuffer = Buffer.from(bytes)

    let processedBuffer: Buffer
    let processedType: string

    if (file.type === 'application/pdf') {
      // Convert PDF to PNG using pdftoppm (poppler-utils)
      const fileId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      tempPdfPath = join(TEMP_DIR, `${fileId}.pdf`)
      tempPngPath = join(TEMP_DIR, `${fileId}`)

      writeFileSync(tempPdfPath, originalBuffer)

      try {
        execSync(`pdftoppm -png -r 200 -singlefile "${tempPdfPath}" "${tempPngPath}"`, {
          timeout: 30000,
          stdio: 'pipe',
        })
        const pngFile = `${tempPngPath}.png`
        processedBuffer = readFileSync(pngFile)

        // Clean up the pdftoppm output file
        try { unlinkSync(pngFile) } catch { /* ignore */ }
      } catch {
        return NextResponse.json(
          { error: 'Could not read this PDF. Please try uploading a screenshot of it as PNG/JPG instead.' },
          { status: 400 }
        )
      }

      // Resize if needed
      const metadata = await sharp(processedBuffer).metadata()
      if (metadata.width && metadata.width > 2000) {
        processedBuffer = await sharp(processedBuffer)
          .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
          .png({ quality: 85 })
          .toBuffer()
      }

      processedType = 'image/png'
    } else {
      // Process image: resize and compress if needed
      processedType = file.type === 'image/gif' ? 'image/png' : file.type

      const metadata = await sharp(originalBuffer).metadata()

      if (originalBuffer.length > MAX_IMAGE_SIZE || (metadata.width && metadata.width > 2000)) {
        processedBuffer = await sharp(originalBuffer)
          .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer()
        processedType = 'image/jpeg'
      } else {
        processedBuffer = originalBuffer
      }
    }

    const base64 = processedBuffer.toString('base64')

    return NextResponse.json({
      fileName: file.name,
      imageData: `data:${processedType};base64,${base64}`,
      size: processedBuffer.length,
      type: processedType,
      originalSize: file.size,
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to process file. Please try a different format or a clearer image.' },
      { status: 500 }
    )
  } finally {
    // Clean up temp files
    try { if (tempPdfPath) unlinkSync(tempPdfPath) } catch { /* ignore */ }
    try { if (tempPngPath) unlinkSync(`${tempPngPath}.png`) } catch { /* ignore */ }
  }
}
