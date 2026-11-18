import { productIdFromUrl, titleFromProductUrl } from '../lib/productUrl'
import productAssets from './productAssets.json'

type ProductAsset = {
  localImage?: string
  sourceImage?: string
  price?: string | null
  rating?: string | null
  ratingCount?: string | null
}

const ASSETS = productAssets as Record<string, ProductAsset>

export type SkinConcern = 'dry' | 'oily' | 'spots' | 'sensitive' | 'aging' | 'sun'
export type RoutineStep = 'cleanser' | 'toner' | 'serum' | 'moisturizer' | 'sunscreen'

export type CatalogProduct = {
  id: string
  url: string
  name: string
  brand: string
  concerns: SkinConcern[]
  steps: RoutineStep[]
  /** Enriched at runtime via product-preview — never invent offline. */
  imageUrl?: string
  price?: string
  oldPrice?: string
  rating?: string
  ratingCount?: string
}

const SEED_URLS: { url: string; concerns: SkinConcern[]; steps: RoutineStep[] }[] = [
  {
    url: 'https://www.nahdionline.com/en-sa/avene-cicalfate-plus-repair-cream-40-ml/pdp/101594178',
    concerns: ['sensitive', 'dry'],
    steps: ['moisturizer'],
  },
  {
    url: 'https://www.nahdionline.com/en-sa/uriage-depiderm-brightening-booster-serum-30ml/pdp/103483949',
    concerns: ['spots', 'aging'],
    steps: ['serum'],
  },
  {
    url: 'https://www.nahdionline.com/en-sa/dermactive-acti-repair-cica-cream-50ml/pdp/103367884',
    concerns: ['sensitive', 'dry'],
    steps: ['moisturizer'],
  },
  {
    url: 'https://www.nahdionline.com/en-sa/avene-cleanance-gel-400-ml/pdp/101363601',
    concerns: ['oily', 'spots'],
    steps: ['cleanser'],
  },
  {
    url: 'https://www.nahdionline.com/en-sa/avene-cream-spf-50-fragrance-free-50-ml/pdp/101275222',
    concerns: ['sun', 'sensitive'],
    steps: ['sunscreen'],
  },
  {
    url: 'https://www.nahdionline.com/en-sa/avene-cold-cream-nourishes-for-very-dry-sensitive-skin-100-ml/pdp/100571599',
    concerns: ['dry', 'sensitive'],
    steps: ['moisturizer'],
  },
  {
    url: 'https://www.nahdionline.com/en-sa/avene-sunscreen-fluid-spf-50-fragrance-free-50ml/pdp/101485449',
    concerns: ['sun', 'sensitive'],
    steps: ['sunscreen'],
  },
  {
    url: 'https://www.nahdionline.com/en-sa/avene-cream-xera-calm-lipid-replenishing-200-ml/pdp/101363599',
    concerns: ['dry', 'sensitive'],
    steps: ['moisturizer'],
  },
  {
    url: 'https://www.nahdionline.com/en-sa/avene-cleanance-micellar-water-400-ml/pdp/101363572',
    concerns: ['oily', 'sensitive'],
    steps: ['cleanser', 'toner'],
  },
  {
    url: 'https://www.nahdionline.com/en-sa/avene-cicalfate-anti-scar-gel-30-ml/pdp/101840623',
    concerns: ['sensitive', 'spots'],
    steps: ['serum'],
  },
  {
    url: 'https://www.nahdionline.com/en-sa/avene-cicaflate-cream-100-ml/pdp/102575614',
    concerns: ['sensitive', 'dry'],
    steps: ['moisturizer'],
  },
  {
    url: 'https://www.nahdionline.com/en-sa/avene-spray-spf-50-200-ml/pdp/103773971',
    concerns: ['sun'],
    steps: ['sunscreen'],
  },
]

function brandFromSlugName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'Nahdi'
}

export const CATALOG: CatalogProduct[] = SEED_URLS.map(({ url, concerns, steps }) => {
  const id = productIdFromUrl(url)
  const name = titleFromProductUrl(url)
  const asset = ASSETS[id]
  const localPrice =
    typeof asset?.price === 'string' && /\d/.test(asset.price) ? asset.price : undefined
  return {
    id,
    url,
    name,
    brand: brandFromSlugName(name),
    concerns,
    steps,
    imageUrl: asset?.localImage || undefined,
    price: localPrice,
    rating: asset?.rating || undefined,
    ratingCount: asset?.ratingCount || undefined,
  }
})

export function getProductById(id: string): CatalogProduct | undefined {
  return CATALOG.find((product) => product.id === id)
}

export function getProductByUrl(url: string): CatalogProduct | undefined {
  return CATALOG.find((product) => product.url === url)
}

export function productsForConcern(concern: SkinConcern | 'all' | 'deals'): CatalogProduct[] {
  if (concern === 'all' || concern === 'deals') return CATALOG
  return CATALOG.filter((product) => product.concerns.includes(concern))
}

export function productsForStep(step: RoutineStep): CatalogProduct[] {
  return CATALOG.filter((product) => product.steps.includes(step))
}

export const CATEGORY_SLUGS = [
  'all',
  'deals',
  'cleanser',
  'serum',
  'moisturizer',
  'sunscreen',
  'oily',
  'aging',
  'dry',
  'spots',
  'sensitive',
  'sun',
] as const

export type CategorySlug = (typeof CATEGORY_SLUGS)[number]

export function productsForCategory(slug: string): CatalogProduct[] {
  if (slug === 'all' || slug === 'deals') return CATALOG
  if (slug === 'cleanser' || slug === 'serum' || slug === 'moisturizer' || slug === 'sunscreen') {
    return productsForStep(slug)
  }
  if (
    slug === 'dry' ||
    slug === 'oily' ||
    slug === 'spots' ||
    slug === 'sensitive' ||
    slug === 'aging' ||
    slug === 'sun'
  ) {
    return productsForConcern(slug)
  }
  return CATALOG
}
