import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isLikelyVoiceRequest,
  sanitizeVoiceTranscript,
} from '../src/lib/voiceTranscript.ts'

test('removes broadcast outros without losing the skincare request', () => {
  const transcript = sanitizeVoiceTranscript(
    'Thank you for watching this video. Suggest me some products for oily skin.',
  )

  assert.equal(transcript, 'Suggest me some products for oily skin')
  assert.equal(isLikelyVoiceRequest(transcript), true)
})

test('rejects non-request background phrases before they reach chat', () => {
  const transcript = sanitizeVoiceTranscript(
    'Thank you for watching this video, please subscribe to my channel.',
  )

  assert.equal(transcript, '')
  assert.equal(isLikelyVoiceRequest('just me or as far as this game'), false)
})

test('accepts product questions and voice navigation actions', () => {
  assert.equal(isLikelyVoiceRequest('Which cleanser is good for oily skin?'), true)
  assert.equal(isLikelyVoiceRequest('Add it to the cart'), true)
  assert.equal(isLikelyVoiceRequest('What time is the pharmacy open?'), true)
  assert.equal(isLikelyVoiceRequest('H'), false)
})
