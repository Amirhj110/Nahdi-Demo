import type { SkinConcern as CatalogConcern } from '../data/catalog'
import type { SkinConcernId } from '../types/skinAnalysis'

const catalogConcernByScanConcern: Partial<Record<SkinConcernId, CatalogConcern>> = {
  dryness: 'dry',
  oiliness: 'oily',
  blackheads: 'oily',
  acne: 'oily',
  redness: 'sensitive',
  dark_spots: 'spots',
}

export function catalogConcernsForScan(
  concerns: readonly { id: SkinConcernId }[],
): CatalogConcern[] {
  return [
    ...new Set(
      concerns.flatMap((concern) => {
        const catalogConcern = catalogConcernByScanConcern[concern.id]
        return catalogConcern ? [catalogConcern] : []
      }),
    ),
  ]
}
