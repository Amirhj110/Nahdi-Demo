import { Link } from 'react-router-dom'
import { CATALOG } from '../../data/catalog'
import { useLocale } from '../../state/LocaleContext'

export function PromoTiles() {
  const { dict } = useLocale()
  const images = [CATALOG[5]?.imageUrl, CATALOG[1]?.imageUrl, CATALOG[3]?.imageUrl]

  return (
    <section className="page-wrap mt-8 grid gap-4 md:grid-cols-3">
      {dict.tiles.map((tile, index) => (
        <Link
          key={tile.h}
          to={`/c/${tile.go}`}
          className="relative overflow-hidden rounded-[20px] border border-[var(--line)] p-6 shadow-[var(--sh)]"
          style={{ background: tile.bg }}
        >
          <div className="absolute -end-2 -top-2 rounded-bl-2xl bg-[var(--red)] px-3 py-1.5 text-[12px] font-extrabold text-white">
            {dict.upto} {tile.off}% {dict.offW}
          </div>
          <div className="relative z-[1] max-w-[60%]">
            <h3 className="mt-4 text-[20px] font-black text-[var(--navy2)]">{tile.h}</h3>
            <span className="mt-4 inline-block text-[13px] font-bold text-[var(--blue)]">
              {dict.showAll} →
            </span>
          </div>
          {images[index] && (
            <img
              src={images[index]}
              alt=""
              className="pointer-events-none absolute bottom-2 end-2 h-[110px] w-[110px] object-contain opacity-95"
            />
          )}
        </Link>
      ))}
    </section>
  )
}
