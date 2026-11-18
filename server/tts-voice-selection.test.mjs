import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveTtsVoice } from './tts-proxy.ts'

test('maps Noura to the Khaleeji female voice only for Arabic', () => {
  assert.deepEqual(resolveTtsVoice('noura', 'ar'), {
    voiceId: 'female_01',
    dialect: 'khaleeji',
  })
  assert.deepEqual(resolveTtsVoice('noura', 'en'), { voiceId: 'female_01' })
})

test('maps Ava and Eryn to their published English voice IDs', () => {
  assert.deepEqual(resolveTtsVoice('ava', 'en'), {
    voiceId: 'publishedfemaleGeneralen:female_01',
  })
  assert.deepEqual(resolveTtsVoice('eryn', 'en'), {
    voiceId: 'publishedfemaleGeneralen:female_02',
  })
})
