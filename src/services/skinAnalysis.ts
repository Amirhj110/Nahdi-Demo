import { SKIN_CONCERN_IDS, type SkinAnalysis } from '../types/skinAnalysis'

export type SkinScanErrorCode =
  | 'cameraUnavailable'
  | 'cameraDenied'
  | 'invalidImage'
  | 'imageTooLarge'
  | 'unsupportedImage'
  | 'visionUnavailable'
  | 'visionAuthFailed'
  | 'visionRateLimited'
  | 'visionQuotaExceeded'
  | 'visionTimeout'
  | 'invalidVisionResponse'
  | 'unusableImage'
  | 'generic'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export class SkinScanError extends Error {
  readonly code: SkinScanErrorCode

  constructor(code: SkinScanErrorCode) {
    super(code)
    this.name = 'SkinScanError'
    this.code = code
  }
}

export type SkinAnalysisResult = {
  analysis: SkinAnalysis
  elapsedMs: number
  provider: 'dermiq' | 'google'
}

export type SkinAnalysisProvider = SkinAnalysisResult['provider'] | 'auto'

function isSkinAnalysis(value: unknown): value is SkinAnalysis {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const allowedIds = new Set<string>(SKIN_CONCERN_IDS)
  return Array.isArray(record.concerns) && record.concerns.every((value) => {
    if (!value || typeof value !== 'object') return false
    const concern = value as Record<string, unknown>
    return (
      typeof concern.id === 'string' &&
      allowedIds.has(concern.id) &&
      (concern.confidence === 'medium' || concern.confidence === 'high')
    )
  })
}

function readImageBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new SkinScanError('invalidImage'))
        return
      }
      const separator = reader.result.indexOf(',')
      if (separator < 0) {
        reject(new SkinScanError('invalidImage'))
        return
      }
      resolve(reader.result.slice(separator + 1))
    }
    reader.onerror = () => reject(new SkinScanError('invalidImage'))
    reader.readAsDataURL(blob)
  })
}

export async function compressSkinImage(image: Blob): Promise<Blob> {
  if (!SUPPORTED_IMAGE_TYPES.has(image.type)) throw new SkinScanError('unsupportedImage')
  if (image.size === 0) throw new SkinScanError('invalidImage')
  if (image.size > MAX_UPLOAD_BYTES) throw new SkinScanError('imageTooLarge')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(image)
  } catch {
    throw new SkinScanError('invalidImage')
  }

  try {
    if (bitmap.width < 160 || bitmap.height < 160) throw new SkinScanError('invalidImage')
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new SkinScanError('invalidImage')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const compressed = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.84),
    )
    if (!compressed || compressed.size > MAX_UPLOAD_BYTES) {
      throw new SkinScanError('imageTooLarge')
    }
    return compressed
  } finally {
    bitmap.close()
  }
}

export async function analyzeSkinImage(
  image: Blob,
  language: 'en' | 'ar',
  provider: SkinAnalysisProvider = 'auto',
): Promise<SkinAnalysisResult> {
  if (!SUPPORTED_IMAGE_TYPES.has(image.type)) throw new SkinScanError('unsupportedImage')
  if (image.size === 0 || image.size > MAX_UPLOAD_BYTES) {
    throw new SkinScanError(image.size > MAX_UPLOAD_BYTES ? 'imageTooLarge' : 'invalidImage')
  }

  let response: Response
  try {
    response = await fetch('/api/assistant/skin-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        mimeType: image.type,
        imageBase64: await readImageBase64(image),
        language,
        provider,
      }),
      signal: AbortSignal.timeout(25_000),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new SkinScanError('visionTimeout')
    }
    throw new SkinScanError('generic')
  }

  const payload = (await response.json().catch(() => null)) as
    | { analysis?: unknown; elapsedMs?: unknown; provider?: unknown; error?: string }
    | null
  if (!response.ok) {
    const errorMap: Record<string, SkinScanErrorCode> = {
      vision_unavailable: 'visionUnavailable',
      vision_auth_failed: 'visionAuthFailed',
      vision_rate_limited: 'visionRateLimited',
      rate_limited: 'visionRateLimited',
      vision_quota_exceeded: 'visionQuotaExceeded',
      vision_timeout: 'visionTimeout',
      invalid_vision_response: 'invalidVisionResponse',
      unusable_image: 'unusableImage',
      unsupported_image: 'unsupportedImage',
      image_too_large: 'imageTooLarge',
      invalid_image: 'invalidImage',
    }
    throw new SkinScanError(errorMap[payload?.error || ''] || 'generic')
  }
  if (
    !payload ||
    !isSkinAnalysis(payload.analysis) ||
    typeof payload.elapsedMs !== 'number' ||
    (payload.provider !== 'dermiq' && payload.provider !== 'google')
  ) {
    throw new SkinScanError('invalidVisionResponse')
  }
  return {
    analysis: payload.analysis,
    elapsedMs: payload.elapsedMs,
    provider: payload.provider,
  }
}
