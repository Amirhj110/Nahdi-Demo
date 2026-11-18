import type { IncomingMessage, ServerResponse } from 'node:http'
import type { TtsVoiceId } from '../src/types/chat.ts'
import { rateLimit } from './rate-limit.ts'

const TTS_URL = 'https://ai.bilyticaglobal.com/tts/speak'
const MAX_TEXT_LENGTH = 1_600
const MAX_AUDIO_BYTES = 15_000_000
const TTS_TIMEOUT_MS = 25_000
export function resolveTtsVoice(
  voice: TtsVoiceId,
  language: 'en' | 'ar',
): { voiceId: string; dialect?: string } {
  if (voice === 'ava') return { voiceId: 'publishedfemaleGeneralen:female_01' }
  if (voice === 'eryn') return { voiceId: 'publishedfemaleGeneralen:female_02' }
  return {
    voiceId: 'female_01',
    ...(language === 'ar' ? { dialect: 'khaleeji' } : {}),
  }
}

function json(res: ServerResponse, status: number, body: unknown, retryAfter?: number): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
  })
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += data.length
    if (size > 8_192) throw new Error('payload_too_large')
    chunks.push(data)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new Error('invalid_json')
  }
}

export async function handleTtsProxy(
  req: IncomingMessage,
  res: ServerResponse,
  apiKey: string,
): Promise<void> {
  const ip = req.socket.remoteAddress || 'unknown'
  const limit = rateLimit({ key: `noura-tts:${ip}`, limit: 30, windowMs: 60_000 })
  if (!limit.ok) {
    json(res, 429, { error: 'Too many voice requests. Please wait and try again.' }, limit.retryAfterSec)
    return
  }

  let input: unknown
  try {
    input = await readJson(req)
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === 'payload_too_large'
    json(res, tooLarge ? 413 : 400, { error: tooLarge ? 'Text request is too large.' : 'Invalid JSON body.' })
    return
  }

  const record =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {}
  const text = typeof record.text === 'string' ? record.text.trim() : ''
  const language = record.language === 'ar' ? 'ar' : record.language === 'en' ? 'en' : null
  const voice: TtsVoiceId | null =
    record.voice === undefined || record.voice === 'noura'
      ? 'noura'
      : record.voice === 'ava'
        ? 'ava'
        : record.voice === 'eryn'
          ? 'eryn'
          : null
  if (!text || text.length > MAX_TEXT_LENGTH || !language) {
    json(res, 400, { error: `text must be 1–${MAX_TEXT_LENGTH} characters and language must be en or ar.` })
    return
  }
  if (!voice) {
    json(res, 400, { error: 'voice must be noura, ava, or eryn.' })
    return
  }
  if (language === 'ar' && voice !== 'noura') {
    json(res, 400, { error: 'Ava and Eryn are available for English replies only.' })
    return
  }
  if (!apiKey.trim()) {
    json(res, 503, { error: 'Neural voice service is unavailable: configure an IDRAK API key on the server.' })
    return
  }

  const voiceSettings = resolveTtsVoice(voice, language)
  const form = new FormData()
  form.append('text', text)
  if (voiceSettings.dialect) form.append('dialect', voiceSettings.dialect)
  form.append('voice_id', voiceSettings.voiceId)
  form.append('speed', '1')
  form.append('seed', '0')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS)
  try {
    const response = await fetch(TTS_URL, {
      method: 'POST',
      headers: { Accept: 'audio/wav', 'x-api-key': apiKey.trim() },
      body: form,
      signal: controller.signal,
    })
    if (!response.ok) {
      console.warn('[nahdi-v3-tts]', { status: response.status })
      json(res, 502, { error: 'The selected neural voice could not generate audio. Please try again.' })
      return
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('audio/')) {
      json(res, 502, { error: 'The selected neural voice returned an unsupported audio format.' })
      return
    }
    const audio = Buffer.from(await response.arrayBuffer())
    if (!audio.length || audio.length > MAX_AUDIO_BYTES) {
      json(res, 502, { error: 'The selected neural voice returned invalid audio.' })
      return
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': String(audio.length),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    res.end(audio)
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    console.error('[nahdi-v3-tts]', timedOut ? 'provider timeout' : 'provider request failed')
    if (!res.headersSent) {
      json(res, timedOut ? 504 : 502, {
        error: timedOut
          ? 'Neural voice request timed out. Please try again.'
          : 'Neural voice is temporarily unavailable.',
      })
    }
  } finally {
    clearTimeout(timeout)
  }
}
