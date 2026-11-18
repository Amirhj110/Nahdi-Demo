import assert from 'node:assert/strict'
import test from 'node:test'
import { Readable } from 'node:stream'
import { extractSttTranscript, handleSttProxy } from './stt-proxy.ts'

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
    setHeader(name, value) {
      this.headers[name] = value
    },
    end(body) {
      this.body = body
    },
  }
}

test('extracts transcripts from supported gateway response envelopes', () => {
  assert.equal(extractSttTranscript({ text: ' recognized speech ' }), 'recognized speech')
  assert.equal(extractSttTranscript({ data: { transcript: 'hello' } }), 'hello')
  assert.equal(extractSttTranscript({ result: { text: 'مرحبا' } }), 'مرحبا')
  assert.equal(extractSttTranscript({ data: {} }), null)
})

test('forwards one recorded turn to the documented STT endpoint', async (t) => {
  const originalFetch = globalThis.fetch
  let upstreamRequest
  globalThis.fetch = async (url, init) => {
    upstreamRequest = { url: String(url), init }
    return new Response(JSON.stringify({ text: 'My skin feels dry.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const res = response()
  await handleSttProxy(
    request({
      mimeType: 'audio/webm',
      audioBase64: Buffer.from('audio').toString('base64'),
      language: 'en',
    }, `stt-test-${Date.now()}`),
    res,
    'test-api-key',
  )

  assert.equal(res.statusCode, 200)
  assert.equal(JSON.parse(res.body).text, 'My skin feels dry.')
  assert.equal(upstreamRequest.url, 'https://ai.bilyticaglobal.com/stt/transcribe')
  assert.equal(upstreamRequest.init.headers['x-api-key'], 'test-api-key')
  assert.equal(upstreamRequest.init.body.get('language'), 'en')
  assert.equal(upstreamRequest.init.body.get('task'), 'transcribe')
  assert.equal(upstreamRequest.init.body.get('vad_filter'), 'true')
  assert.match(upstreamRequest.init.body.get('initial_prompt'), /oily skin.*moisturizer.*sunscreen/i)
  assert.equal(upstreamRequest.init.body.get('file').type, 'audio/webm')
})

test('rejects unsupported audio without contacting the STT provider', async (t) => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error('The provider should not be called for invalid audio.')
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const res = response()
  await handleSttProxy(
    request({
      mimeType: 'text/plain',
      audioBase64: Buffer.from('not audio').toString('base64'),
      language: 'en',
    }, `stt-invalid-test-${Date.now()}`),
    res,
    'test-api-key',
  )

  assert.equal(res.statusCode, 400)
  assert.match(JSON.parse(res.body).error, /supported audio recording/i)
})
