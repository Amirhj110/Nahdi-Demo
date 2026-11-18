import assert from 'node:assert/strict'
import test from 'node:test'
import { buildChatQuestion } from '../src/lib/chatContext.ts'

test('carries scan concerns and attached product names into the current chat question', () => {
  const question = buildChatQuestion('Reply in English. ', 'Show me products for this scan.', [
    { role: 'user', content: 'Explain my scan results.' },
    {
      role: 'assistant',
      content: 'Visible concerns: visible shine and acne-like blemishes.',
      products: [
        {
          name: 'Avène Cleanance Gel',
          url: 'https://www.nahdionline.com/en-sa/avene-cleanance-gel-400-ml/pdp/101363601',
        },
      ],
    },
  ])

  assert.match(question, /Visible concerns: visible shine and acne-like blemishes/)
  assert.match(question, /Avène Cleanance Gel/)
  assert.match(question, /Do not invent or substitute products/)
  assert.match(question, /Current user message: Show me products for this scan\./)
})

test('bounds conversation context without truncating the current question', () => {
  const history = Array.from({ length: 10 }, (_, index) => ({
    role: 'assistant',
    content: `${index}: ${'prior context '.repeat(60)}`,
  }))
  const currentMessage = 'Please help me make a routine.'
  const question = buildChatQuestion('Reply briefly. ', currentMessage, history)

  assert.ok(question.length <= 3900)
  assert.ok(question.endsWith(`Current user message: ${currentMessage}`))
  assert.match(question, /9: prior context/)
})

test('routes scan requests without attached cards to the agent without inventing links', () => {
  const question = buildChatQuestion(
    'Reply in English. ',
    'Show me products for this scan.',
    [{ role: 'assistant', content: 'Visible concerns: no specific concern was clear.' }],
  )

  assert.match(question, /Current user message: Show me products for this scan/)
  assert.match(question, /ask the Nahdi knowledge-base agent for verified catalogue products/)
  assert.match(question, /do not make up links/)
})

test('keeps scan context available after several later chat turns', () => {
  const history = [
    {
      role: 'assistant',
      content: 'Visible concerns: dryness.',
      products: [{ name: 'Avene Cream', url: 'https://www.nahdionline.com/example/pdp/123' }],
    },
    ...Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 ? 'assistant' : 'user',
      content: `Later turn ${index}.`,
    })),
  ]
  const question = buildChatQuestion('Reply briefly. ', 'What about my scan?', history)
  assert.match(question, /Visible concerns: dryness/)
  assert.match(question, /Later turn 7\./)
})
