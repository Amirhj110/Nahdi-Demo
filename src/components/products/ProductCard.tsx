import { Heart, Plus, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CatalogProduct } from '../../data/catalog'
import { fetchProductPreview } from '../../services/productPreview'
import { useCart } from '../../state/CartContext'
import { useLocale } from '../../state/LocaleContext'
import { useNav } from '../../state/NavContext'
import { humanizeProductName, isSafeHttpUrl } from '../../lib/formatAssistantMessage'

export type ProductCardModel = {
  id: string
  url: string
  name: string
  brand?: string
  imageUrl?: string
  price?: string
  oldPrice?: string
  rating?: string
  ratingCount?: string
  aiPick?: boolean
}

type Props = {
  product: ProductCardModel | CatalogProduct
  onOpen?: (product: ProductCardModel) => void
  compact?: boolean
}

function discountPct(price?: string, oldPrice?: string): number {
  const cur = Number(String(price || '').replace(/[^\d.]/g, ''))
  const was = Number(String(oldPrice || '').replace(/[^\d.]/g, ''))
  if (!cur || !was || was <= cur) return 0
  return Math.round((1 - cur / was) * 100)
}

export function toCardModel(product: ProductCardModel | CatalogProduct): ProductCardModel {
  return {
    id: product.id,
    url: product.url,
    name: humanizeProductName(product.name, product.url),
    brand: 'brand' in product ? product.brand : undefined,
    imageUrl: product.imageUrl,
    price: product.price,
    oldPrice: 'oldPrice' in product ? product.oldPrice : undefined,
    rating: product.rating,
    ratingCount: product.ratingCount,
  }
}

export function ProductCard({ product, onOpen, compact }: Props) {
  const model = toCardModel(product)
  const { dict } = useLocale()
  const { addItem } = useCart()
  const { picks } = useNav()
  const navigate = useNavigate()
  const [imageUrl, setImageUrl] = useState(model.imageUrl)
  const [price, setPrice] = useState(model.price)
  const [rating, setRating] = useState(model.rating)
  const [ratingCount, setRatingCount] = useState(model.ratingCount)
  const [loading, setLoading] = useState(!model.imageUrl || !model.price)
  const aiPick = model.aiPick || picks.includes(model.url)

  useEffect(() => {
    if (model.imageUrl && model.price) {
      setImageUrl(model.imageUrl)
      setPrice(model.price)
      setRating(model.rating)
      setRatingCount(model.ratingCount)
      setLoading(false)
      return
    }
    if (!isSafeHttpUrl(model.url)) return
    const controller = new AbortController()
    setLoading(true)
    void fetchProductPreview(model.url, controller.signal).then((preview) => {
      if (controller.signal.aborted) return
      if (preview.imageUrl) setImageUrl(preview.imageUrl)
      if (preview.price) setPrice(preview.price)
      if (preview.rating) setRating(preview.rating)
      if (preview.ratingCount) setRatingCount(preview.ratingCount)
      setLoading(false)
    })
    return () => controller.abort()
  }, [model.url, model.imageUrl, model.price, model.rating, model.ratingCount])

  const open = () => {
    if (onOpen) onOpen({ ...model, imageUrl, price, rating, ratingCount })
    else navigate(`/p/${model.id}`)
  }

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[14px] border bg-white transition hover:-translate-y-1 hover:shadow-[0_8px_22px_rgba(0,0,0,0.07)] ${
        aiPick
          ? 'border-2 border-[var(--blue)] shadow-[0_0_0_5px_rgba(59,130,196,0.14)]'
          : 'border-[#edf0f3] shadow-none'
      } ${compact ? 'min-w-[160px]' : 'min-w-[180px]'}`}
    >
      <button type="button" onClick={open} className="relative block w-full text-start">
        <div className="relative aspect-square bg-white">
          {imageUrl ? (
            <img src={imageUrl} alt={model.name} className="h-full w-full object-contain p-3" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#fafcfe] text-xs font-semibold text-[var(--muted)]">
              {loading ? dict.loadingPreview : model.brand || 'Nahdi'}
            </div>
          )}
          {aiPick && (
            <span className="absolute start-2.5 top-2.5 rounded bg-[var(--blue)] px-2 py-0.5 text-[9.5px] font-bold text-white">
              {dict.pick}
            </span>
          )}
          <span
            className="absolute end-2.5 top-2.5 grid size-[30px] place-items-center rounded-full bg-white text-[var(--blue)] shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
            aria-hidden
          >
            <Heart className="size-4" />
          </span>
          <span className="absolute bottom-2 end-2.5 grid size-8 place-items-center rounded-full bg-[var(--blue)] text-white shadow-[0_6px_14px_rgba(44,107,164,0.28)]">
            <Plus className="size-5" />
          </span>
          {model.oldPrice && price && (
            <span className="absolute start-2.5 top-2.5 z-[1] rounded-md bg-[var(--red)] px-2 py-0.5 text-[10px] font-extrabold text-white">
              -{discountPct(price, model.oldPrice)}%
            </span>
          )}
        </div>
      </button>
      <div className="flex flex-1 flex-col gap-1.5 p-3 pt-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--blue)]">
          {model.brand || model.name.split(' ')[0]}
        </div>
        <button type="button" onClick={open} className="line-clamp-2 text-start text-[13px] font-semibold leading-snug text-[var(--ink)]">
          {model.name}
        </button>
        <div className="flex items-center gap-1 text-[12px] text-[var(--muted)]">
          <Star className="size-3 fill-[var(--yellow)] text-[var(--yellow)]" />
          <span>{rating || '—'}</span>
          {ratingCount && <span>({ratingCount})</span>}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <div className="text-[15px] font-extrabold text-[var(--ink)]">
              {price || dict.pricePending}
            </div>
            {model.oldPrice && (
              <div className="text-[11px] text-[var(--muted)] line-through">{model.oldPrice}</div>
            )}
          </div>
          <button
            type="button"
            className="flex h-[34px] items-center gap-1 rounded-lg bg-[var(--blue)] px-3 text-[12.5px] font-bold text-white"
            onClick={(e) => {
              e.stopPropagation()
              addItem({
                id: model.id,
                url: model.url,
                name: model.name,
                imageUrl,
                price,
                oldPrice: model.oldPrice,
              })
            }}
          >
            <Plus className="size-3.5" />
            {dict.add}
          </button>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--green)]">
          {dict.express}
        </div>
      </div>
    </article>
  )
}
