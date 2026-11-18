import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const htmlPath = path.join(root, '..', 'nahdi-idrak-demo.html')
const html = fs.readFileSync(htmlPath, 'utf8')
const match = html.match(/const PHOTO='(data:image\/jpeg;base64,[^']+)'/)
if (!match) {
  console.error('PHOTO not found')
  process.exit(1)
}
const b64 = match[1].replace(/^data:image\/jpeg;base64,/, '')
const outDir = path.join(root, '..', 'public')
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'layla.jpg')
fs.writeFileSync(outPath, Buffer.from(b64, 'base64'))
console.log('wrote', outPath, fs.statSync(outPath).size)
