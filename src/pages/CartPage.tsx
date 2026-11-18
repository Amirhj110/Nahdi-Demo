import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../state/CartContext'
import { useLocale } from '../state/LocaleContext'

function priceAmount(value?: string): number | null {
  if (!value) return null
  const match = value.match(/\d[\d,]*(?:\.\d{1,2})?/)
  if (!match) return null
  const amount = Number(match[0].replace(/,/g, ''))
  return Number.isFinite(amount) ? amount : null
}

export function CartPage() {
  const { dict, locale } = useLocale()
  const { items, setQty, removeItem, clear } = useCart()
  const location = useLocation()
  const navigate = useNavigate()
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutComplete, setCheckoutComplete] = useState(false)
  const openCheckout = (location.state as { openCheckout?: boolean } | null)?.openCheckout === true

  useEffect(() => {
    if (!openCheckout) return
    setCheckoutComplete(false)
    setCheckoutOpen(items.length > 0)
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: null,
    })
  }, [items.length, location.hash, location.pathname, location.search, navigate, openCheckout])

  useEffect(() => {
    const openDemoCheckout = () => {
      setCheckoutComplete(false)
      setCheckoutOpen(true)
    }
    const closeDemoCheckout = () => {
      setCheckoutOpen(false)
      setCheckoutComplete(false)
    }
    window.addEventListener('nahdi:live-demo-checkout', openDemoCheckout)
    window.addEventListener('nahdi:live-demo-stop', closeDemoCheckout)
    window.dispatchEvent(new Event('nahdi:cart-ready'))
    return () => {
      window.removeEventListener('nahdi:live-demo-checkout', openDemoCheckout)
      window.removeEventListener('nahdi:live-demo-stop', closeDemoCheckout)
    }
  }, [])
  const formatter = useMemo(
    () => new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }),
    [locale],
  )
  const subtotal = items.every((item) => priceAmount(item.price) !== null)
    ? items.reduce((sum, item) => sum + (priceAmount(item.price) ?? 0) * item.qty, 0)
    : null
  const savings = items.reduce((sum, item) => {
    const current = priceAmount(item.price)
    const previous = priceAmount(item.oldPrice)
    return current !== null && previous !== null && previous > current
      ? sum + (previous - current) * item.qty
      : sum
  }, 0)
  const hasVerifiedSavings = items.some((item) => {
    const current = priceAmount(item.price)
    const previous = priceAmount(item.oldPrice)
    return current !== null && previous !== null && previous > current
  })

  return (
    <div className="page-wrap py-6">
      <h1 className="text-[28px] font-black text-[var(--navy2)]">{dict.cartH}</h1>
      {checkoutComplete && (
        <p role="status" className="mt-4 rounded-xl border border-[var(--green)]/30 bg-white p-4 text-[14px] font-semibold text-[var(--green)]">
          {dict.demoCheckoutComplete}
        </p>
      )}

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-8 text-center">
          <p className="text-[14px] text-[var(--muted)]">{dict.empty}</p>
          <Link to="/c/all" className="mt-4 inline-block font-bold text-[var(--blue)]">
            {dict.all}
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.url}
                className="flex gap-3 rounded-2xl border border-[var(--line)] bg-white p-4"
              >
                <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-[var(--sky)]">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="h-full w-full object-contain p-1" />
                  ) : null}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-[var(--ink)]">{item.name}</div>
                  <div className="mt-1 text-[14px] font-extrabold">
                    {item.price || dict.pricePending}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="size-7 rounded-md border border-[var(--line)]"
                      onClick={() => setQty(item.url, item.qty - 1)}
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center text-[13px] font-bold">{item.qty}</span>
                    <button
                      type="button"
                      className="size-7 rounded-md border border-[var(--line)]"
                      onClick={() => setQty(item.url, item.qty + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="ms-auto text-[12px] font-semibold text-[var(--red)]"
                      onClick={() => removeItem(item.url)}
                    >
                      {dict.remove}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[var(--sh)]">
            <div className="flex justify-between text-[14px]">
              <span>{dict.subT}</span>
              <span className="font-bold">{subtotal === null ? dict.pricePending : formatter.format(subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between text-[14px]">
              <span>{dict.save}</span>
              <span className="font-bold">{hasVerifiedSavings ? formatter.format(savings) : '—'}</span>
            </div>
            <div className="mt-2 flex justify-between text-[14px]">
              <span>{dict.delivery}</span>
              <span className="font-bold">{dict.free}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-[var(--line)] pt-3 text-[16px] font-extrabold">
              <span>{dict.total}</span>
              <span>{subtotal === null ? dict.pricePending : formatter.format(subtotal)}</span>
            </div>
            <p className="mt-2 text-[12px] text-[var(--muted)]">{dict.shippingExcluded} {dict.cartHonesty}</p>
            <div className="mt-4 space-y-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--line)] p-3">
                <input type="radio" name="fulfillment" defaultChecked className="mt-1 accent-[var(--blue)]" />
                <span>
                  <b>{dict.o1}</b>
                  <div className="text-[12px] text-[var(--muted)]">{dict.o1s}</div>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--line)] p-3">
                <input type="radio" name="fulfillment" className="mt-1 accent-[var(--blue)]" />
                <span>
                  <b>{dict.o2}</b>
                  <div className="text-[12px] text-[var(--muted)]">{dict.o2s}</div>
                </span>
              </label>
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-full bg-[var(--blue)] py-3 text-[14px] font-bold text-white"
              onClick={() => {
                setCheckoutComplete(false)
                setCheckoutOpen(true)
              }}
            >
              {dict.checkout}
            </button>
            <p className="mt-2 text-center text-[12px] text-[var(--muted)]">{dict.points}</p>
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="checkout-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="checkout-title" className="text-[20px] font-extrabold text-[var(--navy2)]">{dict.checkoutReady}</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--ink)]">{dict.checkoutNote}</p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-full border border-[var(--line)] py-2.5 text-[13px] font-bold"
                onClick={() => setCheckoutOpen(false)}
              >
                {dict.close}
              </button>
              <button
                type="button"
                className="flex-1 rounded-full bg-[var(--blue)] py-2.5 text-[13px] font-bold text-white"
                onClick={() => {
                  setCheckoutOpen(false)
                  clear()
                  setCheckoutComplete(true)
                }}
              >
                {dict.finishDemoCheckout}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
