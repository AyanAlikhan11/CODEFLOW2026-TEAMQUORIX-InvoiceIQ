const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function analyzeInvoice(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${FASTAPI_URL}/analyze`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error('FastAPI analyze failed')
  }

  return res.json()
}

export async function analyzeBatch(files: File[]) {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))

  const res = await fetch(`${FASTAPI_URL}/analyze/batch`, {
    method: 'POST',
    body: formData,
  })

  return res.json()
}