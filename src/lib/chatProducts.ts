import { parseAssistantContent } from './formatAssistantMessage.ts'
import { isNahdiPdpUrl } from './productUrl.ts'
import type { ChatMessage, ProductLink } from '../types/chat'

export function uniqueNahdiProducts(products: ProductLink[]): ProductLink[] {
  const seen = new Set<string>()
  return products.filter((product) => {
    if (!isNahdiPdpUrl(product.url) || seen.has(product.url)) return false
    seen.add(product.url)
    return true
  })
}

export function getMessageProducts(message: ChatMessage): ProductLink[] {
  const parsed = parseAssistantContent(message.content, message.products ?? [])
  return uniqueNahdiProducts(parsed.products)
}
