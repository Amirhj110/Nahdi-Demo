import { ProductCard } from '../components/products/ProductCard'
import { uniqueNahdiProducts } from '../lib/chatProducts'
import { productIdFromUrl } from '../lib/productUrl'
import { useLocale } from '../state/LocaleContext'
import { useNav } from '../state/NavContext'

export function RecommendationsPage() {
  const { dict } = useLocale()
  const { lastRecommendations } = useNav()
  const products = uniqueNahdiProducts(lastRecommendations)

  return (
    <main className="mx-auto min-h-[65vh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-[var(--navy2)] sm:text-3xl">
          {dict.recommendationsTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          {dict.recommendationsDescription}
        </p>
      </header>
      {products.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.url}
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
              onOpen={(card) => window.open(card.url, '_blank', 'noopener,noreferrer')}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)]">
          {dict.recommendationsEmpty}
        </p>
      )}
    </main>
  )
}
