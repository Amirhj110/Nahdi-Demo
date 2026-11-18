import assert from 'node:assert/strict'
import test from 'node:test'

test('reports RMS at audio-thread cadence and keeps microphone audio out of speaker output', async (t) => {
  const previousProcessor = globalThis.AudioWorkletProcessor
  const previousRegister = globalThis.registerProcessor
  let Processor
  globalThis.AudioWorkletProcessor = class {
    constructor() {
      this.port = { messages: [], postMessage(value) { this.messages.push(value) } }
    }
  }
  globalThis.registerProcessor = (name, processor) => {
    assert.equal(name, 'nahdi-voice-rms')
    Processor = processor
  }
  t.after(() => {
    if (previousProcessor === undefined) delete globalThis.AudioWorkletProcessor
    else globalThis.AudioWorkletProcessor = previousProcessor
    if (previousRegister === undefined) delete globalThis.registerProcessor
    else globalThis.registerProcessor = previousRegister
  })

  await import(`../public/voice-rms-processor.js?test=${Date.now()}`)
  assert.ok(Processor)

  const processor = new Processor()
  const output = new Float32Array(128).fill(1)
  for (let frame = 0; frame < 8; frame += 1) {
    processor.process([[new Float32Array(128).fill(0.1)]], [[output]])
    assert.deepEqual(Array.from(output), Array(128).fill(0))
  }

  assert.equal(processor.port.messages.length, 1)
  assert.ok(Math.abs(processor.port.messages[0] - 0.1) < 0.00001)
})

test('reports silence as zero RMS', async (t) => {
  const previousProcessor = globalThis.AudioWorkletProcessor
  const previousRegister = globalThis.registerProcessor
  let Processor
  globalThis.AudioWorkletProcessor = class {
    constructor() {
      this.port = { messages: [], postMessage(value) { this.messages.push(value) } }
    }
  }
  globalThis.registerProcessor = (_name, processor) => {
    Processor = processor
  }
  t.after(() => {
    if (previousProcessor === undefined) delete globalThis.AudioWorkletProcessor
    else globalThis.AudioWorkletProcessor = previousProcessor
    if (previousRegister === undefined) delete globalThis.registerProcessor
    else globalThis.registerProcessor = previousRegister
  })

  await import(`../public/voice-rms-processor.js?test=silence-${Date.now()}`)
  const processor = new Processor()
  const silence = new Float32Array(128)
  for (let frame = 0; frame < 8; frame += 1) processor.process([[silence]], [[]])

  assert.deepEqual(processor.port.messages, [0])
})
