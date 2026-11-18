import assert from 'node:assert/strict'
import test from 'node:test'
import { sendChatMessage } from '../src/services/chatApi.ts'

test('sends every natural-language turn to the assistant and keeps valid dynamic PDP links', async () => {
  const originalFetch = globalThis.fetch
  let request
  globalThis.fetch = async (url, init) => {
    request = { url, init }
    return new Response(
      JSON.stringify({
        answer: 'Here is a verified Nahdi product.',
        products: [
          {
            name: 'A new Nahdi catalogue item',
            url: 'https://www.nahdionline.com/en-sa/new-item/pdp/999999999',
            image_url: 'https://images.example.com/unverified.jpg',
            price: '1 SAR',
          },
          {
            name: 'Untrusted host',
            url: 'https://nahdionline.com.evil.example/en-sa/item/pdp/123',
          },
          {
            name: 'Insecure URL',
            url: 'http://www.nahdionline.com/en-sa/item/pdp/456',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const result = await sendChatMessage({
      message: 'Show me products for my scan.',
      sessionId: 'test-session',
      history: [{ role: 'assistant', content: 'Visible concerns: dryness.' }],
    })

    assert.equal(request.url, '/api/assistant/chat')
    assert.equal(request.init.method, 'POST')
    const body = JSON.parse(request.init.body)
    assert.match(body.question, /Current user message: Show me products for my scan/)
    assert.match(body.question, /Visible concerns: dryness/)
    assert.equal(result.ok, true)
    assert.deepEqual(result.message.products, [
      {
        name: 'A new Nahdi catalogue item',
        url: 'https://www.nahdionline.com/en-sa/new-item/pdp/999999999',
      },
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('sends routine-building requests to KB chat with evidence-only routine instructions', async () => {
  const originalFetch = globalThis.fetch
  let request
  globalThis.fetch = async (url, init) => {
    request = { url, init }
    return new Response(
      JSON.stringify({
        answer: 'Morning: cleanse, then moisturize. Evening: cleanse, then moisturize.',
        products: [
          {
            name: 'Verified routine product',
            url: 'https://www.nahdionline.com/en-sa/product/pdp/987654321',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    const result = await sendChatMessage({
      message: 'Build me a morning and night routine for dry skin.',
      sessionId: 'routine-session',
      history: [],
      voiceResponse: true,
    })

    assert.equal(request.url, '/api/assistant/chat')
    const body = JSON.parse(request.init.body)
    assert.match(body.question, /using only retrieved knowledge-base evidence/i)
    assert.match(body.question, /verified Nahdi product link is present/i)
    assert.match(body.question, /Morning Routine.*Evening Routine/s)
    assert.match(body.question, /one step per line/i)
    assert.match(body.question, /Current user message: Build me a morning and night routine for dry skin/i)
    assert.equal(result.ok, true)
    assert.equal(result.message.products[0].url, 'https://www.nahdionline.com/en-sa/product/pdp/987654321')
  } finally {
    globalThis.fetch = originalFetch
  }
})
