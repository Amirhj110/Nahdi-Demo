import type {
  ChatMessage,
  ProductLink,
  SendMessageResult,
  VoiceLanguageOptions,
  VoiceSessionResult,
  VoiceSpeakerId,
} from '../types/chat'
import { isRoutineBuildRequest } from '../lib/chatActions.ts'
import { buildChatQuestion } from '../lib/chatContext.ts'
import { isNahdiPdpUrl, titleFromProductUrl } from '../lib/productUrl.ts'
import { getVisitorIds } from './session.ts'

const PROXY_PREFIX = '/api/assistant'
const CHAT_REQUEST_TIMEOUT_MS = 55_000

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function sanitizeProducts(raw: ProductLink[] | undefined): ProductLink[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const seen = new Set<string>()
  const products: ProductLink[] = []
  for (const item of raw) {
    const url = typeof item?.url === 'string' ? item.url.trim() : ''
    if (!url || !isSafeHttpUrl(url) || !isNahdiPdpUrl(url) || seen.has(url)) continue
    const name = typeof item.name === 'string' ? item.name.trim().slice(0, 180) : ''
    seen.add(url)
    products.push({ name: name || titleFromProductUrl(url), url })
  }
  return products.length ? products : undefined
}

export async function checkAssistantAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${PROXY_PREFIX}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) return false
    const data = (await response.json()) as { ok?: boolean; configured?: boolean }
    return Boolean(data.ok && data.configured)
  } catch {
    return false
  }
}

export type SendChatPayload = {
  message: string
  sessionId: string
  history: ChatMessage[]
  contextLabel?: string | null
  /** Prefer answering in this language (EN/AR). */
  language?: 'en' | 'ar'
  /** Request a short, natural spoken answer without markdown or product metadata. */
  voiceResponse?: boolean
  signal?: AbortSignal
}

export async function sendChatMessage(payload: SendChatPayload): Promise<SendMessageResult> {
  try {
    const langHint =
      payload.language === 'ar'
        ? 'أجيبي بالعربية الفصحى المبسّطة أو اللهجة السعودية بشكل طبيعي وواضح. '
        : 'Reply in clear natural English. '
    const responseStyle = isRoutineBuildRequest(payload.message)
      ? payload.language === 'ar'
        ? 'أنشئي روتينًا عمليًا موجزًا للصباح والمساء من أدلة قاعدة المعرفة المسترجعة فقط. أجيبي بعناوين منفصلة "روتين الصباح" و"روتين المساء"، ثم اكتبي كل خطوة في سطر مستقل وبترقيم واضح، وبحد أقصى ثلاث خطوات لكل فترة. اذكري المنتجات فقط إذا كانت أسماؤها وروابطها الموثقة من نهدي موجودة في الأدلة. لا تخمني طريقة الاستخدام أو الفوائد أو المنتجات، ولا تقدمي تشخيصًا طبيًا أو مقدمة أو خاتمة. '
        : 'Build a practical concise morning and evening routine using only retrieved knowledge-base evidence. Return exactly two separate headings, "Morning Routine" and "Evening Routine", with up to three clearly numbered steps under each heading, one step per line. Name a product only when its verified Nahdi product link is present in the retrieved evidence. Do not invent products, usage instructions, or benefits; do not diagnose, and do not add an introduction or conclusion. '
      : payload.voiceResponse
        ? payload.language === 'ar'
          ? 'أجيبي بجملتين طبيعيتين قصيرتين مناسبتين للكلام. لا تستخدمي عناوين أو قوائم أو روابط أو أسعار أو حقول بيانات؛ اذكري التوصية فقط بصياغة طبيعية. أجيبي عن الطلب الفعلي فقط، ولا تضيفي خاتمة أو شكراً للمشاهدة أو طلب اشتراك. إذا بدا التفريغ صوتاً خلفياً غير متعلق بالطلب أو كان غير واضح، اطلبي إعادة الكلام بدل التخمين. '
          : 'Reply in at most two short, natural spoken sentences. Do not use headings, lists, links, prices, or product metadata; state only the useful answer and recommendation naturally. Answer the actual request only; never add an outro, a thank-you-for-watching, or a subscription request. If the transcript sounds like unrelated background speech or is unclear, ask the user to repeat instead of guessing. '
        : 'Use a concise, direct answer. Avoid raw JSON, URLs, and unnecessary formatting. '
    const question = buildChatQuestion(
      `${langHint}${responseStyle}`,
      payload.message,
      payload.history,
    )
    const response = await fetch(`${PROXY_PREFIX}/chat`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        session_id: payload.sessionId,
        language: payload.language ?? 'en',
        temperature: 0.7,
      }),
      signal: payload.signal
        ? AbortSignal.any([payload.signal, AbortSignal.timeout(CHAT_REQUEST_TIMEOUT_MS)])
        : AbortSignal.timeout(CHAT_REQUEST_TIMEOUT_MS),
    })

    const data = (await response.json().catch(() => ({}))) as {
      answer?: string
      error?: string
      products?: ProductLink[]
    }

    if (!response.ok) {
      return {
        ok: false,
        error: data.error?.trim() || 'The assistant is unavailable right now. Please try again.',
      }
    }

    const content = data.answer?.trim()
    if (!content) {
      return { ok: false, error: 'The assistant returned an empty response.' }
    }

    return {
      ok: true,
      message: {
        id: createId('asst'),
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
        status: 'sent',
        products: sanitizeProducts(data.products),
      },
    }
  } catch {
    return {
      ok: false,
      error: 'Unable to reach the assistant service. Please try again shortly.',
    }
  }
}

export async function transcribeVoiceAudio(
  audio: Blob,
  mimeType: string,
  language: 'en' | 'ar',
  signal?: AbortSignal,
): Promise<string> {
  const audioBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('The voice recording could not be read.'))
        return
      }
      const separator = reader.result.indexOf(',')
      if (separator < 0) {
        reject(new Error('The voice recording could not be read.'))
        return
      }
      resolve(reader.result.slice(separator + 1))
    }
    reader.onerror = () => reject(new Error('The voice recording could not be read.'))
    reader.readAsDataURL(audio)
  })

  const requestSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
    : AbortSignal.timeout(30_000)
  const response = await fetch(`${PROXY_PREFIX}/stt`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, mimeType, language }),
    signal: requestSignal,
  })
  const data = (await response.json().catch(() => ({}))) as { text?: string; error?: string }
  if (!response.ok) {
    throw new Error(data.error?.trim() || `Speech recognition failed (${response.status}).`)
  }
  const text = data.text?.trim()
  if (!text) throw new Error('Speech recognition returned an empty transcript.')
  return text
}

export async function startVoiceSession(
  voiceId: VoiceSpeakerId,
  ids = getVisitorIds(),
  language?: VoiceLanguageOptions,
): Promise<VoiceSessionResult> {
  try {
    const body: Record<string, string> = {
      user_id: ids.visitorId,
      session_id: ids.voiceSessionId,
      voice_id: voiceId,
    }
    if (language?.language_mode) body.language_mode = language.language_mode
    if (language?.arabic_dialect) body.arabic_dialect = language.arabic_dialect

    const response = await fetch(`${PROXY_PREFIX}/voice/session`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(16000),
    })

    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean
      error?: string
      session_id?: string
      received_keys?: string[]
      livekit?: {
        url?: string
        token?: string
        room_name?: string | null
        participant_identity?: string | null
        expires_in?: number | null
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        error: data.error?.trim() || `Voice session failed (${response.status}).`,
        receivedKeys: data.received_keys,
      }
    }

    const livekit = data.livekit
    const url = livekit?.url?.trim()
    const token = livekit?.token?.trim()
    if (!livekit || !url || !token) {
      return {
        ok: false,
        error:
          'Voice session did not return LiveKit url and token. Audio cannot connect until those fields are present.',
        receivedKeys: data.received_keys,
      }
    }

    return {
      ok: true,
      sessionId: data.session_id || ids.voiceSessionId,
      livekit: {
        url,
        token,
        roomName: livekit.room_name ?? null,
        participantIdentity: livekit.participant_identity ?? null,
        expiresIn: livekit.expires_in ?? null,
      },
    }
  } catch {
    return {
      ok: false,
      error: 'Unable to start a voice call right now.',
    }
  }
}

export function createMessageId(role: 'user' | 'assistant' | 'system') {
  return createId(role)
}

export { getVisitorIds }
