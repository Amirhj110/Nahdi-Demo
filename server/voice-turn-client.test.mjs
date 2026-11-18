import assert from 'node:assert/strict'
import test from 'node:test'
import { VoiceTurnClient } from '../src/services/voiceTurnClient.ts'

function createClient(onInterruption = () => {}) {
  return new VoiceTurnClient({
    onState() {},
    onError() {},
    onInterruption,
    isAssistantBusy: () => false,
    onUtterance() {},
  })
}

test('captures user speech once input is enabled during the greeting', () => {
  const client = createClient()
  client.closed = false
  client.calibratedUntil = 1_000
  client.setInputEnabled(false)
  client.startRecording = (startedAt) => {
    client.speechStartedAt = startedAt
    client.recorder = {}
  }

  client.processVoiceLevel(0.006, 500)
  assert.equal(client.speechStartedAt, null)

  client.setInputEnabled(true)
  client.processVoiceLevel(0.06, 520)
  assert.equal(client.speechStartedAt, 520)
})

test('interrupts active speech only after sustained speech is confirmed', () => {
  let interruptions = 0
  let interruptedAt
  const client = createClient(() => {
    interruptions += 1
    interruptedAt = client.lastVoiceAt
  })
  client.closed = false
  client.speaking = true
  client.playbackActive = true
  client.playbackStartedAt = 0
  client.startRecording = (startedAt) => {
    client.speechStartedAt = startedAt
    client.recorder = {}
  }

  for (let time = 200; time <= 500; time += 20) {
    client.processVoiceLevel(0.06, time)
  }
  assert.equal(interruptions, 0)
  client.processVoiceLevel(0.06, 520)
  assert.equal(interruptions, 1)

  assert.ok(interruptedAt - 200 >= 320)
})

test('allows barge-in while the next spoken audio chunk is loading', () => {
  let interruptions = 0
  const client = createClient(() => {
    interruptions += 1
  })
  client.closed = false
  client.speaking = true
  client.startRecording = (startedAt) => {
    client.speechStartedAt = startedAt
    client.recorder = {}
  }

  for (let time = 300; time <= 600; time += 20) {
    client.processVoiceLevel(0.06, time)
  }
  assert.equal(interruptions, 0)
  client.processVoiceLevel(0.06, 620)

  assert.equal(interruptions, 1)
  assert.equal(client.speaking, false)
})

test('keeps a speech candidate across a short natural pause', () => {
  let interruptions = 0
  const client = createClient(() => {
    interruptions += 1
  })
  client.closed = false
  client.speaking = true
  client.playbackActive = true
  client.startRecording = (startedAt) => {
    client.speechStartedAt = startedAt
    client.recorder = {}
  }

  for (let time = 200; time <= 400; time += 20) {
    client.processVoiceLevel(0.06, time)
  }
  for (let time = 420; time <= 700; time += 20) {
    client.processVoiceLevel(0, time)
  }
  assert.notEqual(client.recorder, null)
  assert.equal(interruptions, 0)

  for (let time = 720; time <= 780; time += 20) {
    client.processVoiceLevel(0.06, time)
  }

  assert.equal(interruptions, 1)
})

test('discards brief speech-like noise without interrupting or submitting it', () => {
  const originalMediaRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder')
  let interruptions = 0
  let submittedTurns = 0

  class FakeMediaRecorder {
    static isTypeSupported() {
      return false
    }

    mimeType = 'audio/webm'
    state = 'inactive'
    ondataavailable = null
    onstop = null

    start() {
      this.state = 'recording'
      this.ondataavailable?.({ data: new Blob([new Uint8Array(1_400)]) })
    }

    stop() {
      this.state = 'inactive'
      this.onstop?.()
    }
  }

  Object.defineProperty(globalThis, 'MediaRecorder', {
    configurable: true,
    value: FakeMediaRecorder,
  })

  const client = createClient(() => {
    interruptions += 1
  })
  client.closed = false
  client.speaking = true
  const startRecording = client.startRecording.bind(client)
  client.startRecording = (startedAt) => startRecording(startedAt - 1_000)
  client.stream = {}
  client.callbacks.onUtterance = () => {
    submittedTurns += 1
  }

  try {
    for (let time = 0; time <= 60; time += 20) {
      client.processVoiceLevel(0.06, time)
    }
    const recorder = client.recorder
    client.processVoiceLevel(0, 481)

    assert.equal(interruptions, 0)
    assert.equal(submittedTurns, 0)
    assert.equal(client.recorder, null)
    assert.equal(client.speechConfirmed, false)
    assert.equal(client.discardedRecorders.has(recorder), true)
  } finally {
    if (originalMediaRecorder) {
      Object.defineProperty(globalThis, 'MediaRecorder', originalMediaRecorder)
    } else {
      delete globalThis.MediaRecorder
    }
  }
})

test('does not capture background-level noise or interrupt speech', () => {
  let interruptions = 0
  let recordings = 0
  const client = createClient(() => {
    interruptions += 1
  })
  client.closed = false
  client.speaking = true
  client.playbackActive = true
  client.startRecording = () => {
    recordings += 1
  }

  client.processVoiceLevel(0.025, 300)
  client.processVoiceLevel(0.025, 500)

  assert.equal(recordings, 0)
  assert.equal(interruptions, 0)
})

test('gates barge-in above measured background while still detecting louder speech', () => {
  let interruptions = 0
  let recordings = 0
  const client = createClient(() => {
    interruptions += 1
  })
  client.closed = false
  client.speaking = true
  client.playbackActive = true
  client.noiseFloor = 0.06
  client.startRecording = (startedAt) => {
    recordings += 1
    client.speechStartedAt = startedAt
    client.recorder = {}
  }

  for (let time = 200; time <= 500; time += 20) {
    client.processVoiceLevel(0.066, time)
  }
  assert.equal(recordings, 0)
  assert.equal(interruptions, 0)

  for (let time = 520; time <= 860; time += 20) {
    client.processVoiceLevel(0.11, time)
  }
  assert.equal(recordings, 1)
  assert.equal(interruptions, 1)
})

test('does not record or interrupt ambient input while the assistant is generating', () => {
  let interruptions = 0
  let recordings = 0
  const client = createClient(() => {
    interruptions += 1
  })
  client.closed = false
  client.callbacks.isAssistantBusy = () => true
  client.startRecording = () => {
    recordings += 1
  }

  for (let time = 0; time <= 1_000; time += 20) {
    client.processVoiceLevel(0.2, time)
  }

  assert.equal(recordings, 0)
  assert.equal(interruptions, 0)
})

test('uses the browser system-default microphone when connecting', async () => {
  const originals = {
    navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
    window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
    audioContext: Object.getOwnPropertyDescriptor(globalThis, 'AudioContext'),
  }
  let audioConstraints

  class FakeAudioContext {
    state = 'running'
    audioWorklet = undefined

    async resume() {}

    async close() {
      this.state = 'closed'
    }

    createMediaStreamSource() {
      return { connect() {} }
    }

    createAnalyser() {
      return {
        fftSize: 512,
        smoothingTimeConstant: 0,
        getByteTimeDomainData() {},
      }
    }
  }

  const track = { stop() {}, enabled: true }
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async (constraints) => {
          audioConstraints = constraints.audio
          return {
            getTracks: () => [track],
            getAudioTracks: () => [track],
          }
        },
      },
    },
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      MediaRecorder: class {},
      setInterval: () => 1,
      clearInterval() {},
    },
  })
  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    value: FakeAudioContext,
  })

  try {
    const client = new VoiceTurnClient({
      onState() {},
      onError() {},
      onInterruption() {},
      isAssistantBusy: () => false,
      onUtterance() {},
    })
    await client.connect()
    assert.equal(audioConstraints.deviceId, undefined)
    await client.disconnect()
  } finally {
    if (originals.navigator) Object.defineProperty(globalThis, 'navigator', originals.navigator)
    else delete globalThis.navigator
    if (originals.window) Object.defineProperty(globalThis, 'window', originals.window)
    else delete globalThis.window
    if (originals.audioContext) Object.defineProperty(globalThis, 'AudioContext', originals.audioContext)
    else delete globalThis.AudioContext
  }
})

test('keeps a voice turn open across a normal pause in speech', () => {
  let stopCalls = 0
  const client = createClient()
  client.closed = false
  client.speechStartedAt = 100
  client.lastVoiceAt = 100
  client.speechConfirmed = true
  client.recorder = {
    state: 'recording',
    stop() {
      stopCalls += 1
    },
  }

  client.processVoiceLevel(0, 1_199)
  assert.equal(stopCalls, 0)

  client.processVoiceLevel(0, 1_200)
  assert.equal(stopCalls, 1)
})

test('does not close the audio context twice when disconnect cancels microphone permission', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const originalAudioContext = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
  let resolveMicrophone
  let closeCalls = 0

  class FakeAudioContext {
    state = 'running'

    async resume() {}

    async close() {
      closeCalls += 1
      this.state = 'closed'
    }
  }

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: () =>
          new Promise((resolve) => {
            resolveMicrophone = resolve
          }),
      },
    },
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { MediaRecorder: class {} },
  })
  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    value: FakeAudioContext,
  })

  try {
    const client = createClient()
    const connecting = client.connect()
    while (!resolveMicrophone) await new Promise((resolve) => setImmediate(resolve))

    await client.disconnect()
    resolveMicrophone({
      getTracks: () => [{ stop() {} }],
    })

    await assert.doesNotReject(connecting)
    assert.equal(closeCalls, 1)
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
    else delete globalThis.navigator
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else delete globalThis.window
    if (originalAudioContext)
      Object.defineProperty(globalThis, 'AudioContext', originalAudioContext)
    else delete globalThis.AudioContext
  }
})

test('streams captions in step with synthesized audio playback', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const originalFetch = globalThis.fetch
  const captionUpdates = []

  class FakeAudioContext {
    destination = {}
    startedAt = Date.now()

    get currentTime() {
      return (Date.now() - this.startedAt) / 1_000
    }

    async resume() {}

    async decodeAudioData() {
      return { duration: 0.2 }
    }

    createBufferSource() {
      const source = {
        onended: null,
        buffer: null,
        connect() {},
        start() {
          setTimeout(() => source.onended?.(), 220)
        },
        stop() {},
      }
      return source
    }
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { setInterval, clearInterval },
  })
  globalThis.fetch = async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
  })

  try {
    const client = createClient()
    client.closed = false
    client.context = new FakeAudioContext()
    const reply = 'Hello there.'
    await client.speak(reply, 'en', 'noura', (text, final) => {
      captionUpdates.push({ text, final })
    })

    assert.ok(captionUpdates.some(({ text, final }) => text.length > 0 && text.length < reply.length && !final))
    assert.deepEqual(captionUpdates.at(-1), { text: reply, final: true })
  } finally {
    globalThis.fetch = originalFetch
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else delete globalThis.window
  }
})
