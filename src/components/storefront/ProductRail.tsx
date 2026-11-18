import { Link } from 'react-router-dom'
import type { CatalogProduct } from '../../data/catalog'
import { ProductCard } from '../products/ProductCard'
import { useLocale } from '../../state/LocaleContext'

type Props = {
  title: string
  subtitle?: string
  products: CatalogProduct[]
  href?: string
}

export function ProductRail({ title, subtitle, products, href = '/c/all' }: Props) {
  const { dict } = useLocale()

  return (
    <section className="page-wrap mt-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-extrabold text-[var(--navy2)]">{title}</h2>
          {subtitle && <p className="mt-1 text-[13px] text-[var(--muted)]">{subtitle}</p>}
        </div>
        <Link to={href} className="text-[14px] font-bold text-[var(--blue)]">
          {dict.viewAll}
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {products.map((product) => (
          <div key={product.id} className="w-[200px] shrink-0">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
