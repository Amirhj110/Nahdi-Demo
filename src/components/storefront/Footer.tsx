import { useLocale } from '../../state/LocaleContext'

export function Footer() {
  const { dict } = useLocale()

  return (
    <footer className="mt-12 border-t border-[var(--line)] bg-white">
      <div className="page-wrap grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {dict.foot.map(([title, links]) => (
          <div key={title}>
            <div className="mb-3 text-[14px] font-extrabold text-[var(--navy2)]">{title}</div>
            <ul className="space-y-1.5 text-[13px] text-[var(--muted)]">
              {links.map((link) => (
                <li key={link}>{link}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--line)] bg-[var(--sky)]">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-3 py-4 text-[12.5px] text-[var(--muted)]">
          <div className="font-bold text-[var(--blue)]">
            nahdi <span className="font-['Almarai']">النهدي</span>
          </div>
          <div>{dict.footer}</div>
          <div className="font-semibold">{dict.payH}</div>
        </div>
      </div>
    </footer>
  )
}
