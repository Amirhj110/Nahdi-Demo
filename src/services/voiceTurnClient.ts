import type { TtsVoiceId, VoiceUiState } from '../types/chat'

const SILENCE_END_MS = 1_100
const SPEECH_CONFIRM_MS = 320
const SPEECH_GAP_MS = 420
const BARGE_IN_GRACE_MS = 180
const BARGE_IN_THRESHOLD = 0.05
const MAX_UTTERANCE_MS = 20_000
const MIN_UTTERANCE_MS = 280
const MIN_AUDIO_BYTES = 1_200
const MIN_THRESHOLD = 0.012
const MAX_THRESHOLD = 0.12
const MAX_SPEECH_CHUNK_LENGTH = 1_400
const TTS_REQUEST_TIMEOUT_MS = 27_000
const POST_PLAYBACK_COOLDOWN_MS = 300
const VAD_MONITOR_INTERVAL_MS = 20
const VAD_WORKLET_MODULE = '/voice-rms-processor.js'
const VAD_WORKLET_NAME = 'nahdi-voice-rms'
const VAD_FALLBACK_WARNING =
  'Low-latency voice detection is unavailable. Keep this tab active for interruptions.'

type VoiceTurnCallbacks = {
  onState: (state: VoiceUiState) => void
  onError: (message: string) => void
  onInterruption: () => void
  isAssistantBusy: () => boolean
  onUtterance: (audio: Blob, mimeType: string, durationMs: number) => void
}

function measureRms(analyser: AnalyserNode, samples: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(samples)
  let sum = 0
  for (const sample of samples) {
    const value = (sample - 128) / 128
    sum += value * value
  }
  return Math.sqrt(sum / samples.length)
}

function recorderMimeType(): string | undefined {
  for (const mimeType of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported(mimeType)) return mimeType
  }
  return undefined
}

function splitForSpeech(text: string): string[] {
  const sentences = text.match(/[^.!?؟\n]+[.!?؟]*/g) ?? [text]
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    let remaining = sentence.trim()
    while (remaining.length > MAX_SPEECH_CHUNK_LENGTH) {
      const boundary = remaining.lastIndexOf(' ', MAX_SPEECH_CHUNK_LENGTH)
      const splitAt = boundary > 0 ? boundary : MAX_SPEECH_CHUNK_LENGTH
      const part = remaining.slice(0, splitAt).trim()
      if (current) chunks.push(current)
      chunks.push(part)
      current = ''
      remaining = remaining.slice(splitAt).trim()
    }

    if (!remaining) continue
    const combined = current ? `${current} ${remaining}` : remaining
    if (combined.length > MAX_SPEECH_CHUNK_LENGTH) {
      chunks.push(current)
      current = remaining
    } else {
      current = combined
    }
  }
  if (current) chunks.push(current)
  return chunks
}

export class VoiceTurnClient {
  private readonly callbacks: VoiceTurnCallbacks
  private stream: MediaStream | null = null
  private context: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private samples: Uint8Array<ArrayBuffer> | null = null
  private rmsProcessor: AudioWorkletNode | null = null
  private recorder: MediaRecorder | null = null
  private monitorInterval: number | null = null
  private generation = 0
  private speechGeneration = 0
  private speechController: AbortController | null = null
  private playbackSource: AudioBufferSourceNode | null = null
  private speechStartedAt: number | null = null
  private lastVoiceAt = 0
  private playbackStartedAt = 0
  private playbackActive = false
  private ignoreMicUntil = 0
  private bargeInTriggered = false
  private speechConfirmed = false
  private speechActiveMs = 0
  private calibratedUntil = 0
  private noiseFloor = 0.006
  private muted = false
  private inputEnabled = true
  private speakerEnabled = true
  private speaking = false
  private closed = true
  private readonly discardedRecorders = new WeakSet<MediaRecorder>()
  private readonly confirmedRecorders = new WeakSet<MediaRecorder>()
  private finishPlayback: (() => void) | null = null

  constructor(callbacks: VoiceTurnCallbacks) {
    this.callbacks = callbacks
  }

  async connect(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone capture is unavailable in this browser. Use text chat instead.')
    }
    if (!('MediaRecorder' in window)) {
      throw new Error('This browser cannot record voice turns. Use text chat instead.')
    }

    this.closed = false
    const generation = ++this.generation
    try {
      const context = new AudioContext()
      this.context = context
      await context.resume()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      if (this.closed || generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      this.stream = stream
      const source = context.createMediaStreamSource(stream)
      this.calibratedUntil = performance.now() + 1_200
      if (context.audioWorklet) {
        try {
          await context.audioWorklet.addModule(VAD_WORKLET_MODULE)
        } catch {
          if (this.closed || generation !== this.generation) return
          this.callbacks.onError(VAD_FALLBACK_WARNING)
          this.startFallbackMonitor(source, context)
        }

        if (this.closed || generation !== this.generation) return
        if (!this.monitorInterval) {
          const processor = new AudioWorkletNode(context, VAD_WORKLET_NAME, {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1],
          })
          processor.port.onmessage = (event: MessageEvent<unknown>) => {
            if (typeof event.data === 'number' && Number.isFinite(event.data)) {
              this.processVoiceLevel(event.data, performance.now())
            }
          }
          processor.onprocessorerror = () => {
            if (this.closed || this.rmsProcessor !== processor) return
            processor.port.onmessage = null
            processor.port.close()
            processor.disconnect()
            this.rmsProcessor = null
            this.callbacks.onError(VAD_FALLBACK_WARNING)
            this.startFallbackMonitor(source, context)
          }
          source.connect(processor)
          processor.connect(context.destination)
          this.rmsProcessor = processor
        }
      } else {
        this.callbacks.onError(VAD_FALLBACK_WARNING)
        this.startFallbackMonitor(source, context)
      }

      this.callbacks.onState('listening')
    } catch (error) {
      await this.releaseMedia()
      if (this.closed || generation !== this.generation) return
      throw error instanceof DOMException && error.name === 'NotAllowedError'
        ? new Error('Allow microphone access in your browser to start voice chat.')
        : error instanceof Error
          ? error
          : new Error('The microphone could not be started.')
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    for (const track of this.stream?.getAudioTracks() ?? []) track.enabled = !muted
    if (muted) this.stopRecording(true)
    this.callbacks.onState(this.speaking ? 'speaking' : muted ? 'muted' : 'listening')
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled
    if (!enabled) {
      this.stopRecording(true)
      this.lastVoiceAt = 0
      this.bargeInTriggered = false
    }
  }

  isMuted(): boolean {
    return this.muted
  }

  setSpeakerEnabled(enabled: boolean): void {
    this.speakerEnabled = enabled
    if (!enabled) {
      this.cancelSpeech()
      this.callbacks.onState(this.muted ? 'muted' : 'listening')
    }
  }

  async speak(
    text: string,
    language: 'en' | 'ar',
    voice: TtsVoiceId,
    onProgress?: (text: string, final: boolean) => void,
  ): Promise<void> {
    const content = text.trim()
    if (this.closed || !this.speakerEnabled || !content) return

    this.cancelSpeech()
    const generation = this.speechGeneration
    const controller = new AbortController()
    this.speechController = controller
    this.speaking = true
    this.callbacks.onState('speaking')

    const chunks = splitForSpeech(content)
    let completedText = ''
    try {
      for (const chunk of chunks) {
        if (generation !== this.speechGeneration || this.closed) return
        const requestSignal = AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(TTS_REQUEST_TIMEOUT_MS),
        ])
        const response = await fetch('/api/assistant/tts', {
          method: 'POST',
          headers: { Accept: 'audio/wav', 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chunk, language, voice }),
          signal: requestSignal,
        })
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error?.trim() || `Layla voice request failed (${response.status}).`)
        }
        const context = this.context
        if (!context || generation !== this.speechGeneration || this.closed) return
        const buffer = await context.decodeAudioData(await response.arrayBuffer())
        if (generation !== this.speechGeneration || this.closed) return
        await context.resume()

        const source = context.createBufferSource()
        source.buffer = buffer
        source.connect(context.destination)
        this.playbackSource = source
        await new Promise<void>((resolve) => {
          let progressInterval: number | null = null
          const finish = () => {
            if (progressInterval !== null) {
              window.clearInterval(progressInterval)
              progressInterval = null
            }
            if (this.finishPlayback === finish) this.finishPlayback = null
            resolve()
          }
          this.playbackActive = true
          this.playbackStartedAt = performance.now()
          this.bargeInTriggered = false
          this.finishPlayback = finish
          source.onended = () => {
            this.playbackActive = false
            this.playbackStartedAt = 0
            this.ignoreMicUntil = performance.now() + POST_PLAYBACK_COOLDOWN_MS
            completedText = completedText ? `${completedText} ${chunk}` : chunk
            onProgress?.(completedText, false)
            finish()
          }
          const startedAt = context.currentTime
          progressInterval = window.setInterval(() => {
            const duration = buffer.duration
            const progress = duration > 0
              ? Math.min(1, Math.max(0, (context.currentTime - startedAt) / duration))
              : 1
            const partialChunk = chunk.slice(0, Math.floor(chunk.length * progress)).trimEnd()
            const caption = [completedText, partialChunk].filter(Boolean).join(' ')
            if (caption) onProgress?.(caption, false)
          }, 40)
          source.start()
        })
      }
      if (generation === this.speechGeneration && !this.closed) onProgress?.(content, true)
    } catch (error) {
      if (controller.signal.aborted || generation !== this.speechGeneration) return
      onProgress?.(content, true)
      this.callbacks.onError(
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Neural voice playback failed. The text reply is still available.',
      )
    } finally {
      if (generation === this.speechGeneration) {
        this.playbackSource = null
        this.speechController = null
        this.speaking = false
        this.playbackActive = false
        this.playbackStartedAt = 0
        this.callbacks.onState(this.muted ? 'muted' : 'listening')
      }
    }
  }

  interruptSpeech(): void {
    if (!this.speaking && !this.speechController) return
    this.cancelSpeech()
    this.callbacks.onInterruption()
    this.callbacks.onState(this.muted ? 'muted' : 'listening')
  }

  async disconnect(): Promise<void> {
    this.closed = true
    this.generation += 1
    this.cancelSpeech()
    this.stopRecording()
    await this.releaseMedia()
    this.muted = false
    this.callbacks.onState('disconnected')
  }

  private readonly monitor = (): void => {
    if (this.closed || !this.analyser || !this.samples) return

    this.processVoiceLevel(measureRms(this.analyser, this.samples), performance.now())
  }

  private processVoiceLevel(rms: number, now: number): void {
    if (this.closed) return
    if (!this.inputEnabled) {
      if (now < this.calibratedUntil && !this.playbackActive) {
        this.noiseFloor = this.noiseFloor * 0.8 + rms * 0.2
      }
      return
    }

    const assistantBusy = this.callbacks.isAssistantBusy()
    if (assistantBusy && !this.speaking && !this.playbackActive) {
      if (this.recorder) this.stopRecording(true)
      return
    }

    const threshold = Math.max(
      MIN_THRESHOLD,
      Math.min(MAX_THRESHOLD, this.noiseFloor * 1.35 + 0.006),
    )
    const withinBargeInGrace =
      this.playbackActive && now - this.playbackStartedAt < BARGE_IN_GRACE_MS
    const activeThreshold =
      this.speaking ? Math.max(threshold, BARGE_IN_THRESHOLD) : threshold
    const voiceDetected =
      !this.muted &&
      now >= this.ignoreMicUntil &&
      !withinBargeInGrace &&
      rms > activeThreshold

    if (now < this.calibratedUntil && !this.playbackActive && !voiceDetected) {
      this.noiseFloor = this.noiseFloor * 0.8 + rms * 0.2
    }

    if (voiceDetected) {
      if (
        this.recorder &&
        !this.speechConfirmed &&
        now - this.lastVoiceAt >= SPEECH_GAP_MS
      ) {
        this.stopRecording(true)
      }
      if (this.speechStartedAt === null) {
        this.speechStartedAt = now
        this.bargeInTriggered = false
        this.speechActiveMs = 0
        this.startRecording(now)
      } else if (!this.speechConfirmed && this.lastVoiceAt) {
        this.speechActiveMs += Math.min(
          now - this.lastVoiceAt,
          VAD_MONITOR_INTERVAL_MS * 3,
        )
      }
      this.lastVoiceAt = now
      if (
        !this.speechConfirmed &&
        this.speechActiveMs >= SPEECH_CONFIRM_MS
      ) {
        this.speechConfirmed = true
        if (this.recorder) this.confirmedRecorders.add(this.recorder)
      }
      if (
        this.speechConfirmed &&
        (this.playbackActive || this.speaking) &&
        !this.bargeInTriggered
      ) {
        this.bargeInTriggered = true
        if (this.speaking) this.interruptSpeech()
        else this.callbacks.onInterruption()
      }
      if (this.speechStartedAt !== null && now - this.speechStartedAt >= MAX_UTTERANCE_MS) {
        this.finishUtterance(now)
      }
    } else {
      if (
        this.recorder &&
        this.speechStartedAt !== null &&
        !this.speechConfirmed &&
        now - this.lastVoiceAt >= SPEECH_GAP_MS
      ) {
        this.stopRecording(true)
      } else if (
        this.recorder &&
        this.speechStartedAt !== null &&
        this.speechConfirmed &&
        now - this.lastVoiceAt >= SILENCE_END_MS
      ) {
        this.finishUtterance(now)
      }
    }
  }

  private startFallbackMonitor(source: MediaStreamAudioSourceNode, context: AudioContext): void {
    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.25
    source.connect(analyser)
    this.analyser = analyser
    this.samples = new Uint8Array(analyser.fftSize)
    this.monitorInterval = window.setInterval(this.monitor, VAD_MONITOR_INTERVAL_MS)
  }

  private startRecording(startedAt: number): void {
    const stream = this.stream
    if (!stream || this.muted || this.recorder) return
    try {
      const mimeType = recorderMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onstop = () => {
        const audio = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
        const durationMs = Math.max(0, performance.now() - startedAt)
        if (
          !this.discardedRecorders.has(recorder) &&
          this.confirmedRecorders.has(recorder) &&
          durationMs >= MIN_UTTERANCE_MS &&
          audio.size >= MIN_AUDIO_BYTES &&
          !this.closed
        ) {
          this.callbacks.onUtterance(audio, audio.type.split(';')[0] || 'audio/webm', durationMs)
        }
      }
      this.recorder = recorder
      recorder.start(200)
    } catch (error) {
      this.callbacks.onError(
        error instanceof Error ? error.message : 'The microphone recording could not be started.',
      )
    }
  }

  private finishUtterance(endedAt: number): void {
    const recorder = this.recorder
    this.recorder = null
    this.speechStartedAt = null
    this.lastVoiceAt = endedAt
    this.speechConfirmed = false
    this.speechActiveMs = 0
    this.bargeInTriggered = false
    if (recorder?.state === 'recording') recorder.stop()
  }

  private stopRecording(discard = false): void {
    const recorder = this.recorder
    if (recorder && discard) this.discardedRecorders.add(recorder)
    if (recorder?.state === 'recording') recorder.stop()
    this.recorder = null
    this.speechStartedAt = null
    this.lastVoiceAt = 0
    this.speechConfirmed = false
    this.speechActiveMs = 0
    this.bargeInTriggered = false
  }

  private cancelSpeech(): void {
    this.speechGeneration += 1
    this.speaking = false
    this.playbackActive = false
    this.playbackStartedAt = 0
    this.speechController?.abort()
    this.speechController = null
    const source = this.playbackSource
    this.playbackSource = null
    const finishPlayback = this.finishPlayback
    this.finishPlayback = null
    finishPlayback?.()
    if (source) {
      source.onended = null
      try {
        source.stop()
      } catch {
        // The source may have ended between VAD detection and cancellation.
      }
    }
  }

  private async releaseMedia(): Promise<void> {
    if (this.monitorInterval !== null) {
      window.clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    if (this.rmsProcessor) {
      this.rmsProcessor.port.onmessage = null
      this.rmsProcessor.port.close()
      this.rmsProcessor.disconnect()
      this.rmsProcessor = null
    }
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.analyser = null
    this.samples = null
    const context = this.context
    this.context = null
    if (context && context.state !== 'closed') await context.close()
  }
}
