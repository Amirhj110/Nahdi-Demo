import { useCallback, useEffect, useRef, useState } from 'react'
import { formatAssistantSpeechText, getProductRecommendations } from '../lib/formatAssistantMessage'
import {
  isKnowledgeBaseMiss,
  isLikelyVoiceRequest,
  isProductMentionedInText,
  sanitizeVoiceTranscript,
} from '../lib/voiceTranscript'
import { getMessageProducts } from '../lib/chatProducts'
import {
  createMessageId,
  getVisitorIds,
  sendChatMessage,
  transcribeVoiceAudio,
} from '../services/chatApi'
import { VoiceTurnClient } from '../services/voiceTurnClient'
import { resetVisitorIds } from '../services/session'
import { useNav } from '../state/NavContext'
import type {
  ChatMessage,
  ChatMode,
  TtsVoiceId,
  VoiceLanguageOptions,
  VoiceTranscriptEntry,
  VoiceUiState,
} from '../types/chat'

const TTS_VOICE_STORAGE_KEY = 'nahdi-v3-tts-voice'

type VoiceActionHandler = (transcript: string) => Promise<string | false>

function readStoredTtsVoice(): TtsVoiceId {
  if (typeof window === 'undefined') return 'noura'
  try {
    const stored = window.localStorage.getItem(TTS_VOICE_STORAGE_KEY)
    if (stored === 'ava' || stored === 'eryn') return stored
  } catch {
    return 'noura'
  }
  return 'noura'
}

export type UseLaylaSessionOptions = {
  contextLabel?: string | null
  language?: VoiceLanguageOptions
  greeting?: string
}

type LocalExchangeOptions = {
  products?: ChatMessage['products']
  awaitSpeech?: boolean
}

type DemoPresentationState = {
  active: boolean
  speaker: 'user' | 'assistant' | null
  caption: string
  speaking: boolean
  interrupted: boolean
}

export function useLaylaSession(options: UseLaylaSessionOptions = {}) {
  const { setLastRecommendations } = useNav()
  const contextLabel = options.contextLabel ?? null
  const language = options.language
  const greeting =
    options.greeting ??
    (language?.language_mode === 'ar'
      ? 'مرحبًا، أنا ليلى. كيف يمكنني مساعدتك في العناية ببشرتك اليوم؟'
      : 'Hello, I’m Layla. How can I help with your skincare today?')
  const [visitorIds, setVisitorIds] = useState(() => getVisitorIds())
  const sessionId = visitorIds.visitorId
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [voiceTranscript, setVoiceTranscript] = useState<VoiceTranscriptEntry[]>([])
  const [isSending, setIsSending] = useState(false)
  const [mode, setMode] = useState<ChatMode>('text')
  const [voiceState, setVoiceState] = useState<VoiceUiState>('ready')
  const [voiceSpeakerEnabled, setVoiceSpeakerEnabledState] = useState(true)
  const [ttsVoiceId, setTtsVoiceIdState] = useState<TtsVoiceId>(readStoredTtsVoice)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voiceProductMessage, setVoiceProductMessage] = useState<ChatMessage | null>(null)
  const [isFindingVoiceProducts, setIsFindingVoiceProducts] = useState(false)
  const [voiceProductError, setVoiceProductError] = useState<string | null>(null)
  const [interrupted, setInterrupted] = useState(false)
  const [demoPresentation, setDemoPresentation] = useState<DemoPresentationState>({
    active: false,
    speaker: null,
    caption: '',
    speaking: false,
    interrupted: false,
  })
  const [panelOpen, setPanelOpen] = useState(false)
  const [miniPlayer, setMiniPlayer] = useState(false)

  const sendingLock = useRef(false)
  const sessionGenerationRef = useRef(0)
  const voiceAttemptRef = useRef(0)
  const voiceTurnAttemptRef = useRef(0)
  const voiceProductRequestRef = useRef(0)
  const modeRef = useRef(mode)
  const voiceTranscriptRef = useRef<VoiceTranscriptEntry[]>([])
  const voiceTurnControllerRef = useRef<AbortController | null>(null)
  const assistantGeneratingRef = useRef(false)
  const voiceClientRef = useRef<VoiceTurnClient | null>(null)
  const voiceActionHandlerRef = useRef<VoiceActionHandler | null>(null)
  const ttsVoiceIdRef = useRef(ttsVoiceId)
  const messagesRef = useRef(messages)
  const languageRef = useRef(language)
  messagesRef.current = messages
  languageRef.current = language

  useEffect(() => {
    try {
      window.localStorage.setItem(TTS_VOICE_STORAGE_KEY, ttsVoiceId)
    } catch {
      // Voice choice remains available for this session when storage is disabled.
    }
  }, [ttsVoiceId])

  useEffect(() => {
    return () => {
      voiceTurnControllerRef.current?.abort()
      void voiceClientRef.current?.disconnect()
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('chat-open', panelOpen && !miniPlayer)
  }, [panelOpen, miniPlayer])

  const updateVoiceCaption = useCallback((content: string, final: boolean) => {
    const transcript = voiceTranscriptRef.current
    const latest = transcript[transcript.length - 1]
    if (!latest || latest.speaker !== 'assistant') return
    const updated = [...transcript]
    updated[updated.length - 1] = { ...latest, content, final }
    voiceTranscriptRef.current = updated
    setVoiceTranscript(updated)
  }, [])

  const speakVoiceReply = useCallback(
    async (text: string, languageCode: 'en' | 'ar') => {
      const voice = languageCode === 'ar' ? 'noura' : ttsVoiceIdRef.current
      const client = voiceClientRef.current
      if (!client) return
      updateVoiceCaption('', false)
      await client.speak(text, languageCode, voice, updateVoiceCaption)
      const latest = voiceTranscriptRef.current[voiceTranscriptRef.current.length - 1]
      if (latest?.speaker === 'assistant' && !latest.content.trim()) {
        updateVoiceCaption(text, true)
      }
    },
    [updateVoiceCaption],
  )

  const pushVoiceActionReply = useCallback(
    async (userText: string, assistantText: string) => {
      const now = new Date().toISOString()
      const userId = createMessageId('user')
      const assistantId = createMessageId('assistant')
      const userEntry: VoiceTranscriptEntry = {
        id: userId,
        speaker: 'user',
        content: userText,
        final: true,
        receivedAt: Date.now(),
      }
      const assistantEntry: VoiceTranscriptEntry = {
        id: assistantId,
        speaker: 'assistant',
        content: assistantText,
        final: true,
        receivedAt: Date.now(),
      }
      const transcript = [...voiceTranscriptRef.current, userEntry, assistantEntry]
      voiceTranscriptRef.current = transcript
      setVoiceTranscript(transcript)
      messagesRef.current = [
        ...messagesRef.current,
        {
          id: `voice-${userId}`,
          role: 'user',
          content: userText,
          createdAt: now,
          status: 'sent',
        },
        {
          id: `voice-${assistantId}`,
          role: 'assistant',
          content: assistantText,
          createdAt: now,
          status: 'sent',
        },
      ]
      setMessages(messagesRef.current)
      sendingLock.current = false
      setIsSending(false)
      await speakVoiceReply(
        assistantText,
        languageRef.current?.language_mode === 'ar' ? 'ar' : 'en',
      )
    },
    [speakVoiceReply],
  )

  const registerVoiceActionHandler = useCallback((handler: VoiceActionHandler) => {
    voiceActionHandlerRef.current = handler
    return () => {
      if (voiceActionHandlerRef.current === handler) voiceActionHandlerRef.current = null
    }
  }, [])

  const syncRecommendations = useCallback(
    (message: ChatMessage) => {
      const products = getMessageProducts(message)
      if (products.length) setLastRecommendations(products)
    },
    [setLastRecommendations],
  )

  const findVoiceProducts = useCallback(
    async (question: string, answer: string, languageCode: 'en' | 'ar') => {
      if (isKnowledgeBaseMiss(answer)) {
        setVoiceProductMessage(null)
        setVoiceProductError(null)
        setIsFindingVoiceProducts(false)
        return
      }

      const requestId = ++voiceProductRequestRef.current
      setIsFindingVoiceProducts(true)
      setVoiceProductError(null)
      setVoiceProductMessage(null)

      try {
        const query = [
          'Use knowledge-base retrieval to find verified Nahdi catalogue links only for product names explicitly mentioned in this live voice reply.',
          'Do not substitute products or infer recommendations. If there is no exact catalogue match, return no links.',
          `Customer question: ${question.trim().slice(0, 900)}`,
          `Layla voice reply: ${answer.trim().slice(0, 1800)}`,
        ].join('\n\n')
        const result = await sendChatMessage({
          message: query,
          sessionId: `voice-products-${crypto.randomUUID().replace(/-/g, '')}`,
          history: [],
          contextLabel,
          language: languageCode,
        })
        if (requestId !== voiceProductRequestRef.current) return
        if (!result.ok) {
          setVoiceProductError(result.error)
          return
        }
        const recommendations = getProductRecommendations(
          result.message.content,
          result.message.products ?? [],
        ).filter((product) => product.url && isProductMentionedInText(product.name, answer))
        if (!recommendations.length) return
        const productMessage: ChatMessage = {
          ...result.message,
          content: '',
          products: recommendations.map((product) => ({
            name: product.name,
            url: product.url!,
            imageUrl: product.imageUrl,
            price: product.price,
            rating: product.rating,
            ratingCount: product.ratingCount,
          })),
        }
        syncRecommendations(productMessage)
        setVoiceProductMessage(productMessage)
      } catch (error) {
        if (requestId !== voiceProductRequestRef.current) return
        setVoiceProductError(
          error instanceof Error ? error.message : 'Unable to find verified product links for this voice reply.',
        )
      } finally {
        if (requestId === voiceProductRequestRef.current) setIsFindingVoiceProducts(false)
      }
    },
    [contextLabel, syncRecommendations],
  )

  const processVoiceUtterance = useCallback(
    async (audio: Blob, mimeType: string) => {
      const requestId = ++voiceTurnAttemptRef.current
      voiceTurnControllerRef.current?.abort()
      const controller = new AbortController()
      voiceTurnControllerRef.current = controller
      assistantGeneratingRef.current = true
      sendingLock.current = true
      setIsSending(true)
      setVoiceError(null)
      voiceProductRequestRef.current += 1
      setVoiceProductMessage(null)
      setVoiceProductError(null)
      setIsFindingVoiceProducts(false)

      const languageCode = languageRef.current?.language_mode === 'ar' ? 'ar' : 'en'
      try {
        const question = sanitizeVoiceTranscript(
          await transcribeVoiceAudio(audio, mimeType, languageCode, controller.signal),
        )
        if (requestId !== voiceTurnAttemptRef.current) return
        if (!isLikelyVoiceRequest(question)) {
          setInterrupted(false)
          setVoiceError(null)
          setVoiceState('listening')
          return
        }

        const voiceActionHandler = voiceActionHandlerRef.current
        const actionReply = voiceActionHandler ? await voiceActionHandler(question) : false
        if (requestId !== voiceTurnAttemptRef.current) return
        if (actionReply) {
          setVoiceError(null)
          await pushVoiceActionReply(question, actionReply)
          return
        }

        const userEntry: VoiceTranscriptEntry = {
          id: createMessageId('user'),
          speaker: 'user',
          content: question,
          final: true,
          receivedAt: Date.now(),
        }
        voiceTranscriptRef.current = [...voiceTranscriptRef.current, userEntry]
        setVoiceTranscript(voiceTranscriptRef.current)

        const userMessage: ChatMessage = {
          id: `voice-${userEntry.id}`,
          role: 'user',
          content: question,
          createdAt: new Date(userEntry.receivedAt!).toISOString(),
          status: 'sent',
        }
        const history = messagesRef.current
        messagesRef.current = [...history, userMessage]
        setMessages(messagesRef.current)

        const result = await sendChatMessage({
          message: question,
          sessionId,
          history,
          contextLabel,
          language: languageCode,
          voiceResponse: true,
          signal: controller.signal,
        })
        if (requestId !== voiceTurnAttemptRef.current) return
        if (!result.ok) {
          setVoiceError(result.error)
          const errorMessage: ChatMessage = {
            id: createMessageId('system'),
            role: 'system',
            content: result.error,
            createdAt: new Date().toISOString(),
            status: 'error',
          }
          messagesRef.current = [...messagesRef.current, errorMessage]
          setMessages(messagesRef.current)
          return
        }
        assistantGeneratingRef.current = false
        setVoiceError(null)
        syncRecommendations(result.message)

        const speechText = formatAssistantSpeechText(
          result.message.content,
          result.message.products ?? [],
        )
        const assistantEntry: VoiceTranscriptEntry = {
          id: createMessageId('assistant'),
          speaker: 'assistant',
          content: speechText,
          final: true,
          receivedAt: Date.now(),
        }
        voiceTranscriptRef.current = [...voiceTranscriptRef.current, assistantEntry]
        setVoiceTranscript(voiceTranscriptRef.current)
        const assistantMessage = {
          ...result.message,
          id: `voice-${assistantEntry.id}`,
          content: speechText,
        }
        messagesRef.current = [...messagesRef.current, assistantMessage]
        setMessages(messagesRef.current)
        setVoiceProductMessage(null)
        if (!result.message.fallback && !result.message.products?.length) {
          void findVoiceProducts(question, result.message.content, languageCode)
        }
        voiceTurnControllerRef.current = null
        sendingLock.current = false
        setIsSending(false)
        if (speechText) await speakVoiceReply(speechText, languageCode)
      } catch (error) {
        if (requestId !== voiceTurnAttemptRef.current || controller.signal.aborted) return
        if (
          error instanceof Error &&
          error.message === 'Speech recognition returned an empty transcript.'
        ) {
          setInterrupted(false)
          setVoiceError(
            languageCode === 'ar'
              ? 'لم أتمكن من فهم الكلام. حاولي مرة أخرى.'
              : "I didn't catch that. Please try again.",
          )
        } else {
          setVoiceError(
            error instanceof Error ? error.message : 'The voice turn could not be completed.',
          )
        }
      } finally {
        if (requestId === voiceTurnAttemptRef.current) {
          assistantGeneratingRef.current = false
          voiceTurnControllerRef.current = null
          sendingLock.current = false
          setIsSending(false)
        }
      }
    },
    [
      contextLabel,
      findVoiceProducts,
      pushVoiceActionReply,
      sessionId,
      speakVoiceReply,
      syncRecommendations,
    ],
  )

  const sendMessage = useCallback(
    async (raw: string) => {
      const content = raw.trim()
      if (!content || sendingLock.current) return
      if (document.body.classList.contains('live-demo-active')) {
        const blockedMessage: ChatMessage = {
          id: createMessageId('system'),
          role: 'system',
          content:
            languageRef.current?.language_mode === 'ar'
              ? 'المحادثة المباشرة متوقفة أثناء العرض. أوقفي العرض للتحدث مع ليلى.'
              : 'Live chat is paused during the scripted demo. Stop the demo to talk to Layla.',
          createdAt: new Date().toISOString(),
          status: 'error',
        }
        messagesRef.current = [...messagesRef.current, blockedMessage]
        setMessages(messagesRef.current)
        return
      }

      voiceProductRequestRef.current += 1
      setVoiceProductMessage(null)
      setIsFindingVoiceProducts(false)
      setVoiceProductError(null)
      const requestGeneration = sessionGenerationRef.current
      const voiceRequestId = mode === 'voice' ? ++voiceTurnAttemptRef.current : null
      const controller = mode === 'voice' ? new AbortController() : null
      if (controller) {
        voiceTurnControllerRef.current?.abort()
        voiceTurnControllerRef.current = controller
        assistantGeneratingRef.current = true
      }
      if (mode === 'voice') {
        setInterrupted(false)
        setVoiceError(null)
      }
      sendingLock.current = true
      setIsSending(true)
      const userId = createMessageId('user')
      const history = messagesRef.current
      const userMessage: ChatMessage = {
        id: mode === 'voice' ? `voice-${userId}` : userId,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        status: 'sent',
      }
      messagesRef.current = [...history, userMessage]
      setMessages(messagesRef.current)
      if (mode === 'voice') {
        const userEntry: VoiceTranscriptEntry = {
          id: userId,
          speaker: 'user',
          content,
          final: true,
          receivedAt: Date.now(),
        }
        const transcript = [...voiceTranscriptRef.current, userEntry]
        voiceTranscriptRef.current = transcript
        setVoiceTranscript(transcript)
      }

      try {
        let result = await sendChatMessage({
          message: content,
          sessionId,
          history,
          contextLabel,
          language: languageRef.current?.language_mode === 'ar' ? 'ar' : 'en',
          voiceResponse: mode === 'voice',
          signal: controller?.signal,
        })
        if (
          requestGeneration !== sessionGenerationRef.current ||
          controller?.signal.aborted ||
          (voiceRequestId !== null && voiceRequestId !== voiceTurnAttemptRef.current)
        ) {
          return
        }
        if (controller) {
          assistantGeneratingRef.current = false
          voiceTurnControllerRef.current = null
        }
        const languageCode = languageRef.current?.language_mode === 'ar' ? 'ar' : 'en'
        if (!result.ok) {
          if (mode === 'voice') {
            setVoiceError(result.error)
          }
          const errorMessage: ChatMessage = {
            id: createMessageId('system'),
            role: 'system',
            content: result.error,
            createdAt: new Date().toISOString(),
            status: 'error',
          }
          messagesRef.current = [...messagesRef.current, errorMessage]
          setMessages(messagesRef.current)
          return
        }
        syncRecommendations(result.message)
        setVoiceError(null)
        if (mode === 'voice') {
          const assistantMessage = result.message
          const speechText = formatAssistantSpeechText(
            assistantMessage.content,
            assistantMessage.products ?? [],
          )
          const assistantEntry: VoiceTranscriptEntry = {
            id: createMessageId('assistant'),
            speaker: 'assistant',
            content: speechText,
            final: true,
            receivedAt: Date.now(),
          }
          voiceTranscriptRef.current = [...voiceTranscriptRef.current, assistantEntry]
          setVoiceTranscript(voiceTranscriptRef.current)
          const message = {
            ...assistantMessage,
            id: `voice-${assistantEntry.id}`,
            content: speechText,
          }
          messagesRef.current = [...messagesRef.current, message]
          setMessages(messagesRef.current)
          setVoiceProductMessage(null)
          if (!assistantMessage.products?.length && !assistantMessage.fallback) {
            void findVoiceProducts(content, assistantMessage.content, languageCode)
          }
          sendingLock.current = false
          setIsSending(false)
          if (speechText) await speakVoiceReply(speechText, languageCode)
        } else {
          messagesRef.current = [...messagesRef.current, result.message]
          setMessages(messagesRef.current)
        }
      } catch (error) {
        if (
          requestGeneration !== sessionGenerationRef.current ||
          controller?.signal.aborted ||
          (voiceRequestId !== null && voiceRequestId !== voiceTurnAttemptRef.current)
        ) {
          return
        }
        const errorMessage: ChatMessage = {
          id: createMessageId('system'),
          role: 'system',
          content:
            error instanceof Error ? error.message : 'Unable to reach the assistant service. Please try again.',
          createdAt: new Date().toISOString(),
          status: 'error',
        }
        messagesRef.current = [...messagesRef.current, errorMessage]
        setMessages(messagesRef.current)
      } finally {
        if (
          requestGeneration === sessionGenerationRef.current &&
          (voiceRequestId === null || voiceRequestId === voiceTurnAttemptRef.current)
        ) {
          assistantGeneratingRef.current = false
          if (controller && voiceTurnControllerRef.current === controller) {
            voiceTurnControllerRef.current = null
          }
          setIsSending(false)
          sendingLock.current = false
        }
      }
    },
    [contextLabel, findVoiceProducts, mode, sessionId, speakVoiceReply, syncRecommendations],
  )

  const resetSession = useCallback(() => {
    sessionGenerationRef.current += 1
    voiceAttemptRef.current += 1
    voiceTurnAttemptRef.current += 1
    voiceTurnControllerRef.current?.abort()
    voiceTurnControllerRef.current = null
    assistantGeneratingRef.current = false
    sendingLock.current = false
    voiceProductRequestRef.current += 1
    const client = voiceClientRef.current
    voiceClientRef.current = null
    if (client) {
      void client.disconnect().catch((error: unknown) => {
        setVoiceError(
          error instanceof Error ? `The voice connection could not be closed: ${error.message}` : 'The voice connection could not be closed.',
        )
      })
    }
    modeRef.current = 'text'
    setMode('text')
    setVisitorIds(resetVisitorIds())
    messagesRef.current = []
    voiceTranscriptRef.current = []
    setMessages([])
    setVoiceTranscript([])
    setVoiceProductMessage(null)
    setIsFindingVoiceProducts(false)
    setVoiceProductError(null)
    setIsSending(false)
    sendingLock.current = false
    setVoiceError(null)
    setVoiceState('ready')
    setInterrupted(false)
  }, [])

  const beginVoiceCall = useCallback(async (restart = false) => {
    if (document.body.classList.contains('live-demo-active')) return
    modeRef.current = 'voice'
    setMode('voice')
    setPanelOpen(true)
    setMiniPlayer(false)
    if (!restart && (voiceClientRef.current || voiceState === 'connecting')) {
      return
    }

    const attemptId = ++voiceAttemptRef.current
    voiceProductRequestRef.current += 1
    voiceTranscriptRef.current = []
    setVoiceTranscript([])
    setVoiceProductMessage(null)
    setIsFindingVoiceProducts(false)
    setVoiceProductError(null)
    setVoiceError(null)
    setInterrupted(false)
    setVoiceState('connecting')

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setVoiceState('error')
      setVoiceError('Voice input requires a secure (HTTPS) browser context. Continue in text chat.')
      return
    }

    let client: VoiceTurnClient | null = null
    try {
      const activeLanguage = languageRef.current?.language_mode === 'ar' ? 'ar' : 'en'
      client = new VoiceTurnClient({
        onState: (state) => {
          if (attemptId === voiceAttemptRef.current) setVoiceState(state)
        },
        onError: (message) => {
          if (attemptId === voiceAttemptRef.current) setVoiceError(message)
        },
        onInterruption: () => {
          if (attemptId !== voiceAttemptRef.current) return
          voiceTurnAttemptRef.current += 1
          voiceTurnControllerRef.current?.abort()
          voiceTurnControllerRef.current = null
          assistantGeneratingRef.current = false
          sendingLock.current = false
          setIsSending(false)
          setInterrupted(true)
        },
        onUtterance: (audio, mimeType) => {
          if (attemptId === voiceAttemptRef.current) {
            setInterrupted(false)
            void processVoiceUtterance(audio, mimeType)
          }
        },
        isAssistantBusy: () => assistantGeneratingRef.current,
      })
      voiceClientRef.current = client
      client.setInputEnabled(false)
      client.setSpeakerEnabled(voiceSpeakerEnabled)
      await client.connect()
      if (attemptId !== voiceAttemptRef.current) {
        await client.disconnect()
        return
      }
      const greetingEntry: VoiceTranscriptEntry = {
        id: createMessageId('assistant'),
        speaker: 'assistant',
        content: greeting,
        final: true,
        receivedAt: Date.now(),
      }
      voiceTranscriptRef.current = [greetingEntry]
      setVoiceTranscript(voiceTranscriptRef.current)
      await speakVoiceReply(greeting, activeLanguage)
      if (attemptId !== voiceAttemptRef.current) return
      client.setInputEnabled(true)
    } catch (error) {
      await client?.disconnect()
      if (attemptId !== voiceAttemptRef.current) return
      if (voiceClientRef.current === client) voiceClientRef.current = null
      setVoiceError(describeVoiceError(error))
      setVoiceState('error')
    }
  }, [
    greeting,
    processVoiceUtterance,
    speakVoiceReply,
    voiceSpeakerEnabled,
    voiceState,
  ])

  const hangUpVoiceCall = useCallback(async () => {
    voiceAttemptRef.current += 1
    voiceTurnAttemptRef.current += 1
    voiceTurnControllerRef.current?.abort()
    voiceTurnControllerRef.current = null
    assistantGeneratingRef.current = false
    sendingLock.current = false
    voiceProductRequestRef.current += 1
    const client = voiceClientRef.current
    voiceClientRef.current = null
    await client?.disconnect()
    setMiniPlayer(false)
    setIsSending(false)
    setVoiceError(null)
    setVoiceState('disconnected')
    modeRef.current = 'text'
    setMode('text')
  }, [])

  const setVoiceMuted = useCallback(async (muted: boolean) => {
    try {
      await voiceClientRef.current?.setMuted(muted)
    } catch (error) {
      setVoiceError(describeVoiceError(error))
    }
  }, [])

  const setVoiceSpeakerEnabled = useCallback((enabled: boolean) => {
    setVoiceSpeakerEnabledState(enabled)
    voiceClientRef.current?.setSpeakerEnabled(enabled)
  }, [])

  const setTtsVoiceId = useCallback((voice: TtsVoiceId) => {
    ttsVoiceIdRef.current = voice
    setTtsVoiceIdState(voice)
  }, [])

  const openPanel = useCallback(() => {
    setPanelOpen(true)
    setMiniPlayer(false)
  }, [])

  const closePanel = useCallback(() => {
    setPanelOpen(false)
  }, [])

  const collapseToMiniPlayer = useCallback(() => {
    const active =
      voiceState === 'connecting' ||
      voiceState === 'connected' ||
      voiceState === 'listening' ||
      voiceState === 'speaking' ||
      voiceState === 'muted'
    if (active) {
      setMiniPlayer(true)
      setPanelOpen(false)
    }
  }, [voiceState])

  const pushLocalExchange = useCallback(
    async (userText: string, assistantText: string, options: LocalExchangeOptions = {}) => {
    const now = new Date().toISOString()
    const activeMode = modeRef.current
    const userId = createMessageId('user')
    const assistantId = createMessageId('assistant')
    const exchange: ChatMessage[] = [
      {
        id: activeMode === 'voice' ? `voice-${userId}` : userId,
        role: 'user',
        content: userText,
        createdAt: now,
        status: 'sent',
      },
      {
        id: activeMode === 'voice' ? `voice-${assistantId}` : assistantId,
        role: 'assistant',
        content:
          activeMode === 'voice' ? formatAssistantSpeechText(assistantText, options.products) : assistantText,
        createdAt: now,
        status: 'sent',
        ...(options.products?.length ? { products: options.products } : {}),
      },
    ]
    messagesRef.current = [...messagesRef.current, ...exchange]
    setMessages(messagesRef.current)
      if (activeMode !== 'voice') return

      const userEntry: VoiceTranscriptEntry = {
        id: userId,
        speaker: 'user',
        content: userText,
        final: true,
        receivedAt: Date.now(),
      }
      const assistantEntry: VoiceTranscriptEntry = {
        id: assistantId,
        speaker: 'assistant',
        content: formatAssistantSpeechText(assistantText, options.products),
        final: true,
        receivedAt: Date.now(),
      }
      const transcript = [...voiceTranscriptRef.current, userEntry, assistantEntry]
      voiceTranscriptRef.current = transcript
      setVoiceTranscript(transcript)
      const playback = speakVoiceReply(
        assistantEntry.content,
        languageRef.current?.language_mode === 'ar' ? 'ar' : 'en',
      )
      if (options.awaitSpeech === false) void playback
      else await playback
    },
    [speakVoiceReply],
  )

  const beginDemoPresentation = useCallback(() => {
    const savedMessages = messagesRef.current
    const savedTranscript = voiceTranscriptRef.current
    const savedVoiceProductMessage = voiceProductMessage
    const savedIsFindingVoiceProducts = isFindingVoiceProducts
    const savedVoiceProductError = voiceProductError
    let restored = false

    messagesRef.current = []
    voiceTranscriptRef.current = []
    setMessages([])
    setVoiceTranscript([])
    setVoiceProductMessage(null)
    setIsFindingVoiceProducts(false)
    setVoiceProductError(null)
    setDemoPresentation({
      active: true,
      speaker: null,
      caption: '',
      speaking: false,
      interrupted: false,
    })

    return () => {
      if (restored) return
      restored = true
      messagesRef.current = savedMessages
      voiceTranscriptRef.current = savedTranscript
      setMessages(savedMessages)
      setVoiceTranscript(savedTranscript)
      setVoiceProductMessage(savedVoiceProductMessage)
      setIsFindingVoiceProducts(savedIsFindingVoiceProducts)
      setVoiceProductError(savedVoiceProductError)
      setDemoPresentation({
        active: false,
        speaker: null,
        caption: '',
        speaking: false,
        interrupted: false,
      })
    }
  }, [isFindingVoiceProducts, voiceProductError, voiceProductMessage])

  const setDemoPresentationCaption = useCallback(
    (
      speaker: 'user' | 'assistant',
      caption: string,
      speaking: boolean,
      wasInterrupted = false,
    ) => {
      setDemoPresentation({
        active: true,
        speaker,
        caption,
        speaking,
        interrupted: wasInterrupted,
      })
    },
    [],
  )

  const speakLocalNarration = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || modeRef.current !== 'voice' || !voiceClientRef.current) return

      const now = new Date().toISOString()
      const id = createMessageId('assistant')
      const message: ChatMessage = {
        id: `voice-${id}`,
        role: 'assistant',
        content,
        createdAt: now,
        status: 'sent',
      }
      messagesRef.current = [...messagesRef.current, message]
      setMessages(messagesRef.current)

      const entry: VoiceTranscriptEntry = {
        id,
        speaker: 'assistant',
        content,
        final: true,
        receivedAt: Date.now(),
      }
      voiceTranscriptRef.current = [...voiceTranscriptRef.current, entry]
      setVoiceTranscript(voiceTranscriptRef.current)
      await speakVoiceReply(
        content,
        languageRef.current?.language_mode === 'ar' ? 'ar' : 'en',
      )
    },
    [speakVoiceReply],
  )

  const interruptVoiceSpeech = useCallback(() => {
    voiceTurnControllerRef.current?.abort()
    assistantGeneratingRef.current = false
    voiceClientRef.current?.interruptSpeech()
  }, [])

  return {
    sessionId,
    messages,
    voiceTranscript,
    voiceProductMessage,
    isFindingVoiceProducts,
    voiceProductError,
    isSending,
    mode,
    setMode,
    voiceState,
    voiceSpeakerEnabled,
    ttsVoiceId,
    setTtsVoiceId,
    registerVoiceActionHandler,
    voiceError,
    interrupted,
    panelOpen,
    miniPlayer,
    openPanel,
    closePanel,
    setMiniPlayer,
    collapseToMiniPlayer,
    sendMessage,
    pushLocalExchange,
    beginDemoPresentation,
    demoPresentation,
    setDemoPresentationCaption,
    speakLocalNarration,
    interruptVoiceSpeech,
    beginVoiceCall,
    hangUpVoiceCall,
    setVoiceMuted,
    setVoiceSpeakerEnabled,
    resetSession,
  }
}

function describeVoiceError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Microphone permission is required for voice input. Allow access or continue in text chat.'
  }
  if (error instanceof Error && error.message.trim()) return error.message
  return 'Unable to start browser voice. Continue in text chat.'
}
