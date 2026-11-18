import type { IncomingMessage, ServerResponse } from 'node:http'
import type {
  Confidence,
  SkinAnalysis,
  SkinConcern,
  SkinConcernId,
} from '../src/types/skinAnalysis.ts'
import { analyzeWithGoogleVision, GoogleVisionError } from './google-skin-analysis.ts'

const DERMIQ_BASE_URL = 'https://dev.dermiq.cloud'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_BODY_BYTES = 7 * 1024 * 1024
const ANALYSIS_TIMEOUT_MS = 12_000
const POLL_INTERVAL_MS = 2_500
const REQUEST_LIMIT = 5
const REQUEST_WINDOW_MS = 60_000
const requestCounts = new Map<string, { count: number; resetAt: number }>()

type JsonRecord = Record<string, unknown>
type ProviderMetric = { estimate: number; confidence: Confidence }

type ScanRequest = {
  mimeType: 'image/jpeg' | 'image/png'
  imageBase64: string
  language: 'en' | 'ar'
  provider: 'auto' | 'dermiq' | 'google'
}

function respond(res: ServerResponse, status: number, payload: Record<string, unknown>): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(payload))
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
}

function clientAddress(req: IncomingMessage): string {
  return req.socket.remoteAddress || 'unknown'
}

function underRequestLimit(address: string): boolean {
  const now = Date.now()
  const previous = requestCounts.get(address)
  if (!previous || previous.resetAt <= now) {
    requestCounts.set(address, { count: 1, resetAt: now + REQUEST_WINDOW_MS })
    return true
  }
  if (previous.count >= REQUEST_LIMIT) return false
  previous.count += 1
  return true
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new Error('payload_too_large')
    chunks.push(buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new Error('invalid_json')
  }
}

function parseRequest(value: unknown): { request?: ScanRequest; error?: string } {
  const record = asRecord(value)
  if (!record) return { error: 'invalid_request' }
  const language = record.language === undefined ? 'en' : record.language
  const provider = record.provider === undefined ? 'auto' : record.provider
  if ((language !== 'en' && language !== 'ar') ||
      (provider !== 'auto' && provider !== 'dermiq' && provider !== 'google')) {
    return { error: 'invalid_request' }
  }
  if (record.mimeType !== 'image/jpeg' && record.mimeType !== 'image/png') {
    return { error: 'unsupported_image' }
  }
  if (typeof record.imageBase64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(record.imageBase64)) {
    return { error: 'invalid_image' }
  }

  const image = Buffer.from(record.imageBase64, 'base64')
  if (
    image.length === 0 ||
    image.length > MAX_IMAGE_BYTES ||
    image.toString('base64') !== record.imageBase64
  ) {
    return { error: image.length > MAX_IMAGE_BYTES ? 'image_too_large' : 'invalid_image' }
  }

  return {
    request: {
      mimeType: record.mimeType,
      imageBase64: image.toString('base64'),
      language,
      provider,
    },
  }
}

function metricEntry(result: JsonRecord, aliases: RegExp): JsonRecord | null {
  for (const [key, value] of Object.entries(result)) {
    if (aliases.test(key)) {
      const metric = asRecord(value)
      if (metric) return metric
    }
  }
  return null
}

function nestedMetricRecord(metric: JsonRecord): JsonRecord[] {
  const records = [metric]
  for (const key of ['whole', 'overall', 'face']) {
    const nested = asRecord(metric[key])
    if (nested) records.push(nested)
  }
  return records
}

function metricScore(metric: JsonRecord): number | null {
  for (const record of nestedMetricRecord(metric)) {
    for (const key of ['ui_score', 'score', 'value']) {
      const score = record[key]
      if (typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100) {
        return Math.round(100 - score)
      }
    }
  }
  return null
}

function metricConfidence(metric: JsonRecord): Confidence {
  for (const record of nestedMetricRecord(metric)) {
    for (const key of ['reliability_tier', 'reliability', 'confidence', 'tier']) {
      const value = record[key]
      if (typeof value !== 'string') continue
      const normalized = value.trim().toLowerCase()
      if (normalized === 'high') return 'high'
      if (normalized === 'medium' || normalized === 'moderate') return 'medium'
      if (normalized === 'low') return 'low'
    }
  }
  return 'low'
}

function parseMetric(result: JsonRecord, aliases: RegExp): ProviderMetric | null {
  const entry = metricEntry(result, aliases)
  if (!entry) return null
  const estimate = metricScore(entry)
  if (estimate === null) return null
  return { estimate, confidence: metricConfidence(entry) }
}

function concernFromMetric(id: SkinConcernId, metric: ProviderMetric): SkinConcern[] {
  return metric.confidence !== 'low' && metric.estimate >= 60
    ? [{ id, confidence: metric.confidence }]
    : []
}

export function parseDermIQAnalysis(value: unknown): SkinAnalysis | null {
  const result = asRecord(value)
  if (!result) return null

  const redness = parseMetric(result, /^hd_redness(?:_|$)/i)
  const texture = parseMetric(result, /^hd_texture(?:_|$)/i)
  const pores = parseMetric(result, /^hd_pore(?:_|$)/i)
  const acne = parseMetric(result, /^hd_acne(?:_|$)/i)
  const oiliness = parseMetric(result, /^hd_oiliness(?:_|$)/i)
  if (!redness || !texture || !pores || !acne || !oiliness) return null

  return {
    concerns: [
      ...concernFromMetric('redness', redness),
      ...concernFromMetric('texture', texture),
      ...concernFromMetric('pores', pores),
      ...concernFromMetric('acne', acne),
      ...concernFromMetric('oiliness', oiliness),
    ],
  }
}

function providerFailure(status: number): { status: number; error: string } {
  if (status === 401) return { status: 503, error: 'vision_auth_failed' }
  if (status === 429) return { status: 429, error: 'vision_rate_limited' }
  if (status === 402 || status === 403) return { status: 402, error: 'vision_quota_exceeded' }
  if (status === 413) return { status: 413, error: 'image_too_large' }
  return { status: 502, error: 'vision_unavailable' }
}

async function pollAnalysis(
  analysisId: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<JsonRecord | null> {
  const deadline = Date.now() + ANALYSIS_TIMEOUT_MS
  while (Date.now() < deadline) {
    const response = await fetch(
      `${DERMIQ_BASE_URL}/v1/results/${encodeURIComponent(analysisId)}`,
      {
        headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` },
        signal,
      },
    )
    if (!response.ok) {
      const failure = providerFailure(response.status)
      throw Object.assign(new Error(failure.error), failure)
    }
    const payload = asRecord(await response.json().catch(() => null))
    if (!payload) throw new Error('invalid_vision_response')
    if (payload.status === 'completed') return asRecord(payload.result_json)
    if (payload.status === 'failed') throw new Error('analysis_failed')
    if (payload.status !== 'pending' && payload.status !== 'processing') {
      throw new Error('invalid_vision_response')
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  throw new Error('vision_timeout')
}

export async function handleDermIQSkinAnalysis(
  req: IncomingMessage,
  res: ServerResponse,
  apiKey: string | undefined,
  googleApiKey: string | undefined,
): Promise<void> {
  if (req.method !== 'POST') {
    respond(res, 405, { error: 'method_not_allowed' })
    return
  }

  let body: unknown
  try {
    body = await readJsonBody(req)
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    respond(res, code === 'payload_too_large' ? 413 : 400, {
      error: code === 'payload_too_large' ? 'request_too_large' : 'invalid_request',
    })
    return
  }

  const parsed = parseRequest(body)
  if (!parsed.request) {
    const status =
      parsed.error === 'unsupported_image' ? 415 : parsed.error === 'image_too_large' ? 413 : 400
    respond(res, status, { error: parsed.error })
    return
  }
  if (!underRequestLimit(clientAddress(req))) {
    respond(res, 429, { error: 'vision_rate_limited' })
    return
  }

  const request = parsed.request
  const geminiKey = googleApiKey?.trim()
  const dermiqKey = apiKey?.trim()
  const sendGoogle = async () => {
    if (!geminiKey) throw new GoogleVisionError(503, 'vision_unavailable')
    return analyzeWithGoogleVision(request, geminiKey)
  }
  const sendDermIQ = async () => {
    if (!dermiqKey) throw Object.assign(new Error('vision_unavailable'), {
      status: 503,
      error: 'vision_unavailable',
    })
    return analyzeWithDermIQ(request, dermiqKey)
  }

  try {
    if (request.provider === 'google') {
      const result = await sendGoogle()
      respond(res, 200, { ...result, provider: 'google' })
      return
    }
    if (request.provider === 'dermiq') {
      const result = await sendDermIQ()
      respond(res, 200, { ...result, provider: 'dermiq' })
      return
    }

    if (dermiqKey) {
      try {
        const result = await sendDermIQ()
        respond(res, 200, { ...result, provider: 'dermiq' })
        return
      } catch (error) {
        const failure = error as Error & { status?: number; error?: string }
        const canFallback =
          Boolean(geminiKey) &&
          (failure.status === undefined ||
            failure.status >= 500 ||
            [401, 402, 403, 429].includes(failure.status))
        if (!canFallback) throw error
      }
    } else if (!geminiKey) {
      throw Object.assign(new Error('vision_unavailable'), {
        status: 503,
        error: 'vision_unavailable',
      })
    }

    const result = await sendGoogle()
    respond(res, 200, { ...result, provider: 'google' })
  } catch (error) {
    const failure = error as Error & { status?: number; error?: string }
    if (failure.status && failure.error) {
      respond(res, failure.status, { error: failure.error })
      return
    }
    if (error instanceof GoogleVisionError) {
      respond(res, error.status, { error: error.code })
      return
    }
    console.error('[nahdi-v3-skin-analysis] Skin analysis failed.')
    respond(res, 502, { error: 'invalid_vision_response' })
  }
}

async function analyzeWithDermIQ(
  request: ScanRequest,
  apiKey: string,
): Promise<{ analysis: SkinAnalysis; elapsedMs: number }> {
  const image = Buffer.from(request.imageBase64, 'base64')
  const form = new FormData()
  form.append('file', new Blob([image], { type: request.mimeType }), 'skin-scan.jpg')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS)
  const startedAt = Date.now()
  let stage: 'upload' | 'poll' = 'upload'

  try {
    const upload = await fetch(`${DERMIQ_BASE_URL}/v1/analyze`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    })
    if (!upload.ok) {
      const failure = providerFailure(upload.status)
      if (failure.status === 502) {
        console.error('[nahdi-v3-skin-analysis] DermIQ upload returned HTTP', upload.status)
      }
      throw Object.assign(new Error(failure.error), failure)
    }

    const accepted = asRecord(await upload.json().catch(() => null))
    const analysisId = accepted?.analysis_id
    if (typeof analysisId !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(analysisId)) {
      throw Object.assign(new Error('invalid_vision_response'), {
        status: 502,
        error: 'invalid_vision_response',
      })
    }

    stage = 'poll'
    const result = await pollAnalysis(analysisId, apiKey, controller.signal)
    const analysis = parseDermIQAnalysis(result)
    if (!analysis) {
      console.error('[nahdi-v3-skin-analysis] DermIQ returned an incomplete analysis.')
      throw Object.assign(new Error('invalid_vision_response'), {
        status: 502,
        error: 'invalid_vision_response',
      })
    }
    return { analysis, elapsedMs: Date.now() - startedAt }
  } catch (error) {
    const failure = error as Error & { status?: number; error?: string }
    if (failure.status && failure.error) throw error
    const timedOut =
      (error instanceof Error && error.name === 'AbortError') ||
      (error instanceof Error && error.message === 'vision_timeout')
    if (timedOut) {
      console.error(`[nahdi-v3-skin-analysis] DermIQ ${stage} timed out.`)
    } else if (error instanceof Error && error.message !== 'analysis_failed') {
      console.error('[nahdi-v3-skin-analysis] DermIQ analysis failed.')
    }
    throw Object.assign(new Error(timedOut ? 'vision_timeout' : 'invalid_vision_response'), {
      status: timedOut ? 504 : 502,
      error: timedOut ? 'vision_timeout' : 'invalid_vision_response',
    })
  } finally {
    clearTimeout(timeout)
  }
}
