export type MessageRole = 'user' | 'assistant' | 'system'

export type ProductLink = {
  name: string
  url: string
  imageUrl?: string
  price?: string
  rating?: string
  ratingCount?: string
}

export type ChatMessage = {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  status?: 'sending' | 'sent' | 'error'
  products?: ProductLink[]
  fallback?: boolean
}

export type VoiceTranscriptEntry = {
  id: string
  speaker: 'user' | 'assistant'
  content: string
  final: boolean
  receivedAt?: number
}

export type ChatMode = 'text' | 'voice'

export type VoiceSpeakerId = 'female_01' | 'male_01'
export type TtsVoiceId = 'noura' | 'ava' | 'eryn'

export type VoiceUiState =
  | 'ready'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'muted'
  | 'disconnected'
  | 'error'

export type SendMessageResult =
  | { ok: true; message: ChatMessage }
  | { ok: false; error: string }

export type LiveKitSession = {
  url: string
  token: string
  roomName: string | null
  participantIdentity: string | null
  expiresIn: number | null
}

export type VoiceSessionResult =
  | { ok: true; sessionId: string; livekit: LiveKitSession }
  | { ok: false; error: string; receivedKeys?: string[] }

export type VoiceLanguageOptions = {
  language_mode?: 'en' | 'ar'
  arabic_dialect?: 'none' | 'saudi' | string
}

export const DEFAULT_SUGGESTED_QUESTIONS = [
  'Suggest products for oily acne-prone skin',
  'What is good for dark spots on the face?',
  'What cleanser is best for combination skin?',
  'Recommend a gentle cleanser for sensitive skin',
  'Suggest a moisturizer for dry skin',
  'What sunscreen is good for oily skin?',
] as const

export const WELCOME_MESSAGE =
  'Ask about routines, skin concerns, or products — or switch to Voice and talk to Layla.'

export const VISITOR_STORAGE_KEY = 'nahdi_v3_visitor_id'
export const SESSION_STORAGE_KEY = 'nahdi_v3_session_id'
