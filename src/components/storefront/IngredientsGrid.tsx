import { Link } from 'react-router-dom'
import { useLocale } from '../../state/LocaleContext'

export function IngredientsGrid() {
  const { dict } = useLocale()

  return (
    <section className="page-wrap mt-10">
      <h2 className="text-[22px] font-extrabold text-[var(--navy2)]">{dict.ingH}</h2>
      <p className="mt-1 text-[13px] text-[var(--muted)]">{dict.ingP}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dict.ingsD.map(([name, abbr, color, desc, tags]) => (
          <Link
            key={name}
            to="/c/all"
            className="ing rounded-2xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--blue)] hover:shadow-[var(--sh)]"
          >
            <div className="flex items-center gap-3">
              <span
                className="grid size-11 place-items-center rounded-xl text-[13px] font-black text-white"
                style={{ background: color }}
              >
                {abbr}
              </span>
              <div>
                <div className="font-extrabold text-[var(--ink)]">{name}</div>
                <div className="bf text-[12px] font-bold text-[var(--blue)]">{tags}</div>
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--muted)]">{desc}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
