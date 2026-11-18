import type { IncomingMessage, ServerResponse } from 'node:http'
import { rateLimit } from './rate-limit.ts'

const STT_URL = 'https://ai.bilyticaglobal.com/stt/transcribe'
const MAX_AUDIO_BYTES = 7 * 1024 * 1024
const MAX_BODY_BYTES = 10 * 1024 * 1024
const STT_TIMEOUT_MS = 25_000

type JsonRecord = Record<string, unknown>

function respond(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
}

export function extractSttTranscript(value: unknown): string | null {
  const root = asRecord(value)
  const candidates = [
    root?.text,
    root?.transcript,
    asRecord(root?.data)?.text,
    asRecord(root?.data)?.transcript,
    asRecord(root?.result)?.text,
    asRecord(root?.result)?.transcript,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return null
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += data.length
    if (size > MAX_BODY_BYTES) throw new Error('payload_too_large')
    chunks.push(data)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new Error('invalid_json')
  }
}

export async function handleSttProxy(
  req: IncomingMessage,
  res: ServerResponse,
  apiKey: string,
): Promise<void> {
  if (req.method !== 'POST') {
    respond(res, 405, { error: 'method_not_allowed' })
    return
  }
  if (!apiKey.trim()) {
    respond(res, 503, { error: 'Speech recognition is not configured on the server.' })
    return
  }

  const limit = rateLimit({
    key: `voice-stt:${req.socket.remoteAddress || 'unknown'}`,
    limit: 20,
    windowMs: 60_000,
  })
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfterSec))
    respond(res, 429, { error: 'Speech recognition is busy. Please wait and try again.' })
    return
  }

  let body: unknown
  try {
    body = await readJsonBody(req)
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === 'payload_too_large'
    respond(res, tooLarge ? 413 : 400, {
      error: tooLarge ? 'The recorded speech is too large.' : 'Invalid speech request.',
    })
    return
  }

  const record = asRecord(body)
  const audioBase64 = typeof record?.audioBase64 === 'string' ? record.audioBase64 : ''
  const mimeType = typeof record?.mimeType === 'string' ? record.mimeType.split(';')[0] : ''
  const language = record?.language === 'ar' ? 'ar' : record?.language === 'en' ? 'en' : null
  const supportedTypes = new Set([
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/wav',
    'audio/mpeg',
    'audio/aac',
  ])
  if (!audioBase64 || !supportedTypes.has(mimeType) || !language ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(audioBase64)) {
    respond(res, 400, { error: 'A supported audio recording and language (en or ar) are required.' })
    return
  }

  const audio = Buffer.from(audioBase64, 'base64')
  if (!audio.length || audio.length > MAX_AUDIO_BYTES || audio.toString('base64') !== audioBase64) {
    respond(res, audio.length > MAX_AUDIO_BYTES ? 413 : 400, {
      error: audio.length > MAX_AUDIO_BYTES
        ? 'The recorded speech is too large.'
        : 'The recorded speech is invalid.',
    })
    return
  }

  const form = new FormData()
  form.append('file', new Blob([audio], { type: mimeType }), `voice-turn.${mimeType.split('/')[1]}`)
  form.append('language', language)
  form.append('task', 'transcribe')
  form.append('vad_filter', 'true')
  form.append(
    'initial_prompt',
    'Nahdi skincare shopping conversation: oily skin, dry skin, acne, dark spots, moisturizer, cleanser, sunscreen, skincare routine, product recommendations.',
  )

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), STT_TIMEOUT_MS)
  try {
    const upstream = await fetch(STT_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'x-api-key': apiKey.trim() },
      body: form,
      signal: controller.signal,
    })
    const payload = await upstream.json().catch(() => null)
    if (!upstream.ok) {
      const status = upstream.status === 401 || upstream.status === 403
        ? 503
        : upstream.status === 429
          ? 429
          : 502
      respond(res, status, {
        error: status === 429
          ? 'Speech recognition is busy. Please wait and try again.'
          : status === 503
            ? 'Speech recognition credentials were rejected by the service.'
            : 'Speech recognition could not process this recording.',
      })
      return
    }

    const text = extractSttTranscript(payload)
    if (!text) {
      respond(res, 502, { error: 'Speech recognition returned an empty transcript.' })
      return
    }
    respond(res, 200, { text, language })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    console.error('[nahdi-v3-stt]', timedOut ? 'provider timeout' : 'provider request failed')
    respond(res, timedOut ? 504 : 502, {
      error: timedOut
        ? 'Speech recognition took too long. Please try again.'
        : 'Speech recognition is temporarily unavailable.',
    })
  } finally {
    clearTimeout(timeout)
  }
}
