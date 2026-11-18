import { useLocale } from '../../state/LocaleContext'

export function ServicesRow() {
  const { dict } = useLocale()

  return (
    <section className="page-wrap mt-10 mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {dict.serv.map(([icon, title, sub]) => (
        <div
          key={title}
          className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[var(--sh)]"
        >
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="text-[14px] font-extrabold text-[var(--navy2)]">{title}</div>
            <div className="text-[12px] text-[var(--muted)]">{sub}</div>
          </div>
        </div>
      ))}
    </section>
  )
}
