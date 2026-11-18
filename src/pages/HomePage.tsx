import { productsForConcern } from '../data/catalog'
import { BannerCarousel } from '../components/storefront/BannerCarousel'
import { BrandsRow } from '../components/storefront/BrandsRow'
import { CategoryCircles } from '../components/storefront/CategoryCircles'
import { ConcernsGrid } from '../components/storefront/ConcernsGrid'
import { DealOfTheDay } from '../components/storefront/DealOfTheDay'
import { IngredientsGrid } from '../components/storefront/IngredientsGrid'
import { MeetLaylaBand } from '../components/storefront/MeetLaylaBand'
import { ProductRail } from '../components/storefront/ProductRail'
import { PromoTiles } from '../components/storefront/PromoTiles'
import { ServicesRow } from '../components/storefront/ServicesRow'
import { useLocale } from '../state/LocaleContext'

export function HomePage() {
  const { dict } = useLocale()

  return (
    <div className="pb-10">
      <BannerCarousel />
      <CategoryCircles />
      <PromoTiles />
      <DealOfTheDay />
      <MeetLaylaBand />
      <ConcernsGrid />
      <ProductRail
        title={dict.bestH}
        products={productsForConcern('sensitive').concat(productsForConcern('dry')).slice(0, 8)}
        href="/c/sensitive"
      />
      <IngredientsGrid />
      <BrandsRow />
      <ServicesRow />
    </div>
  )
}
