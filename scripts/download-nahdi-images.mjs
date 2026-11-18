import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'public', 'images', 'products')
const manifestPath = path.join(root, 'src', 'data', 'productAssets.json')

const SEED_URLS = [
  'https://www.nahdionline.com/en-sa/avene-cicalfate-plus-repair-cream-40-ml/pdp/101594178',
  'https://www.nahdionline.com/en-sa/uriage-depiderm-brightening-booster-serum-30ml/pdp/103483949',
  'https://www.nahdionline.com/en-sa/dermactive-acti-repair-cica-cream-50ml/pdp/103367884',
  'https://www.nahdionline.com/en-sa/avene-cleanance-gel-400-ml/pdp/101363601',
  'https://www.nahdionline.com/en-sa/avene-cream-spf-50-fragrance-free-50-ml/pdp/101275222',
  'https://www.nahdionline.com/en-sa/avene-cold-cream-nourishes-for-very-dry-sensitive-skin-100-ml/pdp/100571599',
  'https://www.nahdionline.com/en-sa/avene-sunscreen-fluid-spf-50-fragrance-free-50ml/pdp/101485449',
  'https://www.nahdionline.com/en-sa/avene-cream-xera-calm-lipid-replenishing-200-ml/pdp/101363599',
  'https://www.nahdionline.com/en-sa/avene-cleanance-micellar-water-400-ml/pdp/101363572',
  'https://www.nahdionline.com/en-sa/avene-cicalfate-anti-scar-gel-30-ml/pdp/101840623',
  'https://www.nahdionline.com/en-sa/avene-cicaflate-cream-100-ml/pdp/102575614',
  'https://www.nahdionline.com/en-sa/avene-spray-spf-50-200-ml/pdp/103773971',
]

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function productIdFromUrl(url) {
  const parts = url.replace(/\/+$/, '').split('/')
  return parts[parts.length - 1] || 'unknown'
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function absUrl(value, base) {
  try {
    return new URL(value, base).toString()
  } catch {
    return null
  }
}

function pickImage(html, pageUrl) {
  const patterns = [
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /"image"\s*:\s*"([^"]+)"/i,
    /"image"\s*:\s*\[\s*"([^"]+)"/i,
    /https:\/\/ecombe\.nahdionline\.com\/media\/catalog\/product\/[^"'\\\s]+/i,
  ]
  for (const pat of patterns) {
    const m = html.match(pat)
    if (!m) continue
    const url = absUrl(m[1] || m[0], pageUrl)
    if (url && /^https?:/i.test(url)) return url
  }
  return null
}

function pickPrice(html) {
  const m =
    html.match(/"price"\s*:\s*"?([\d.]+)"?/i) ||
    html.match(/SAR\s*([\d.,]+)/i) ||
    html.match(/"priceCurrency"\s*:\s*"SAR"[^]{0,80}"price"\s*:\s*"?([\d.]+)"?/i)
  if (!m) return null
  return `SAR ${m[1]}`
}

function extFromUrl(url, contentType) {
  const clean = url.split('?')[0].toLowerCase()
  if (clean.endsWith('.png')) return 'png'
  if (clean.endsWith('.webp')) return 'webp'
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'jpg'
  if (contentType?.includes('png')) return 'png'
  if (contentType?.includes('webp')) return 'webp'
  return 'jpg'
}

await mkdir(outDir, { recursive: true })
const assets = {}

for (const url of SEED_URLS) {
  const id = productIdFromUrl(url)
  process.stdout.write(`fetch ${id}… `)
  try {
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-SA,en;q=0.9',
      },
    })
    if (!pageRes.ok) {
      console.log('PAGE', pageRes.status)
      await sleep(1500)
      continue
    }
    const html = await pageRes.text()
    const imageUrl = pickImage(html, url)
    const price = pickPrice(html)
    if (!imageUrl) {
      console.log('NO IMAGE')
      await sleep(1500)
      continue
    }
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': UA, Accept: 'image/*', Referer: url },
    })
    if (!imgRes.ok) {
      console.log('IMG', imgRes.status, imageUrl)
      await sleep(1500)
      continue
    }
    const buf = Buffer.from(await imgRes.arrayBuffer())
    const ext = extFromUrl(imageUrl, imgRes.headers.get('content-type'))
    const fileName = `${id}.${ext}`
    await writeFile(path.join(outDir, fileName), buf)
    assets[id] = {
      url,
      localImage: `/images/products/${fileName}`,
      sourceImage: imageUrl,
      price,
      rating: null,
      ratingCount: null,
    }
    console.log('OK', fileName, price || '')
  } catch (error) {
    console.log('ERR', error instanceof Error ? error.message : error)
  }
  await sleep(1800)
}

await writeFile(manifestPath, JSON.stringify(assets, null, 2))
console.log('wrote', Object.keys(assets).length, 'assets ->', manifestPath)
