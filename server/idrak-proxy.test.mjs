import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'
import { handleIdrakProxy } from './idrak-proxy.ts'
import { readIdrakConfig } from './idrak-config.ts'
import { NAHDI_SKINCARE_KNOWLEDGEBASE } from './nahdi-knowledge.ts'

const productUrl =
  'https://www.nahdionline.com/en-sa/oilatum-cleanser/pdp/104057503'

test('prefers the public agent key for the Ask endpoint', () => {
  const config = readIdrakConfig({
    IDRAK_AGENT_KEY: 'agent-test-key',
    IDRAK_CHAT_API_KEY: 'other-test-key',
    IDRAK_API_KEY: 'generic-test-key',
  })
  assert.equal(config.chatApiKey, 'agent-test-key')
})

test('retrieves Nahdi evidence before calling the public Ask endpoint', async () => {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    requests.push({ url, init })
    if (url === 'https://knowledge.bilyticaglobal.com/search') {
      return new Response(
        JSON.stringify({
          knowledgebase: NAHDI_SKINCARE_KNOWLEDGEBASE,
          results: [
            {
              score: 0.9,
              document_name: 'Oilatum cleanser',
              text: `Gentle cleanser for oily skin. Product page: ${productUrl}`,
              url: productUrl,
            },
          ],
          sources: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url === 'https://idrak.test/api/public/agents/ask') {
      return new Response(
        JSON.stringify({ response: `Consider Oilatum cleanser: ${productUrl}` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  const req = Readable.from([
    JSON.stringify({
      question: 'Current user message: Suggest products for oily skin.',
      session_id: 'visitor-test-session',
      language: 'ar',
      temperature: 0.7,
    }),
  ])
  Object.assign(req, {
    method: 'POST',
    url: '/api/assistant/chat',
    headers: {},
    socket: { remoteAddress: '127.0.0.55' },
  })
  const response = {
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(status, headers) {
      this.statusCode = status
      this.headers = headers
    },
    end(body) {
      this.body = body
    },
  }

  try {
    const handled = await handleIdrakProxy(
      req,
      response,
      readIdrakConfig({
        IDRAK_BASE_URL: 'https://idrak.test',
        IDRAK_CHAT_API_KEY: 'test-chat-key',
      }),
    )

    assert.equal(handled, true)
    assert.equal(response.statusCode, 200)
    assert.equal(requests[0].url, 'https://knowledge.bilyticaglobal.com/search')
    assert.equal(requests[1].url, 'https://idrak.test/api/public/agents/ask')
    assert.equal(requests[1].init.headers.Authorization, 'Bearer test-chat-key')
    assert.equal(requests[1].init.headers['x-api-key'], undefined)
    const chatPayload = JSON.parse(requests[1].init.body)
    assert.deepEqual(Object.keys(chatPayload).sort(), [
      'question',
      'session_id',
      'temperature',
    ])
    assert.equal(chatPayload.session_id, 'visitor-test-session')
    assert.equal(chatPayload.temperature, 0.7)
    assert.match(chatPayload.question, /Suggest products for oily skin/)
    assert.match(chatPayload.question, /Gentle cleanser for oily skin/)
    assert.ok(chatPayload.question.includes(productUrl))
    assert.match(JSON.parse(response.body).answer, /Oilatum cleanser/)
    assert.ok(JSON.parse(response.body).answer.includes(productUrl))
  } finally {
    globalThis.fetch = originalFetch
  }
})
