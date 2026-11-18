import assert from 'node:assert/strict'
import test from 'node:test'
import { getMessageProducts } from '../src/lib/chatProducts.ts'

test('exposes Nahdi PDP links parsed from an assistant reply to product actions', () => {
  const products = getMessageProducts({
    id: 'assistant-1',
    role: 'assistant',
    content: [
      'Johnson’s Skin Balance Face and Body Cream',
      'Product link: Not available in the context',
      '',
      'CeraVe Moisturizing Cream for Dry to Very Dry Skin with 3 Essential Ceramides',
      'Product link: [CeraVe Moisturizing Cream](https://www.nahdionline.com/en-sa/cerave-moisturizing-cream-for-dry-skin-with-hyaluronic-acid-50-ml/pdp/102478523)',
    ].join('\n'),
    createdAt: new Date().toISOString(),
    products: [],
  })

  assert.equal(products.length, 1)
  assert.match(products[0].name, /CeraVe/i)
  assert.equal(products[0].url, 'https://www.nahdionline.com/en-sa/cerave-moisturizing-cream-for-dry-skin-with-hyaluronic-acid-50-ml/pdp/102478523')
})

test('does not pass unrelated or non-Nahdi links to cart and open-page actions', () => {
  const products = getMessageProducts({
    id: 'assistant-2',
    role: 'assistant',
    content: [
      '[Unrelated item](https://example.com/pdp/123)',
      '[Nahdi category](https://www.nahdionline.com/en-sa/skin-care)',
    ].join('\n'),
    createdAt: new Date().toISOString(),
  })
  assert.deepEqual(products, [])
})

test('rejects deceptive, insecure, and credential-bearing Nahdi PDP URLs', () => {
  for (const url of [
    'https://nahdionline.com.attacker.example/en-sa/item/pdp/123',
    'http://www.nahdionline.com/en-sa/item/pdp/123',
    'https://user@www.nahdionline.com/en-sa/item/pdp/123',
    'https://www.nahdionline.com/en-sa/category',
  ]) {
    const products = getMessageProducts({
      id: 'assistant-untrusted',
      role: 'assistant',
      content: `[Product](${url})`,
      createdAt: new Date().toISOString(),
    })
    assert.deepEqual(products, [])
  }
})

test('keeps every unique safe recommendation for plural add-to-cart actions', () => {
  const firstUrl = 'https://www.nahdionline.com/en-sa/one/pdp/111'
  const secondUrl = 'https://www.nahdionline.com/en-sa/two/pdp/222'
  const products = getMessageProducts({
    id: 'assistant-multiple',
    role: 'assistant',
    content: '',
    createdAt: new Date().toISOString(),
    products: [
      { name: 'First', url: firstUrl },
      { name: 'First duplicate', url: firstUrl },
      { name: 'Second', url: secondUrl },
      { name: 'Unsafe', url: 'https://nahdionline.com.attacker.example/item/pdp/333' },
    ],
  })

  assert.deepEqual(products.map((product) => product.url), [firstUrl, secondUrl])
})
