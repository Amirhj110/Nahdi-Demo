import assert from 'node:assert/strict'
import test from 'node:test'
import { formatAssistantSpeechText } from '../src/lib/formatAssistantMessage.ts'

test('keeps only natural reply text when speaking a formatted answer', () => {
  const text = formatAssistantSpeechText(
    [
      'For dry skin, choose a gentle, fragrance-free cleanser.',
      '',
      '## Product showcase',
      '**Avene Cicalfate Plus**',
      '- Brand: Avene',
      '- Price: SAR 40',
      '- Product link: https://www.nahdionline.com/product',
    ].join('\n'),
  )

  assert.equal(text, 'For dry skin, choose a gentle, fragrance-free cleanser.')
  assert.doesNotMatch(text, /Product showcase|Brand:|Price:|https?:\/\//i)
})

test('preserves a plain answer for the caption and spoken reply', () => {
  const answer = 'Use a gentle cleanser, then apply moisturizer while your skin is damp.'
  assert.equal(formatAssistantSpeechText(answer), answer)
})
