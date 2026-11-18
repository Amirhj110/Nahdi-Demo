import { useNavigate } from 'react-router-dom'
import type { ChatMessage } from '../../types/chat'
import { humanizeProductName, parseAssistantContent } from '../../lib/formatAssistantMessage'
import { getMessageProducts } from '../../lib/chatProducts'
import { productIdFromUrl } from '../../lib/productUrl'
import { useLocale } from '../../state/LocaleContext'
import { useNav } from '../../state/NavContext'
import { ProductCard } from '../products/ProductCard'

type Props = {
  message: ChatMessage
}

function cleanAssistantText(raw: string, hasProducts: boolean): string {
  let text = raw
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\(\s*(?=$|\s)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^\s*[-*•]\s*/gm, '')
    .replace(/^\s*(?:Product link|رابط المنتج)\s*:\s*.*$/gim, '')
  if (hasProducts) {
    const productDetails = text.search(/\s[-–—]\s*(?:Product ID|Brand|Price|URL):/i)
    if (productDetails >= 0) text = text.slice(0, productDetails)
    text = text
      .replace(/\s+\d+[.)]\s+[\s\S]*$/, '')
      .replace(/^\s*(URL|Price|Brand|Size|Key benefit|Suitable for|How to use)\s*:.+$/gim, '')
      .replace(/^\s*Click here\s*$/gim, '')
      .replace(/^\s*انقر.+$/gim, '')
  }
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

export function MessageBubble({ message }: Props) {
  const { dict, locale } = useLocale()
  const navigate = useNavigate()
  const { setOpenedByLayla, setLastRecommendations, setPicks } = useNav()

  if (message.role === 'system') {
    return (
      <div className="rounded-xl border border-[var(--red)]/20 bg-[#fff5f7] px-3 py-2 text-[12.5px] text-[var(--red)]">
        {message.content}
      </div>
    )
  }

  if (message.role === 'user') {
    return (
      <div className="ms-10 self-end rounded-[18px_18px_4px_18px] bg-gradient-to-br from-[#2c6ba4] to-[#3d86c9] px-3.5 py-2.5 text-[13px] leading-snug text-white shadow-[0_4px_12px_rgba(44,107,164,0.28)]">
        {message.content}
      </div>
    )
  }

  const { blocks } = parseAssistantContent(message.content, message.products ?? [])
  const cards = getMessageProducts(message).map((product) => ({
    ...product,
    name: humanizeProductName(product.name, product.url),
  }))
  const fallbackText = cleanAssistantText(message.content, cards.length > 0)
  // When product cards are present, prefer cleaned prose over raw Brand/Price/URL field dumps.
  const textBlocks =
    cards.length > 0
      ? []
      : blocks.filter((block) => block.type !== 'product')
  const displayText =
    cards.length > 0
      ? fallbackText.slice(0, 420) ||
        (cards.length === 1
          ? `I found ${cards[0].name} for you — tap the card to open it.`
          : `Here are ${cards.length} picks for you — tap a card to open.`)
      : fallbackText

  const openProduct = (url: string) => {
    const id = productIdFromUrl(url)
    setLastRecommendations(cards)
    setPicks(cards.map((c) => c.url))
    setOpenedByLayla(true, dict.opened)
    navigate(`/p/${id}`)
  }

  return (
    <div className="me-4 flex max-w-[96%] gap-2 self-start">
      <img
        src="/layla.jpg"
        alt=""
        className="mt-0.5 size-8 shrink-0 rounded-full object-cover object-[50%_30%] ring-2 ring-white shadow-sm"
      />
      <div className="min-w-0 flex-1 space-y-2">
        {message.fallback && (
          <p role="status" className="text-[10px] font-medium text-[var(--muted)]">
            {locale === 'ar'
              ? 'إجابة تجريبية محلية — خدمة المساعد المباشرة غير متاحة.'
              : 'Local demo guidance — the live assistant is unavailable.'}
          </p>
        )}
        <div className="rounded-[4px_16px_16px_16px] border border-[#e6edf4] bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--ink)] shadow-[0_2px_10px_rgba(20,56,92,0.06)]">
          {textBlocks.length === 0 ? (
            displayText ? <p className="whitespace-pre-wrap">{displayText}</p> : null
          ) : (
            textBlocks.map((block, i) => {
              if (block.type === 'heading') {
                return (
                  <div key={i} className="mb-1 mt-1 text-[13px] font-extrabold text-[var(--navy2)]">
                    {block.text}
                  </div>
                )
              }
              if (block.type === 'list') {
                const Tag = block.ordered ? 'ol' : 'ul'
                return (
                  <Tag key={i} className="my-1 list-inside space-y-0.5 ps-1">
                    {block.items.map((item, j) => (
                      <li key={j}>
                        {item.map((seg, k) =>
                          seg.type === 'bold' ? (
                            <strong key={k}>{seg.value}</strong>
                          ) : seg.type === 'link' ? (
                            <span key={k} className="font-semibold text-[var(--blue)]">
                              {seg.label}
                            </span>
                          ) : (
                            <span key={k}>{seg.value}</span>
                          ),
                        )}
                      </li>
                    ))}
                  </Tag>
                )
              }
              return (
                <p key={i} className="mb-1 last:mb-0">
                  {block.segments.map((seg, k) =>
                    seg.type === 'bold' ? (
                      <strong key={k}>{seg.value}</strong>
                    ) : seg.type === 'link' ? (
                      <span key={k} className="font-semibold text-[var(--blue)]">
                        {seg.label}
                      </span>
                    ) : (
                      <span key={k}>{seg.value}</span>
                    ),
                  )}
                </p>
              )
            })
          )}
        </div>
        {cards.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cards.map((product) => (
              <div key={product.url} className="w-[158px] shrink-0">
                <ProductCard
                  product={{
                    id: productIdFromUrl(product.url),
                    url: product.url,
                    name: product.name,
                    imageUrl: product.imageUrl,
                    price: product.price,
                    rating: product.rating,
                    ratingCount: product.ratingCount,
                    aiPick: true,
                  }}
                  compact
                  onOpen={() => openProduct(product.url)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
