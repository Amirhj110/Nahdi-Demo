import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildNahdiGroundedQuestion,
  buildNahdiKnowledgeSearchQuery,
  extractMentionedPdpProducts,
  getRelevantNahdiPdpUrls,
  keepOnlyVerifiedPdpUrls,
  normalizeNahdiPdpUrl,
  NAHDI_SKINCARE_KNOWLEDGEBASE,
  NahdiKnowledgeError,
  retrieveNahdiKnowledge,
  runNahdiRetrievalFirstAsk,
} from './nahdi-knowledge.ts'

const firstPdp =
  'https://www.nahdionline.com/en-sa/oilatum-cleanser/pdp/104057503'
const secondPdp =
  'https://www.nahdionline.com/en-sa/derma-cleanser/pdp/102678437'

function searchResponse(overrides = {}) {
  return new Response(
    JSON.stringify({
      knowledgebase: NAHDI_SKINCARE_KNOWLEDGEBASE,
      query: 'dry sensitive skin cleanser',
      results: [
        {
          score: 0.91,
          text: `Oilatum gentle hydrating cleanser for dry sensitive skin. Product page: ${firstPdp}. Unsafe link: https://bad.example/pdp/2`,
          document_name: 'Oilatum gentle cleanser',
          document_id: 'doc-1',
          url: firstPdp,
        },
        {
          score: 0.84,
          text: `Derma facial cleanser for sensitive and dry skin. Product page: ${secondPdp}`,
          document_name: 'Derma facial cleanser',
          document_id: 'doc-2',
          url: secondPdp,
        },
      ],
      sources: [
        { document_id: 'doc-1', document_name: 'Oilatum gentle cleanser', url: firstPdp },
      ],
      ...overrides,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

test('uses the observed Nahdi search contract and extracts only verified PDP links', async () => {
  let request
  const evidence = await retrieveNahdiKnowledge(
    'dry sensitive skin cleanser',
    'server-only-test-key',
    async (url, init) => {
      request = { url: String(url), init }
      return searchResponse()
    },
  )

  assert.equal(request.url, 'https://knowledge.bilyticaglobal.com/search')
  assert.equal(request.init.method, 'POST')
  assert.equal(request.init.headers['x-api-key'], 'server-only-test-key')
  assert.deepEqual(JSON.parse(request.init.body), {
    knowledgebase: 'nahdi_skin_care_products',
    query: 'dry sensitive skin cleanser',
  })
  assert.equal(evidence.resultCount, 2)
  assert.equal(evidence.sourceCount, 1)
  assert.deepEqual(evidence.verifiedPdpUrls, [firstPdp, secondPdp])
  assert.match(evidence.text, /Oilatum gentle cleanser/)
  assert.doesNotMatch(evidence.text, /bad\.example/)
})

test('passes retrieved evidence into the Ask question after search succeeds', async () => {
  const order = []
  let groundedQuestion = ''
  const result = await runNahdiRetrievalFirstAsk(
    'Recommend a gentle cleanser.',
    'server-only-test-key',
    async (question) => {
      order.push('ask')
      groundedQuestion = question
      return { answer: 'Oilatum cleanser', url: firstPdp }
    },
    async () => {
      order.push('search')
      return searchResponse()
    },
  )

  assert.deepEqual(order, ['search', 'ask'])
  assert.match(groundedQuestion, /Answer the user only with facts supported/)
  assert.match(groundedQuestion, /Oilatum gentle cleanser/)
  assert.ok(groundedQuestion.includes(firstPdp))
  assert.equal(result.agentResponse.url, firstPdp)
})

test('does not call the agent when search returns no evidence', async () => {
  let askCalled = false
  const noHits = new Response(
    JSON.stringify({ knowledgebase: NAHDI_SKINCARE_KNOWLEDGEBASE, results: [], sources: [] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )

  await assert.rejects(
    runNahdiRetrievalFirstAsk(
      'Recommend a product.',
      'server-only-test-key',
      async () => {
        askCalled = true
        return 'must not run'
      },
      async () => noHits,
    ),
    (error) => error instanceof NahdiKnowledgeError && error.status === 404,
  )
  assert.equal(askCalled, false)
})

test('does not call the agent when knowledge search fails', async () => {
  let askCalled = false
  await assert.rejects(
    runNahdiRetrievalFirstAsk(
      'Recommend a product.',
      'server-only-test-key',
      async () => {
        askCalled = true
        return 'must not run'
      },
      async () => new Response('{}', { status: 503 }),
    ),
    (error) => error instanceof NahdiKnowledgeError && error.status === 502,
  )
  assert.equal(askCalled, false)
})

test('rejects unexpected search response shapes without calling the agent', async () => {
  let askCalled = false
  await assert.rejects(
    runNahdiRetrievalFirstAsk(
      'Recommend a product.',
      'server-only-test-key',
      async () => {
        askCalled = true
        return 'must not run'
      },
      async () =>
        new Response(JSON.stringify({ knowledgebase: 'nahdi' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
    (error) => error instanceof NahdiKnowledgeError && error.status === 502,
  )
  assert.equal(askCalled, false)
})

test('keeps only URLs present in retrieved, secure Nahdi PDP evidence', () => {
  assert.equal(
    normalizeNahdiPdpUrl(`${firstPdp}?campaign=ignored`),
    firstPdp,
  )
  for (const unsafeUrl of [
    'http://www.nahdionline.com/en-sa/item/pdp/123',
    'https://nahdionline.com.attacker.example/en-sa/item/pdp/123',
    'https://user@www.nahdionline.com/en-sa/item/pdp/123',
    'https://www.nahdionline.com/en-sa/category',
  ]) {
    assert.equal(normalizeNahdiPdpUrl(unsafeUrl), null)
  }

  const answer = keepOnlyVerifiedPdpUrls(
    `Oilatum: ${firstPdp} Another product: https://www.nahdionline.com/en-sa/other/pdp/999`,
    [firstPdp],
  )
  assert.ok(answer.includes(firstPdp))
  assert.doesNotMatch(answer, /other\/pdp/)
})

test('repairs malformed duplicate-URL product links using the verified PDP title', () => {
  const malformed = `Product page: [${firstPdp}(${firstPdp})`
  assert.equal(
    keepOnlyVerifiedPdpUrls(malformed, [firstPdp]),
    `Product page: [Oilatum Cleanser](${firstPdp})`,
  )
})

test('removes dangling markdown links from assistant answers', () => {
  assert.equal(
    keepOnlyVerifiedPdpUrls('See [this link](', [firstPdp]),
    'See this link',
  )
})

test('links mentioned KB products to their verified PDPs when the agent omits URLs', () => {
  const purestPdp =
    'https://www.nahdionline.com/en-sa/the-purest-solutions-oil-control-toner-200-ml/pdp/102645061'
  const biretixPdp =
    'https://www.nahdionline.com/en-sa/biretix-oil-control-solution-100ml/pdp/103800983'
  const answer =
    'The Purest Solutions Oil Control Toner for Oily Skin 200 ml and Biretix Oil Control Solution 100ml.'

  assert.deepEqual(
    extractMentionedPdpProducts(answer, [purestPdp, biretixPdp, secondPdp]),
    [
      { name: 'The Purest Solutions Oil Control Toner 200 Ml', url: purestPdp },
      { name: 'Biretix Oil Control Solution 100ml', url: biretixPdp },
    ],
  )
})

test('builds a grounded question from user text and retrieved evidence only', () => {
  const evidence = {
    text: `Source: Oilatum\nRetrieved information: gentle cleanser\nVerified Nahdi PDPs: ${firstPdp}`,
    verifiedPdpUrls: [firstPdp],
    resultCount: 1,
    sourceCount: 1,
  }
  const question = buildNahdiGroundedQuestion('Suggest a cleanser.', evidence)
  assert.match(question, /Suggest a cleanser/)
  assert.match(question, /Retrieved Nahdi knowledge-base evidence/)
  assert.ok(question.includes(firstPdp))
})

test('bounds grounded Ask requests while retaining the latest question and verified links', () => {
  const currentQuestion = 'Current user message: Suggest me some products for oily skin.'
  const evidence = {
    text: `Source: Oily skin products\nRetrieved information: ${'Helpful product details. '.repeat(300)}`,
    verifiedPdpUrls: [firstPdp, secondPdp],
    resultCount: 2,
    sourceCount: 2,
  }
  const question = buildNahdiGroundedQuestion(
    `${'Earlier conversation. '.repeat(200)}${currentQuestion}`,
    evidence,
  )

  assert.ok(question.length <= 3_900)
  assert.ok(question.includes(currentQuestion))
  assert.ok(question.includes(firstPdp))
  assert.ok(question.includes(secondPdp))
  assert.match(question, /Retrieved Nahdi knowledge-base evidence/)
  assert.match(question, /Helpful product details/)
})

test('searches the KB from the current user turn with targeted oily-skin terms', () => {
  assert.equal(
    buildNahdiKnowledgeSearchQuery(
      'Reply in two short sentences. Earlier discussion. Current user message: Suggest me some products for oily skin.',
    ),
    'products for oily skin, oil control',
  )
  assert.equal(
    buildNahdiKnowledgeSearchQuery('Current user message: Which cleanser suits oily skin?'),
    'oily skin cleanser',
  )
})

test('builds a focused KB query from accepted scan findings', () => {
  const query = buildNahdiKnowledgeSearchQuery(
    'Reply in English. Current user message: Accepted scan findings: oiliness (Visible shine), pores (Visible pores), texture (Uneven texture). Recommend relevant products only.',
  )
  assert.deepEqual(query.split(', ').sort(), [
    'oily skin oil control',
    'uneven skin texture',
    'visible pores pore care',
  ].sort())
})

test('only exposes verified product links whose KB evidence matches the request', () => {
  const oilyPdp =
    'https://www.nahdionline.com/en-sa/oil-control-moisturizer/pdp/102645061'
  const dryPdp =
    'https://www.nahdionline.com/en-sa/nivea-dry-skin-lotion/pdp/102645062'
  const evidence = {
    text: [
      `Source: Oily moisturizer\nRetrieved information: Oil control moisturizer for oily skin.\nVerified Nahdi PDPs: ${oilyPdp}`,
      `Source: Dry lotion\nRetrieved information: Hydrating lotion for dry skin.\nVerified Nahdi PDPs: ${dryPdp}`,
    ].join('\n\n'),
    verifiedPdpUrls: [oilyPdp, dryPdp],
    productEvidence: [
      { url: oilyPdp, text: 'Oil control moisturizer for oily skin.' },
      { url: dryPdp, text: 'Hydrating lotion for dry skin.' },
    ],
    resultCount: 2,
    sourceCount: 2,
  }

  assert.deepEqual(
    getRelevantNahdiPdpUrls('Suggest me a moisturizer for oily skin.', evidence),
    [oilyPdp],
  )
  assert.deepEqual(
    getRelevantNahdiPdpUrls('رشحي مرطبًا للبشرة الدهنية.', evidence),
    [oilyPdp],
  )
  const groundedQuestion = buildNahdiGroundedQuestion(
    'Current user message: Suggest me a moisturizer for oily skin.',
    evidence,
  )
  assert.ok(groundedQuestion.includes(oilyPdp))
  assert.doesNotMatch(groundedQuestion, /nivea-dry-skin-lotion/)
})
