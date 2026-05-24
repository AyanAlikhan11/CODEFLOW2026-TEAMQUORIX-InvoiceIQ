// Google Gemini AI Configuration
// Uses @google/generative-ai SDK — works with Gemini 2.5 Flash/Pro
// Set GEMINI_API_KEY in your .env.local to enable

import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (genAI) return genAI

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to your .env.local file.\n' +
      'Get your key at: https://aistudio.google.com/app/apikey'
    )
  }

  genAI = new GoogleGenerativeAI(apiKey)
  return genAI
}

// ─── Models ────────────────────────────────────────────────────────────────

/** Text-only model (chat, insights generation) */
export function getTextModel(modelName = 'gemini-2.5-flash') {
  return getGenAI().getGenerativeModel({ model: modelName })
}

/** Vision model (invoice OCR, image analysis) */
export function getVisionModel(modelName = 'gemini-2.5-flash') {
  return getGenAI().getGenerativeModel({ model: modelName })
}
