import { Link } from 'react-router-dom'
import { productsForConcern, type SkinConcern } from '../../data/catalog'
import { useLocale } from '../../state/LocaleContext'

const CONCERNS: SkinConcern[] = ['dry', 'oily', 'spots', 'sensitive', 'aging', 'sun']
const BG = ['#eaf3fb', '#ecf7f1', '#fbeee6', '#f3eefc', '#fff3e0', '#fbf3e4']

export function ConcernsGrid() {
  const { dict } = useLocale()

  return (
    <section className="page-wrap mt-10">
      <h2 className="text-[22px] font-extrabold text-[var(--navy2)]">{dict.concernsH}</h2>
      <p className="mt-1 text-[13px] text-[var(--muted)]">{dict.concernsP}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONCERNS.map((concern, i) => (
          <Link
            key={concern}
            to={`/c/${concern}`}
            className="rounded-2xl border border-[var(--line)] p-5 transition hover:border-[var(--blue)]"
            style={{ background: BG[i] }}
          >
            <div className="text-[18px] font-extrabold text-[var(--navy2)]">{dict.circ[concern]}</div>
            <div className="mt-1 text-[13px] text-[var(--muted)]">
              {productsForConcern(concern).length} {dict.products}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
