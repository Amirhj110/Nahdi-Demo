import { isSafeHttpUrl } from '../lib/formatAssistantMessage'

export type ProductPreview = {
  imageUrl: string | null
  price?: string
  rating?: string
  ratingCount?: string
  error?: string
}

function parsePreviewPayload(payload: unknown): ProductPreview {
  if (!payload || typeof payload !== 'object') {
    return { imageUrl: null, error: 'The product page did not return preview data.' }
  }
  const record = payload as Record<string, unknown>
  const imageUrl =
    typeof record.image_url === 'string' && isSafeHttpUrl(record.image_url)
      ? record.image_url
      : null
  const price =
    typeof record.price === 'string' && record.price.trim() ? record.price.trim() : undefined
  const rating =
    typeof record.rating === 'string' && record.rating.trim() ? record.rating.trim() : undefined
  const ratingCount =
    typeof record.rating_count === 'string' && record.rating_count.trim()
      ? record.rating_count.trim()
      : undefined
  const error = typeof record.error === 'string' ? record.error : undefined
  return { imageUrl, price, rating, ratingCount, error }
}

export async function fetchProductPreview(
  productUrl: string,
  signal?: AbortSignal,
): Promise<ProductPreview> {
  if (!isSafeHttpUrl(productUrl) || !/nahdionline\.com/i.test(productUrl) || !/\/pdp\//i.test(productUrl)) {
    return { imageUrl: null, error: 'Only Nahdi /pdp/ URLs can be previewed.' }
  }

  try {
    const query = new URLSearchParams({ url: productUrl })
    const response = await fetch(`/api/assistant/product-preview?${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: signal ?? AbortSignal.timeout(12000),
    })
    const data = await response.json().catch(() => null)
    const preview = parsePreviewPayload(data)
    if (!response.ok && !preview.error) {
      return { imageUrl: null, error: `Preview failed (${response.status}).` }
    }
    return preview
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { imageUrl: null, error: 'Preview cancelled.' }
    }
    return { imageUrl: null, error: 'Unable to load product preview.' }
  }
}
