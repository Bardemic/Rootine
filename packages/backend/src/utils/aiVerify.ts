import '../config'
import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

// Lazy creation to avoid overhead until used
let _model: any | null = null

function getModel() {
  if (_model) return _model
  const openai = createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost',
      'X-Title': process.env.OPENROUTER_APP_TITLE || 'Rootine',
    },
  })
  const modelId = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'
  _model = openai(modelId)
  return _model
}

export const verificationSchema = z.object({
  ok: z.boolean(),
})

export type VerificationResult = z.infer<typeof verificationSchema>

export type VerifyImageArgs = {
  // The public or data URL of the image
  imageUrl: string
  // The goal title
  title: string
  // Optional user-provided description/context
  description?: string
  // Optional system or user prompt (kept empty by default; caller can pass)
  prompt?: string
}

/**
 * Calls an LLM to verify whether the uploaded image matches the expected goal.
 * Returns a boolean inside a zod-validated object.
 */
export async function verifyImageWithAI(args: VerifyImageArgs): Promise<VerificationResult> {
  const { imageUrl, title, description, prompt } = args

  if (!process.env.OPENROUTER_API_KEY) {
    // If not configured, default to allow to avoid blocking during local dev
    return { ok: true }
  }

  const model = getModel()

  // Empty by default; user can set prompt via env or args
  const systemPrompt = (prompt ?? process.env.IMAGE_VERIFY_PROMPT ?? `
    You are an AI assistant used on Rootine, a habit tracker app.
    Rootine lets users create habits they want to keep up, and are rewarded with coins when they do.
    They upload photos to prove they've completed the habit. I need you to verify that the image is relevant to the habit.
    Don't be too strict with the verification, but if the image is clearly not relevant to the habit, return false.
    For example, if someone says they want to walk their dog, but it is a photo of them playing video games, return false.
    `).trim()

  // Build messages with image input and metadata
  const messages: any[] = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({
    role: 'user',
    content: [
      { type: 'text', text: `Goal title: ${title}` },
      { type: 'text', text: `User description: ${description || ''}` },
      { type: 'text', text: 'Return strictly JSON matching {"ok": boolean} and nothing else.' },
      { type: 'image', image: imageUrl },
    ],
  })

  try {
    const { object } = await generateObject({
      model,
      messages,
      temperature: 0,
      schema: verificationSchema,
    })
    // object is already validated by zod
    return object as VerificationResult
  } catch (err) {
    console.error('verifyImageWithAI error', err)
    // On error, fail safe and reject the upload
    return { ok: false }
  }
}

