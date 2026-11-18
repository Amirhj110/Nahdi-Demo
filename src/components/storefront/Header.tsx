import { MapPin, Search, ShoppingCart, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../state/CartContext'
import { useLayla } from '../../state/LaylaContext'
import { useLocale } from '../../state/LocaleContext'

export function Header() {
  const { dict, locale, setLocale } = useLocale()
  const { count } = useCart()
  const { openPanel } = useLayla()

  return (
    <header className="sticky top-0 z-40">
      <div className="rainbow" />
      <div className="bg-[var(--navy2)] px-4 py-1.5 text-center text-[12.5px] text-[#b9cde3]">
        <b className="text-white">Live demo</b> by Bilytica —{' '}
        <span className="mx-0.5 inline-block rounded-full bg-white/12 px-2 py-px font-bold text-white">
          IDRAK Voice
        </span>
        <span className="mx-0.5 inline-block rounded-full bg-white/12 px-2 py-px font-bold text-white">
          IDRAK Chat
        </span>
      </div>
      <div className="bg-[var(--blue)] text-white">
        <div className="page-wrap flex flex-wrap items-center gap-3 py-3">
          <Link to="/" className="logo flex items-center gap-2.5">
            <span className="gem grid size-[34px] place-items-center rounded-[9px] bg-[conic-gradient(var(--red),var(--orange),var(--yellow),var(--green),var(--blue2),var(--purple),var(--red))]">
              <i className="block size-[18px] rounded-[5px] bg-[var(--blue)]" />
            </span>
            <span>
              <span className="block text-[22px] font-extrabold leading-none">nahdi</span>
              <span className="ar block font-['Almarai'] text-[18px] font-bold leading-none">النهدي</span>
            </span>
          </Link>
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 text-[var(--ink)]">
            <Search className="size-4 text-[var(--muted)]" />
            <input
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--muted)]"
              placeholder={dict.search}
            />
            <button
              type="button"
              onClick={openPanel}
              className="ms-auto flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--sky)] px-2.5 py-1 text-[12px] font-bold text-[var(--blue)]"
            >
              {dict.askAI}
            </button>
          </div>
          <div className="flex items-center gap-3 text-[12.5px] font-semibold">
            <span className="hidden items-center gap-1 sm:flex">
              <MapPin className="size-4" />
              {dict.pickup}
            </span>
            <button
              type="button"
              className="rounded-full border border-white/30 px-2.5 py-1"
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </button>
            <button type="button" className="hidden items-center gap-1 md:flex">
              <User className="size-4" />
              {dict.login}
            </button>
            <Link to="/cart" className="relative flex items-center gap-1">
              <ShoppingCart className="size-5" />
              {count > 0 && (
                <span className="absolute -end-2 -top-2 grid size-5 place-items-center rounded-full bg-[var(--red)] text-[10px] font-bold">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
