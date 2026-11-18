import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CATALOG, getProductById } from '../data/catalog'
import { ProductCard } from '../components/products/ProductCard'
import { fetchProductPreview } from '../services/productPreview'
import { useCart } from '../state/CartContext'
import { useLayla } from '../state/LaylaContext'
import { useLocale } from '../state/LocaleContext'
import { useNav } from '../state/NavContext'

export function ProductPage() {
  const { productId = '' } = useParams()
  const catalogProduct = getProductById(productId)
  const { dict } = useLocale()
  const { addItem } = useCart()
  const { openPanel, sendMessage } = useLayla()
  const { lastRecommendations, picks } = useNav()

  const fromRecs = lastRecommendations.find((item) => {
    try {
      return item.url.includes(`/pdp/${productId}`) || item.url.endsWith(`/${productId}`)
    } catch {
      return false
    }
  })

  const product = catalogProduct
    ? catalogProduct
    : fromRecs
      ? {
          id: productId,
          url: fromRecs.url,
          name: fromRecs.name,
          brand: fromRecs.name.split(' ')[0] || 'Nahdi',
          concerns: [] as Array<'dry'>,
          steps: [] as Array<'cleanser'>,
          imageUrl: fromRecs.imageUrl,
          price: fromRecs.price,
          rating: fromRecs.rating,
          ratingCount: fromRecs.ratingCount,
        }
      : null

  const productUrl = product?.url
  const [imageUrl, setImageUrl] = useState(product?.imageUrl)
  const [price, setPrice] = useState(product?.price)
  const [rating, setRating] = useState(product?.rating)
  const [ratingCount, setRatingCount] = useState(product?.ratingCount)

  useEffect(() => {
    if (!productUrl) return
    setImageUrl(product?.imageUrl)
    setPrice(product?.price)
    setRating(product?.rating)
    setRatingCount(product?.ratingCount)
    const controller = new AbortController()
    void fetchProductPreview(productUrl, controller.signal).then((preview) => {
      if (controller.signal.aborted) return
      if (preview.imageUrl) setImageUrl(preview.imageUrl)
      if (preview.price) setPrice(preview.price)
      if (preview.rating) setRating(preview.rating)
      if (preview.ratingCount) setRatingCount(preview.ratingCount)
    })
    return () => controller.abort()
  }, [productUrl, product?.imageUrl, product?.price, product?.rating, product?.ratingCount])

  if (!product) {
    return (
      <div className="page-wrap py-10">
        <h1 className="text-2xl font-bold">{dict.productNotFound}</h1>
        <Link to="/c/all" className="mt-3 inline-block text-[var(--blue)]">
          {dict.all}
        </Link>
      </div>
    )
  }

  const whyPick =
    picks.includes(product.url) || lastRecommendations.some((item) => item.url === product.url)
  const related = CATALOG.filter((item) => item.id !== product.id).slice(0, 4)

  return (
    <div className="page-wrap py-6">
      <div className="mb-4 text-[13px] text-[var(--muted)]">
        <Link to="/" className="text-[var(--blue)]">
          {dict.home}
        </Link>{' '}
        / <Link to="/c/all">{dict.skincare}</Link> / {product.name}
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-[22px] border border-[var(--line)] bg-white p-6 shadow-[var(--sh)]">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} className="mx-auto max-h-[420px] object-contain" />
          ) : (
            <div className="grid aspect-square place-items-center rounded-2xl bg-[var(--sky)] text-[var(--muted)]">
              {dict.loadingPreview}
            </div>
          )}
        </div>
        <div>
          <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--blue)]">
            {product.brand}
          </div>
          <h1 className="mt-1 text-[28px] font-black leading-tight text-[var(--navy2)]">
            {product.name}
          </h1>
          <div className="mt-2 text-[14px] text-[var(--muted)]">
            ★ {rating || '—'} {ratingCount ? `(${ratingCount})` : ''}
          </div>
          <div className="mt-4 text-[28px] font-black text-[var(--ink)]">
            {price || dict.pricePending}
          </div>
          {whyPick && (
            <div className="mt-4 rounded-2xl border border-[var(--sky2)] bg-[var(--sky)] p-4">
              <div className="text-[13px] font-bold text-[var(--blue)]">{dict.fitT}</div>
              <p className="mt-1 text-[13px] text-[var(--ink)]">
                {dict.pick} — {dict.pickContext}
              </p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full bg-[var(--blue)] px-5 py-2.5 text-[14px] font-bold text-white"
              onClick={() =>
                addItem({
                  id: product.id,
                  url: product.url,
                  name: product.name,
                  imageUrl,
                  price,
                  oldPrice: product.oldPrice,
                })
              }
            >
              {dict.addCart}
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--blue)] px-5 py-2.5 text-[14px] font-bold text-[var(--blue)]"
              onClick={() => {
                openPanel()
                void sendMessage(`Tell me about ${product.name}`)
              }}
            >
              {dict.askL}
            </button>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[12px]">
            <div className="rounded-xl bg-[var(--sky)] p-3">
              <div className="font-bold text-[var(--blue)]">{dict.size}</div>
              <div>{dict.m1}</div>
            </div>
            <div className="rounded-xl bg-[var(--sky)] p-3">
              <div className="font-bold text-[var(--blue)]">{dict.deliv}</div>
              <div>{dict.m2}</div>
            </div>
            <div className="rounded-xl bg-[var(--sky)] p-3">
              <div className="font-bold text-[var(--blue)]">{dict.pick2}</div>
              <div>{dict.m3}</div>
            </div>
          </div>
          <p className="mt-6 text-[13px] leading-relaxed text-[var(--muted)]">{dict.tabs}</p>
          <a
            href={product.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-[13px] font-bold text-[var(--blue)]"
          >
            {dict.viewOnNahdi}
          </a>
        </div>
      </div>
      <div className="mt-10">
        <h2 className="mb-4 text-[20px] font-extrabold text-[var(--navy2)]">{dict.pairs}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </div>
    </div>
  )
}
