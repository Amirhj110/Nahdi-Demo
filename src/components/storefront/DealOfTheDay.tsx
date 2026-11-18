import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATALOG, type CatalogProduct } from '../../data/catalog'
import { useLocale } from '../../state/LocaleContext'
import { ProductCard } from '../products/ProductCard'

/** Mock strike prices / ratings when live PDP has no compare-at (matches HTML deal rail). */
const DEAL_META: Record<string, { price: string; oldPrice: string; rating: string; ratingCount: string }> = {
  '101594178': { price: 'SAR 67.28', oldPrice: 'SAR 89.00', rating: '4.8', ratingCount: '214' },
  '103483949': { price: 'SAR 129.00', oldPrice: 'SAR 169.00', rating: '4.7', ratingCount: '98' },
  '103367884': { price: 'SAR 79.00', oldPrice: 'SAR 99.00', rating: '4.6', ratingCount: '156' },
  '101363601': { price: 'SAR 89.00', oldPrice: 'SAR 115.00', rating: '4.7', ratingCount: '320' },
  '101275222': { price: 'SAR 95.00', oldPrice: 'SAR 125.00', rating: '4.9', ratingCount: '410' },
  '100571599': { price: 'SAR 67.28', oldPrice: 'SAR 85.00', rating: '4.8', ratingCount: '188' },
}

function withDealMeta(product: CatalogProduct): CatalogProduct {
  const meta = DEAL_META[product.id]
  if (!meta) return product
  return {
    ...product,
    price: product.price || meta.price,
    oldPrice: meta.oldPrice,
    rating: product.rating || meta.rating,
    ratingCount: product.ratingCount || meta.ratingCount,
  }
}

function useDayCountdown() {
  const [parts, setParts] = useState(['00', '00', '00'])
  useEffect(() => {
    const tick = () => {
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      let s = Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000))
      const h = String(Math.floor(s / 3600)).padStart(2, '0')
      s %= 3600
      const m = String(Math.floor(s / 60)).padStart(2, '0')
      const x = String(s % 60).padStart(2, '0')
      setParts([h, m, x])
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])
  return parts
}

export function DealOfTheDay() {
  const { dict } = useLocale()
  const [h, m, s] = useDayCountdown()
  const products = CATALOG.slice(0, 6).map(withDealMeta)

  return (
    <section className="page-wrap mt-8">
      <div className="deal-wrap">
        <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-4">
          <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-[var(--navy2)] sm:text-[22px]">
            <span aria-hidden>⚡</span>
            {dict.dealH}
          </h2>
          <div className="deal-cd flex gap-1.5" aria-label="Time left today">
            {[h, m, s].map((v, i) => (
              <span key={i}>{v}</span>
            ))}
          </div>
          <Link
            to="/c/deals"
            className="ms-auto text-[14px] font-bold text-[var(--blue)] hover:underline"
          >
            {dict.viewAll}
          </Link>
        </div>
        <div className="relative">
          <div className="flex gap-3 overflow-x-auto pb-1 pe-8">
            {products.map((product) => (
              <div key={product.id} className="w-[200px] shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center">
            <span className="grid size-9 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--navy)] shadow">
              <ChevronRight className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
