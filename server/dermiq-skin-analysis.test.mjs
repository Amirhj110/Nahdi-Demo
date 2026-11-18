import assert from 'node:assert/strict'
import test from 'node:test'
import { Readable } from 'node:stream'
import { handleDermIQSkinAnalysis, parseDermIQAnalysis } from './dermiq-skin-analysis.ts'

function resultJson() {
  return {
    all: { score: 78.5 },
    hd_redness: { ui_score: 82, reliability_tier: 'high' },
    hd_texture: { ui_score: 61, reliability_tier: 'low' },
    hd_pore: { ui_score: 90, reliability_tier: 'high' },
    hd_acne: { ui_score: 88, reliability_tier: 'medium' },
    hd_oiliness: { ui_score: 70, reliability_tier: 'medium' },
  }
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

test('maps DermIQ health scores to non-diagnostic visible-signal estimates', () => {
  const parsed = parseDermIQAnalysis(resultJson())
  assert.deepEqual(parsed?.concerns, [])
})

test('rejects incomplete or out-of-range DermIQ results', () => {
  const incomplete = resultJson()
  delete incomplete.hd_oiliness
  assert.equal(parseDermIQAnalysis(incomplete), null)

  const invalid = resultJson()
  invalid.hd_redness.ui_score = 101
  assert.equal(parseDermIQAnalysis(invalid), null)
})

test('maps only supported, medium-or-higher DermIQ concerns', () => {
  const visibleSignals = resultJson()
  for (const key of Object.keys(visibleSignals)) {
    if (key === 'all') continue
    visibleSignals[key].ui_score = 20
  }
  visibleSignals.hd_texture.reliability_tier = 'low'
  const parsed = parseDermIQAnalysis(visibleSignals)
  assert.deepEqual(parsed?.concerns, [
    { id: 'redness', confidence: 'high' },
    { id: 'pores', confidence: 'high' },
    { id: 'acne', confidence: 'medium' },
    { id: 'oiliness', confidence: 'medium' },
  ])
})

test('does not turn weak DermIQ signals into scan concerns', () => {
  const lowSignal = resultJson()
  for (const key of Object.keys(lowSignal)) {
    if (key === 'all') continue
    lowSignal[key].ui_score = 95
  }
  const parsed = parseDermIQAnalysis(lowSignal)
  assert.deepEqual(parsed?.concerns, [])
})

test('uploads once and polls the accepted DermIQ analysis until complete', async (t) => {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (input, init = {}) => {
    requests.push({ url: String(input), init })
    if (requests.length === 1) {
      const form = init.body
      assert.ok(form instanceof FormData)
      assert.equal(form.get('file').type, 'image/jpeg')
      return new Response(JSON.stringify({ analysis_id: 'analysis-1', status: 'pending' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (requests.length === 2) {
      return new Response(JSON.stringify({ status: 'processing' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ status: 'completed', result_json: resultJson() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const res = response()
  await handleDermIQSkinAnalysis(
    request({ mimeType: 'image/jpeg', imageBase64: 'aGVsbG8=' }, `dermiq-test-${Date.now()}`),
    res,
    'test-api-key',
    undefined,
  )

  const payload = JSON.parse(res.body)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(payload.analysis.concerns, [])
  assert.equal(requests.length, 3)
  assert.equal(requests[0].url, 'https://dev.dermiq.cloud/v1/analyze')
  assert.equal(requests[0].init.headers.Authorization, 'Bearer test-api-key')
  assert.equal(requests[1].url, 'https://dev.dermiq.cloud/v1/results/analysis-1')
})
