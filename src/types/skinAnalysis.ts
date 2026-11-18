export type Confidence = 'low' | 'medium' | 'high'

export const SKIN_CONCERN_IDS = [
  'dryness',
  'oiliness',
  'blackheads',
  'acne',
  'redness',
  'dark_spots',
  'texture',
  'pores',
] as const

export type SkinConcernId = (typeof SKIN_CONCERN_IDS)[number]

export type SkinConcern = {
  id: SkinConcernId
  confidence: Exclude<Confidence, 'low'>
}

export type SkinAnalysis = {
  concerns: SkinConcern[]
}
