import { useLocation } from 'react-router-dom'
import { ProductCard } from '../components/products/ProductCard'
import {
  parseAssistantContent,
  type TextSegment,
} from '../lib/formatAssistantMessage'
import { uniqueNahdiProducts } from '../lib/chatProducts'
import { productIdFromUrl } from '../lib/productUrl'
import { useCart } from '../state/CartContext'
import { useLocale } from '../state/LocaleContext'
import { useNav } from '../state/NavContext'
import type { RoutineLocationState } from '../types/routine'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeRoutineAnswer(answer: string, products: ReturnType<typeof uniqueNahdiProducts>): string {
  let normalized = answer
    .replace(
      /(^|\s)(morning(?:\s+routine)?|a\.?m\.?)\s*:\s*/gi,
      '\n\n## Morning Routine\n',
    )
    .replace(
      /(^|\s)(evening(?:\s+routine)?|night(?:\s+routine)?|p\.?m\.?)\s*:\s*/gi,
      '\n\n## Evening Routine\n',
    )
    .replace(
      /(^|\n)\s*(morning(?:\s+routine)?|a\.?m\.?)\s*:?\s*(?=\n|$)/gi,
      '\n## Morning Routine\n',
    )
    .replace(
      /(^|\n)\s*(evening(?:\s+routine)?|night(?:\s+routine)?|p\.?m\.?)\s*:?\s*(?=\n|$)/gi,
      '\n## Evening Routine\n',
    )

  for (const product of [...products].sort((a, b) => b.name.length - a.name.length)) {
    const productName = new RegExp(
      `(^|\\s)(${escapeRegExp(product.name)})(?=$|[\\s,.:;!?()–—-])`,
      'gim',
    )
    normalized = normalized.replace(
      productName,
      (_match, prefix: string, name: string) => `${prefix.trimEnd()}\n- ${name}`,
    )
  }

  return normalized.replace(/\n{3,}/g, '\n\n').trim()
}

function textFromSegments(segments: TextSegment[]): string {
  return segments
    .map((segment) => (segment.type === 'link' ? segment.label : segment.value))
    .join('')
}

export function RoutinePage() {
  const { dict } = useLocale()
  const { addItem } = useCart()
  const { lastRoutineProducts, lastRoutineAnswer } = useNav()
  const location = useLocation()
  const routinePlan = (location.state as RoutineLocationState | null)?.liveDemoRoutine
  const products = uniqueNahdiProducts(lastRoutineProducts)
  const routineAnswerBlocks = lastRoutineAnswer
    ? parseAssistantContent(normalizeRoutineAnswer(lastRoutineAnswer, products)).blocks
    : []

  const addAll = () => {
    for (const product of products) {
      addItem({
        id: productIdFromUrl(product.url),
        url: product.url,
        name: product.name,
        imageUrl: product.imageUrl,
        price: product.price,
      })
    }
  }

  return (
    <div className="page-wrap py-6">
      <div className="rounded-[24px] bg-gradient-to-br from-[var(--navy2)] to-[var(--blue)] px-6 py-8 text-white sm:px-9">
        <h1 className="text-[28px] font-black">{dict.rtH}</h1>
        <p className="mt-2 text-[14px] text-white/85">
          {routinePlan ? dict.routinePlanIntro : dict.rtP}
        </p>
        <button
          type="button"
          onClick={addAll}
          disabled={!products.length}
          className="mt-5 rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {dict.addAll}
        </button>
      </div>

      <section className="mt-8">
        {routinePlan ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              { title: dict.am, steps: routinePlan.morning },
              { title: dict.pm, steps: routinePlan.evening },
            ].map((routine) => (
              <section key={routine.title} className="rounded-2xl border border-[var(--line)] bg-white p-5">
                <h2 className="mb-4 text-[18px] font-extrabold text-[var(--navy2)]">{routine.title}</h2>
                <ol className="space-y-4">
                  {routine.steps.map((step, index) => (
                    <li key={`${routine.title}-${step.title}`} className="rounded-xl bg-[var(--bg)] p-4">
                      <div className="flex items-start gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--blue)] text-[12px] font-bold text-white">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="text-[14px] font-bold text-[var(--ink)]">{step.title}</h3>
                          <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{step.description}</p>
                        </div>
                      </div>
                      {step.product && (
                        <div className="mt-3 max-w-[240px]">
                          <ProductCard
                            product={{
                              id: productIdFromUrl(step.product.url),
                              url: step.product.url,
                              name: step.product.name,
                              imageUrl: step.product.imageUrl,
                              price: step.product.price,
                              rating: step.product.rating,
                              ratingCount: step.product.ratingCount,
                              aiPick: true,
                            }}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        ) : (
          <>
            {routineAnswerBlocks.length > 0 && (
              <div className="mb-6 space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5 text-[14px] leading-relaxed text-[var(--ink)]">
                {routineAnswerBlocks.map((block, index) => {
                  if (block.type === 'heading') {
                    return (
                      <h3 key={index} className="pt-2 text-[16px] font-extrabold text-[var(--navy2)] first:pt-0">
                        {block.text}
                      </h3>
                    )
                  }
                  if (block.type === 'list') {
                    const List = block.ordered ? 'ol' : 'ul'
                    return (
                      <List key={index} className="list-inside list-decimal space-y-2 ps-1">
                        {block.items.map((item, itemIndex) => (
                          <li key={itemIndex}>{textFromSegments(item)}</li>
                        ))}
                      </List>
                    )
                  }
                  if (block.type === 'paragraph') {
                    return <p key={index}>{textFromSegments(block.segments)}</p>
                  }
                  return (
                    <p key={index} className="font-semibold">
                      {block.name}
                    </p>
                  )
                })}
              </div>
            )}
            <h2 className="mb-3 text-[18px] font-extrabold text-[var(--navy2)]">{dict.rtProducts}</h2>
            {products.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((item) => (
                  <ProductCard
                    key={item.url}
                    product={{
                      id: productIdFromUrl(item.url),
                      url: item.url,
                      name: item.name,
                      imageUrl: item.imageUrl,
                      price: item.price,
                      rating: item.rating,
                      ratingCount: item.ratingCount,
                      aiPick: true,
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-[var(--line)] bg-white p-4 text-[13px] text-[var(--muted)]">
                {dict.noRoutineProducts}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}
