class NahdiVoiceRmsProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.frameCount = 0
    this.energy = 0
    this.sampleCount = 0
  }

  process(inputs, outputs) {
    const channels = inputs[0] ?? []
    for (const channel of channels) {
      for (const sample of channel) {
        this.energy += sample * sample
        this.sampleCount += 1
      }
    }

    this.frameCount += 1
    if (this.frameCount >= 8) {
      const rms = this.sampleCount ? Math.sqrt(this.energy / this.sampleCount) : 0
      this.port.postMessage(rms)
      this.frameCount = 0
      this.energy = 0
      this.sampleCount = 0
    }

    for (const channels of outputs) {
      for (const channel of channels) channel.fill(0)
    }
    return true
  }
}

registerProcessor('nahdi-voice-rms', NahdiVoiceRmsProcessor)
