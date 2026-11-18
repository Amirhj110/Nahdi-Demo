import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CATALOG, productsForCategory, type SkinConcern } from '../data/catalog'
import { ProductCard } from '../components/products/ProductCard'
import { useLocale } from '../state/LocaleContext'

const CONCERN_CHIPS: SkinConcern[] = ['dry', 'oily', 'spots', 'sensitive', 'aging', 'sun']

function priceAmount(price?: string): number | null {
  if (!price) return null
  const match = price.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

export function CategoryPage() {
  const { slug = 'all' } = useParams()
  const navigate = useNavigate()
  const { dict } = useLocale()
  const circ = dict.circ as Record<string, string>
  const catP = dict.catP as Record<string, string>
  const tips = dict.tips as Record<string, string>
  const chipLabels = dict.chipLabels as Record<string, string>
  const title = circ[slug] || dict.all
  const blurb = catP[slug] || dict.allP
  const tip = tips[slug] || tips.def
  const concernActive = CONCERN_CHIPS.includes(slug as SkinConcern) ? (slug as SkinConcern) : null

  const [brands, setBrands] = useState<string[]>([])
  const [priceBuckets, setPriceBuckets] = useState<string[]>([])

  const catalogBrands = useMemo(
    () => [...new Set(CATALOG.map((item) => item.brand))].sort((a, b) => a.localeCompare(b)),
    [],
  )

  const baseProducts = productsForCategory(slug)
  const products = useMemo(() => {
    return baseProducts.filter((product) => {
      if (brands.length && !brands.includes(product.brand)) return false
      if (!priceBuckets.length) return true
      const amount = priceAmount(product.price)
      if (amount == null) return true
      return priceBuckets.some((bucket) => {
        if (bucket === dict.filt.p[0]) return amount < 50
        if (bucket === dict.filt.p[1]) return amount >= 50 && amount <= 100
        return amount > 100
      })
    })
  }, [baseProducts, brands, priceBuckets, dict.filt.p])

  const toggle = (list: string[], value: string, setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  }

  return (
    <div className="page-wrap py-6 pb-28">
      <section className="cat-head flex flex-col gap-5 rounded-[22px] border border-[var(--line)] bg-gradient-to-br from-white to-[var(--sky)] px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-8">
        <div>
          <div className="mb-2 text-[13px] text-[var(--muted)]">
            <Link to="/" className="text-[var(--blue)]">
              {dict.home}
            </Link>{' '}
            / {dict.skincare} / {title}
          </div>
          <h1 className="text-[28px] font-black text-[var(--navy)] sm:text-[34px]">{title}</h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[#3d5269]">{blurb}</p>
        </div>
        <div className="flex max-w-sm gap-3 rounded-2xl border border-[var(--line)] bg-white p-3.5 shadow-[var(--sh)]">
          <img src="/layla.jpg" alt="" className="size-[42px] shrink-0 rounded-full object-cover object-[50%_30%] ring-2 ring-white" />
          <div>
            <b className="mb-1 block text-[12px] text-[var(--blue)]">✦ {dict.aiTip}</b>
            <p className="text-[13.5px] leading-snug text-[var(--ink)]">{tip}</p>
          </div>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {CONCERN_CHIPS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => navigate(`/c/${key}`)}
            className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition ${
              concernActive === key
                ? 'border-[var(--blue)] bg-[var(--blue)] text-white'
                : 'border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--blue)]'
            }`}
          >
            {chipLabels[key] || circ[key]}
          </button>
        ))}
      </div>

      <div className="catl mt-5 grid gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="side hidden h-fit rounded-2xl border border-[var(--line)] bg-white p-[18px] lg:sticky lg:top-[130px] lg:block">
          <h4 className="text-[13px] font-bold uppercase tracking-[0.6px] text-[var(--muted)]">
            {dict.filt.ty}
          </h4>
          <div className="mt-2 space-y-1">
            {CONCERN_CHIPS.map((key) => (
              <label key={key} className="flex cursor-pointer items-center gap-2.5 py-1 text-[13.5px]">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--blue)]"
                  checked={concernActive === key}
                  onChange={() => navigate(concernActive === key ? '/c/all' : `/c/${key}`)}
                />
                {chipLabels[key] || circ[key]}
              </label>
            ))}
          </div>

          <h4 className="mt-3.5 text-[13px] font-bold uppercase tracking-[0.6px] text-[var(--muted)]">
            {dict.filt.br}
          </h4>
          <div className="mt-2 space-y-1">
            {catalogBrands.map((brand) => (
              <label key={brand} className="flex cursor-pointer items-center gap-2.5 py-1 text-[13.5px]">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--blue)]"
                  checked={brands.includes(brand)}
                  onChange={() => toggle(brands, brand, setBrands)}
                />
                {brand}
              </label>
            ))}
          </div>

          <h4 className="mt-3.5 text-[13px] font-bold uppercase tracking-[0.6px] text-[var(--muted)]">
            {dict.filt.pr}
          </h4>
          <div className="mt-2 space-y-1">
            {dict.filt.p.map((bucket) => (
              <label key={bucket} className="flex cursor-pointer items-center gap-2.5 py-1 text-[13.5px]">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--blue)]"
                  checked={priceBuckets.includes(bucket)}
                  onChange={() => toggle(priceBuckets, bucket, setPriceBuckets)}
                />
                {bucket}
              </label>
            ))}
          </div>
        </aside>

        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-[13px] font-semibold text-[var(--muted)]">
              {products.length} {dict.results}
            </div>
            <select className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[13px]">
              {dict.sort.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
