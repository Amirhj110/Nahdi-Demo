import { Link } from 'react-router-dom'
import { CATALOG } from '../../data/catalog'
import { useLocale } from '../../state/LocaleContext'

const KEYS = [
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

const COLORS = [
  '#dbeaf7',
  '#fde8ec',
  '#e8f7ef',
  '#f3eefc',
  '#fff3e0',
  '#e7f5ff',
  '#eaf7f1',
  '#f7eef8',
  '#eef3fb',
  '#fbeee6',
  '#eaf2f9',
  '#fbf3e4',
]

const IMAGE_BY_KEY: Partial<Record<(typeof KEYS)[number], string>> = {
  all: CATALOG[0]?.imageUrl,
  deals: CATALOG[1]?.imageUrl,
  cleanser: CATALOG.find((p) => p.steps.includes('cleanser'))?.imageUrl,
  serum: CATALOG.find((p) => p.steps.includes('serum'))?.imageUrl,
  moisturizer: CATALOG.find((p) => p.steps.includes('moisturizer'))?.imageUrl,
  sunscreen: CATALOG.find((p) => p.steps.includes('sunscreen'))?.imageUrl,
  oily: CATALOG.find((p) => p.concerns.includes('oily'))?.imageUrl,
  aging: CATALOG.find((p) => p.concerns.includes('aging'))?.imageUrl,
  dry: CATALOG.find((p) => p.concerns.includes('dry'))?.imageUrl,
  spots: CATALOG.find((p) => p.concerns.includes('spots'))?.imageUrl,
  sensitive: CATALOG.find((p) => p.concerns.includes('sensitive'))?.imageUrl,
  sun: CATALOG.find((p) => p.concerns.includes('sun'))?.imageUrl,
}

export function CategoryCircles() {
  const { dict } = useLocale()

  return (
    <section className="page-wrap mt-8">
      <div className="flex gap-4 overflow-x-auto pb-2">
        {KEYS.map((key, i) => {
          const image = IMAGE_BY_KEY[key]
          return (
            <Link
              key={key}
              to={`/c/${key}`}
              className="circ group flex w-[84px] shrink-0 flex-col items-center gap-2"
            >
              <span
                className="relative grid size-[72px] place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-white shadow-[0_6px_16px_rgba(20,56,92,0.08)] transition group-hover:-translate-y-0.5 group-hover:border-[var(--blue)]"
                style={{ background: image ? '#fff' : COLORS[i % COLORS.length] }}
              >
                {image ? (
                  <img src={image} alt="" className="size-full object-contain p-2" />
                ) : (
                  <span className="text-[13px] font-extrabold text-[var(--navy)]">
                    {dict.circ[key].slice(0, 2)}
                  </span>
                )}
              </span>
              <span className="text-center text-[12px] font-semibold leading-tight">
                {dict.circ[key]}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
