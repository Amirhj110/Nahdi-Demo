export function titleFromProductUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const skip = /^(en|ar|fr|pdp|pdps|product|products|shop|catalog|en-sa|ar-sa|en-us)$/i
    const parts = parsed.pathname
      .split('/')
      .map((part) => decodeURIComponent(part))
      .filter((part) => part && !skip.test(part) && !/^\d+$/.test(part))
    const slug = [...parts].sort((a, b) => b.length - a.length)[0] || ''
    const named = slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (named.length >= 4) return named.replace(/\b\w/g, (c) => c.toUpperCase())
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return 'View product'
  }
}

export function isGenericProductLinkLabel(name: string): boolean {
  return /^(?:this(?:\s+link)?|here|link|click(?:\s+here)?|view(?:\s+(?:this\s+)?product)?|buy\s+now|learn\s+more|shop\s+now|product\s+details?|انقر(?:ي)?(?: هنا)?|اضغط(?:ي)?(?: هنا)?|هنا|رابط(?: المنتج)?)$/i.test(
    name.trim(),
  )
}

/** Prefer numeric PDP id when present; otherwise slug. */
export function productIdFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    const pdpIndex = parts.findIndex((part) => part.toLowerCase() === 'pdp')
    if (pdpIndex >= 0 && parts[pdpIndex + 1]) return parts[pdpIndex + 1]
    const slug = parts.find((part) => !/^(en|ar|en-sa|ar-sa)$/i.test(part) && part !== 'pdp')
    return slug || encodeURIComponent(url)
  } catch {
    return encodeURIComponent(url)
  }
}

export function brandFromProductName(name: string): string {
  const first = name.trim().split(/\s+/)[0]
  return first || 'Nahdi'
}

export function isNahdiPdpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    return (
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      (!parsed.port || parsed.port === '443') &&
      (hostname === 'nahdionline.com' || hostname.endsWith('.nahdionline.com')) &&
      /\/pdp\/[^/]+(?:\/|$)/i.test(parsed.pathname)
    )
  } catch {
    return false
  }
}
