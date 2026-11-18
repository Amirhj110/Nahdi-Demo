import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getVoiceActionReply,
  isRoutineBuildRequest,
  matchChatAction,
  runManualUserTurn,
} from '../src/lib/chatActions.ts'

test('routes singular and plural add-to-cart intent to shared actions', () => {
  assert.deepEqual(matchChatAction('Add it to my cart'), {
    kind: 'add_cart',
    multiple: false,
  })
  assert.deepEqual(matchChatAction('Please add them'), {
    kind: 'add_cart',
    multiple: true,
  })
  assert.deepEqual(matchChatAction('أضيفهم للسلة'), {
    kind: 'add_cart',
    multiple: true,
  })
})

test('recognizes shared routine, cart, checkout, and navigation intents', () => {
  assert.equal(matchChatAction('Build me a morning and night routine'), null)
  assert.equal(matchChatAction('Open my routine')?.kind, 'routine')
  assert.equal(isRoutineBuildRequest('Build me a morning and night routine'), true)
  assert.equal(isRoutineBuildRequest('سوّي لي روتين صباحي ومسائي'), true)
  assert.equal(isRoutineBuildRequest('Open my routine'), false)
  assert.equal(matchChatAction('Open my cart')?.kind, 'cart')
  assert.equal(matchChatAction('Take me to checkout')?.kind, 'checkout')
  assert.equal(getVoiceActionReply({ kind: 'checkout' }, 'en'), 'Opening checkout.')
  assert.equal(getVoiceActionReply({ kind: 'cart' }, 'en'), 'Opening your cart.')
  assert.equal(matchChatAction('افتحي المنتج الأول')?.kind, 'open_first')
  assert.equal(matchChatAction('Thank you for watching this video'), null)
})

test('keeps skincare questions and recommendations on the assistant path', () => {
  assert.equal(matchChatAction('What routine is best for oily skin?'), null)
  assert.equal(matchChatAction('ما أفضل روتين للبشرة؟'), null)
  assert.equal(matchChatAction('What is a skin scan?'), null)
  assert.equal(matchChatAction('Suggest an oily moisturizer and add it to cart'), null)
  assert.equal(matchChatAction('Add it to cart')?.kind, 'add_cart')
})

test('still sends the assistant turn if a local UI action fails', async () => {
  let assistantCalled = false
  const result = await runManualUserTurn(
    async () => {
      throw new Error('navigation failed')
    },
    async () => {
      assistantCalled = true
      return 'assistant response'
    },
  )

  assert.equal(assistantCalled, true)
  assert.equal(result, 'assistant response')
})

test('does not send a local cart action to the assistant', async () => {
  let assistantCalled = false
  const result = await runManualUserTurn(
    async () => true,
    async () => {
      assistantCalled = true
      return 'unexpected assistant response'
    },
  )

  assert.equal(assistantCalled, false)
  assert.equal(result, undefined)
})
