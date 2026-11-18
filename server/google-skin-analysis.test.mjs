import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeWithGoogleVision, parseGoogleSkinAnalysis } from './google-skin-analysis.ts'
import { handleDermIQSkinAnalysis } from './dermiq-skin-analysis.ts'
import { Readable } from 'node:stream'

function validAnalysis() {
  return {
    usableImage: true,
    concerns: [
      { id: 'acne', confidence: 'high' },
      { id: 'oiliness', confidence: 'low' },
    ],
  }
}

function modelResponse(analysis) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(analysis) }] } }],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function request(body, address) {
  const req = Readable.from([JSON.stringify(body)])
  req.method = 'POST'
  req.socket = { remoteAddress: address }
  return req
}

function response() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode
      this.headers = headers
    },
    end(body) {
      this.body = body
    },
  }
}

test('accepts supported Gemini concerns, excludes low confidence, and rejects invalid analysis', () => {
  const parsed = parseGoogleSkinAnalysis(validAnalysis())
  assert.deepEqual(parsed?.concerns, [{ id: 'acne', confidence: 'high' }])

  const noFace = validAnalysis()
  noFace.usableImage = false
  assert.equal(parseGoogleSkinAnalysis(noFace), null)

  const unsupported = validAnalysis()
  unsupported.concerns[0].id = 'eczema'
  assert.equal(parseGoogleSkinAnalysis(unsupported), null)

  const noConcerns = validAnalysis()
  noConcerns.concerns = []
  assert.deepEqual(parseGoogleSkinAnalysis(noConcerns), { concerns: [] })

  const repeated = validAnalysis()
  repeated.concerns = [
    { id: 'acne', confidence: 'low' },
    { id: 'acne', confidence: 'high' },
  ]
  assert.deepEqual(parseGoogleSkinAnalysis(repeated)?.concerns, [
    { id: 'acne', confidence: 'high' },
  ])
})

test('sends the image to Google Gemini Vision and validates its response', async (t) => {
  const originalFetch = globalThis.fetch
  let requestUrl = ''
  let requestInit
  globalThis.fetch = async (input, init = {}) => {
    requestUrl = String(input)
    requestInit = init
    return modelResponse(validAnalysis())
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const result = await analyzeWithGoogleVision({
    mimeType: 'image/jpeg',
    imageBase64: 'aGVsbG8=',
    language: 'en',
  }, 'test-google-key')

  assert.match(requestUrl, /generativelanguage\.googleapis\.com\/v1beta\/models\//)
  assert.equal(requestInit.headers['x-goog-api-key'], 'test-google-key')
  assert.equal(JSON.parse(requestInit.body).contents[0].parts[1].inline_data.data, 'aGVsbG8=')
  assert.deepEqual(result.analysis.concerns, [{ id: 'acne', confidence: 'high' }])
})

test('can exercise Google directly through the V3 scan route without contacting DermIQ', async (t) => {
  const originalFetch = globalThis.fetch
  const urls = []
  globalThis.fetch = async (input) => {
    urls.push(String(input))
    return modelResponse(validAnalysis())
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const res = response()
  await handleDermIQSkinAnalysis(
    request({
      mimeType: 'image/jpeg',
      imageBase64: 'aGVsbG8=',
      provider: 'google',
    }, `google-direct-${Date.now()}`),
    res,
    'test-dermiq-key',
    'test-google-key',
  )

  const payload = JSON.parse(res.body)
  assert.equal(res.statusCode, 200)
  assert.equal(payload.provider, 'google')
  assert.deepEqual(payload.analysis.concerns, [{ id: 'acne', confidence: 'high' }])
  assert.equal(urls.length, 1)
  assert.match(urls[0], /generativelanguage\.googleapis\.com/)
})

test('falls back to Google when DermIQ is unavailable', async (t) => {
  const originalFetch = globalThis.fetch
  const urls = []
  globalThis.fetch = async (input) => {
    const url = String(input)
    urls.push(url)
    if (url.includes('dev.dermiq.cloud')) return new Response('{}', { status: 503 })
    return modelResponse(validAnalysis())
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const res = response()
  await handleDermIQSkinAnalysis(
    request({
      mimeType: 'image/jpeg',
      imageBase64: 'aGVsbG8=',
      provider: 'auto',
    }, `google-fallback-${Date.now()}`),
    res,
    'test-dermiq-key',
    'test-google-key',
  )

  const payload = JSON.parse(res.body)
  assert.equal(res.statusCode, 200)
  assert.equal(payload.provider, 'google')
  assert.equal(urls.length, 2)
  assert.match(urls[0], /dev\.dermiq\.cloud\/v1\/analyze/)
  assert.match(urls[1], /generativelanguage\.googleapis\.com/)
})
