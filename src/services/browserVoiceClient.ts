import type { VoiceUiState } from '../types/chat'

type SpeechResult = { isFinal: boolean; length: number; [index: number]: { transcript: string } }
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> }

interface SpeechRecognitionSession {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionSession
type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

export type BrowserVoiceCallbacks = {
  onState: (state: VoiceUiState) => void
  onError: (message: string) => void
  onInterruption: () => void
  onTranscription: (entry: {
    id: string
    speaker: 'user' | 'assistant'
    content: string
    final: boolean
    receivedAt: number
  }) => void
}

export class BrowserVoiceClient {
  private readonly callbacks: BrowserVoiceCallbacks
  private recognition: SpeechRecognitionSession | null = null
  private closed = false
  private muted = false
  private speaking = false
  private speakerEnabled = true
  private speechGeneration = 0
  private speechText = ''
  private speechController: AbortController | null = null
  private speechAudio: HTMLAudioElement | null = null
  private speechObjectUrl: string | null = null
  private restartTimer: number | null = null

  constructor(callbacks: BrowserVoiceCallbacks) {
    this.callbacks = callbacks
  }

  connect(language: 'en' | 'ar'): void {
    const speechWindow = window as WindowWithSpeechRecognition
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      throw new Error('This browser does not support voice input. Continue in text chat.')
    }

    this.closed = false
    this.recognition = new Recognition()
    this.recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US'
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.onstart = () => this.callbacks.onState(this.muted ? 'muted' : 'listening')
    this.recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const content = result?.[0]?.transcript.trim()
        if (!content) continue
        if (this.speaking) {
          if (this.isSpeechEcho(content)) continue
          if (result.isFinal) this.interruptSpeech()
        }
        this.callbacks.onTranscription({
          id: `browser-${Date.now()}-${index}`,
          speaker: 'user',
          content,
          final: result.isFinal,
          receivedAt: Date.now(),
        })
      }
    }
    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      const message =
        event.error === 'not-allowed'
          ? 'Microphone permission is required for voice input. Allow access or continue in text chat.'
          : `Browser voice input failed (${event.error}). Continue in text chat.`
      this.callbacks.onError(message)
      this.callbacks.onState('error')
    }
    this.recognition.onend = () => {
      if (!this.closed && !this.muted) this.scheduleRestart()
    }
    this.recognition.start()
  }

  setLanguage(language: 'en' | 'ar'): void {
    if (this.recognition) this.recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US'
  }

  async speak(text: string, language: 'en' | 'ar'): Promise<void> {
    const content = text.trim()
    if (this.closed || !this.speakerEnabled || !content) return
    this.cancelSpeech()
    const generation = this.speechGeneration
    this.speechText = content
    this.speaking = true
    this.callbacks.onState('speaking')
    const controller = new AbortController()
    this.speechController = controller

    try {
      const response = await fetch('/api/assistant/tts', {
        method: 'POST',
        headers: { Accept: 'audio/wav', 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, language }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error?.trim() || `Noura voice request failed (${response.status}).`)
      }
      if (generation !== this.speechGeneration || this.closed) return

      const blob = await response.blob()
      if (generation !== this.speechGeneration || this.closed) return
      const objectUrl = URL.createObjectURL(blob)
      const audio = new Audio(objectUrl)
      audio.preload = 'auto'
      this.speechAudio = audio
      this.speechObjectUrl = objectUrl
      const ended = new Promise<void>((resolve, reject) => {
        audio.addEventListener('ended', () => resolve(), { once: true })
        audio.addEventListener('error', () => reject(new Error('Noura audio could not be played.')), {
          once: true,
        })
      })
      await Promise.all([audio.play(), ended])
    } catch (error) {
      if (controller.signal.aborted || generation !== this.speechGeneration) return
      this.callbacks.onError(
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Noura voice could not be played. The text reply is still available.',
      )
    } finally {
      if (generation === this.speechGeneration) {
        this.releaseSpeechAudio()
        this.speechController = null
        this.speechText = ''
        this.speaking = false
        this.callbacks.onState(this.muted ? 'muted' : this.recognition ? 'listening' : 'error')
        this.ensureListening()
      }
    }
  }

  setSpeakerEnabled(enabled: boolean): void {
    this.speakerEnabled = enabled
    if (!enabled) {
      this.cancelSpeech()
      this.callbacks.onState(this.muted ? 'muted' : 'listening')
      this.ensureListening()
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) {
      this.recognition?.stop()
      this.callbacks.onState('muted')
      return
    }
    this.callbacks.onState('listening')
    this.ensureListening()
  }

  disconnect(): void {
    this.closed = true
    this.muted = false
    this.cancelSpeech()
    if (this.restartTimer !== null) window.clearTimeout(this.restartTimer)
    this.restartTimer = null
    this.recognition?.abort()
    this.recognition = null
    this.callbacks.onState('disconnected')
  }

  private cancelSpeech(): void {
    this.speechGeneration += 1
    this.speaking = false
    this.speechText = ''
    this.speechController?.abort()
    this.speechController = null
    this.releaseSpeechAudio()
  }

  interruptSpeech(): void {
    if (!this.speaking) return
    this.cancelSpeech()
    this.callbacks.onInterruption()
    this.callbacks.onState(this.muted ? 'muted' : this.recognition ? 'listening' : 'error')
    this.ensureListening()
  }

  private releaseSpeechAudio(): void {
    if (this.speechAudio) {
      this.speechAudio.pause()
      this.speechAudio.removeAttribute('src')
      this.speechAudio.load()
      this.speechAudio = null
    }
    if (this.speechObjectUrl) {
      URL.revokeObjectURL(this.speechObjectUrl)
      this.speechObjectUrl = null
    }
  }

  private isSpeechEcho(text: string): boolean {
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    const heard = normalize(text)
    const spoken = normalize(this.speechText)
    return heard.length >= 8 && (spoken.includes(heard) || heard.includes(spoken.slice(0, 24)))
  }

  private ensureListening(): void {
    if (this.closed || this.muted || !this.recognition) return
    try {
      this.recognition.start()
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'InvalidStateError') throw error
    }
  }

  private scheduleRestart(): void {
    if (this.restartTimer !== null) window.clearTimeout(this.restartTimer)
    this.restartTimer = window.setTimeout(() => {
      this.restartTimer = null
      this.ensureListening()
    }, 350)
  }
}
