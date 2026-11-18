import { useLocale } from '../../state/LocaleContext'

export function BrandsRow() {
  const { dict } = useLocale()

  return (
    <section className="page-wrap mt-10">
      <h2 className="mb-4 text-[22px] font-extrabold text-[var(--navy2)]">{dict.brandH}</h2>
      <div className="flex flex-wrap gap-2">
        {dict.brands.map((brand) => (
          <span
            key={brand}
            className="brand rounded-full border border-[var(--line)] bg-white px-4 py-2 text-[13px] font-bold text-[var(--ink)] transition hover:border-[var(--blue)] hover:text-[var(--blue)]"
          >
            {brand}
          </span>
        ))}
      </div>
    </section>
  )
}
