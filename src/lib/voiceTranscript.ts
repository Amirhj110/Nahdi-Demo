import type { VoiceTranscriptEntry } from '../types/chat'

export const VOICE_UTTERANCE_SILENCE_MS = 2500

const VOICE_OUTRO_PHRASES = [
  /\bthank you for watching(?:\s+(?:this|the))?(?:\s+video)?\b/gi,
  /\bi hope you enjoyed (?:it|this video)\b/gi,
  /\bi(?:'ll| will) see you in the next video\b/gi,
  /\bplease subscribe to (?:my|the) channel\b/gi,
  /\bsubscribe to (?:my|the) channel\b/gi,
  /\bpress the bell icon(?: to get notified)?\b/gi,
  /\blike,?\s*share,?\s*and subscribe\b/gi,
  /\bhave a wonderful (?:day|month)\b/gi,
]

export type VoiceUtterance = VoiceTranscriptEntry & {
  startIndex: number
  endIndex: number
}

export function sanitizeVoiceTranscript(content: string): string {
  return VOICE_OUTRO_PHRASES.reduce(
    (text, phrase) => text.replace(phrase, ' '),
    content,
  )
    .replace(/[,.!?;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isLikelyVoiceRequest(content: string): boolean {
  const text = content.trim().toLowerCase()
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length || words.join('').length < 2) return false
  if (words.length === 1) {
    return /^(?:hi|hello|hey|help|thanks|thank|yes|no|stop|start|layla)$/i.test(text)
  }
  if (/[\u0600-\u06ff]/.test(text)) return true

  const skincareTopic =
    /\b(?:skin|skincare|face|oily|oiliness|dry|acne|blemish|pimple|dark spots?|pigmentation|pores?|cleanser|face wash|moisturi[sz]er|toner|serum|sunscreen|sunblock|spf|routine|retinol|vitamin c|product)\b/
  const requestIntent =
    /\b(?:what|which|how|why|when|where|who|can|could|would|should|do|does|is|are|recommend|suggest|tell|explain|compare|find|show|give|help|need|want|have|prefer|make|build|add|put|open|take me|thank you|thanks|hello|hi|hey|good morning|good afternoon)\b/

  return skincareTopic.test(text) || requestIntent.test(text)
}

export function getLatestVoiceUtterance(
  transcript: VoiceTranscriptEntry[],
  speaker: VoiceTranscriptEntry['speaker'],
): VoiceUtterance | null {
  let endIndex = transcript.length - 1
  while (endIndex >= 0 && transcript[endIndex]?.speaker !== speaker) {
    endIndex -= 1
  }
  if (endIndex < 0) return null

  let startIndex = endIndex
  while (startIndex > 0 && transcript[startIndex - 1]?.speaker === speaker) {
    const previous = transcript[startIndex - 1]
    const current = transcript[startIndex]
    if (
      previous?.receivedAt !== undefined &&
      current?.receivedAt !== undefined &&
      current.receivedAt - previous.receivedAt > VOICE_UTTERANCE_SILENCE_MS
    ) {
      break
    }
    startIndex -= 1
  }

  const segments = transcript.slice(startIndex, endIndex + 1)
  const content = segments
    .map((segment) => segment.content.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
  const receivedAt = segments[segments.length - 1]?.receivedAt
  if (!content) return null

  return {
    id: segments.map((segment) => segment.id).join('|'),
    speaker,
    content,
    final: segments.every((segment) => segment.final),
    ...(receivedAt !== undefined ? { receivedAt } : {}),
    startIndex,
    endIndex,
  }
}

export function isKnowledgeBaseMiss(content: string): boolean {
  const normalized = content.trim().toLowerCase().replace(/\s+/g, ' ')
  return (
    /\b(?:could not|couldn't|can not|can't|cannot|unable to)\b.{0,100}\b(?:information|answer|knowledge|product|catalog|catalogue|database|details|record)\b/.test(
      normalized,
    ) ||
    /\b(?:no|not any)\b.{0,80}\b(?:information|answer|product|catalog|catalogue|record)\b.{0,40}\b(?:found|available|in)\b/.test(
      normalized,
    )
  )
}

export function isProductMentionedInText(productName: string, text: string): boolean {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\bspf\s*\d+\b/g, ' ')
      .replace(
        /\b\d+(?:\.\d+)?\s*(?:ml|milliliters?|l|liters?|g|grams?|mg|oz)\b/g,
        ' ',
      )
      .replace(/\s+/g, ' ')
      .trim()

  const candidate = normalize(productName)
  const spoken = ` ${normalize(text)} `
  return candidate.split(' ').length >= 2 && spoken.includes(` ${candidate} `)
}
